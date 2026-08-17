import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { EnvironmentVariables } from "../../config/environment";
import type { OpsAlertKind, OpsAlertSeverity } from "../../generated/prisma/client";
import { ResendEmailService } from "../email/resend-email.service";
import { PrismaService } from "../prisma/prisma.service";

const MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

export type CreateOpsAlertInput = {
  kind: OpsAlertKind;
  severity?: OpsAlertSeverity;
  title: string;
  message: string;
  metaJson?: string | null;
};

@Injectable()
export class OpsAlertService {
  private readonly logger = new Logger(OpsAlertService.name);

  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ResendEmailService) private readonly resend: ResendEmailService,
    @Inject(ConfigService) private readonly config: ConfigService<EnvironmentVariables, true>
  ) {}

  private assertManager(user: AuthenticatedUser): void {
    if (!MANAGER_ROLES.has(user.role)) {
      throw new ForbiddenException("Only supervisor or admin can manage alerts");
    }
  }

  public async create(input: CreateOpsAlertInput) {
    const alert = await this.prisma.opsAlert.create({
      data: {
        kind: input.kind,
        severity: input.severity ?? "info",
        title: input.title,
        message: input.message,
        metaJson: input.metaJson ?? null
      }
    });
    void this.emailSupervisors(alert);
    return alert;
  }

  private async emailSupervisors(alert: {
    kind: string;
    severity: string;
    title: string;
    message: string;
  }): Promise<void> {
    try {
      const recipients = await this.prisma.user.findMany({
        where: {
          role: { in: ["supervisor", "admin"] },
          isActive: true,
          email: { not: null }
        },
        select: { email: true }
      });
      const emails = [
        ...new Set(
          recipients
            .map((r) => r.email?.trim())
            .filter((e): e is string => e !== undefined && e.length > 0 && e.includes("@"))
        )
      ];
      if (emails.length === 0) {
        this.logger.warn(
          "Ops alert created but no active supervisor/admin users have an email on file; skipping Resend."
        );
        return;
      }
      const appUrl = this.config.get("APP_PUBLIC_URL", { infer: true }).trim().replace(/\/$/, "");
      const alertsUrl = `${appUrl}/ops/alerts`;
      const subject = `[Nestlé Ghana] ${alert.title}`;
      const text = `${alert.message}\n\nSeverity: ${alert.severity}\nKind: ${alert.kind}\n\nOpen alerts: ${alertsUrl}`;
      const html = `<p>${alert.message}</p><p><strong>Severity:</strong> ${alert.severity}<br/><strong>Kind:</strong> ${alert.kind}</p><p><a href="${alertsUrl}">Open alerts</a></p>`;
      await this.resend.sendOperationalEmail({ to: emails, subject, html, text });
      this.logger.log(`Ops alert emailed to ${String(emails.length)} recipient(s).`);
    } catch (err: unknown) {
      this.logger.warn(
        `Could not email ops alert: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  public listForAdmin(user: AuthenticatedUser, limit = 100) {
    this.assertManager(user);
    return this.prisma.opsAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(200, Math.max(1, limit))
    });
  }

  public async markRead(user: AuthenticatedUser, id: string) {
    this.assertManager(user);
    const existing = await this.prisma.opsAlert.findUnique({ where: { id } });
    if (existing === null) {
      throw new NotFoundException("Alert not found");
    }
    return this.prisma.opsAlert.update({
      where: { id },
      data: { isRead: true }
    });
  }

  public async markAllRead(user: AuthenticatedUser) {
    this.assertManager(user);
    await this.prisma.opsAlert.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
    return { ok: true };
  }

  public async reportSyncFailure(
    user: AuthenticatedUser,
    body: { message?: string; pendingCount?: number }
  ) {
    if (user.role !== "promoter") {
      throw new ForbiddenException("Only promoters can report sync failures");
    }
    if (body.message === undefined && body.pendingCount === undefined) {
      throw new BadRequestException("Provide message or pendingCount");
    }
    return this.create({
      kind: "sync_failure",
      severity: "warning",
      title: "Field sync failure",
      message:
        body.message?.trim() ||
        `Promoter ${user.phone} has ${String(body.pendingCount ?? 0)} pending offline item(s).`,
      metaJson: JSON.stringify({ userId: user.id, pendingCount: body.pendingCount ?? null })
    });
  }

  public notifyNewVendor(meta: {
    outletId: string;
    name: string;
    createdByUserId: string;
  }) {
    return this.create({
      kind: "new_vendor",
      severity: "info",
      title: "New vendor registered",
      message: `${meta.name} was onboarded.`,
      metaJson: JSON.stringify(meta)
    });
  }
}
