import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Inject,
  Query,
  Res,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { sendBinaryFile, type BinaryFileResponse } from "../../common/http/send-binary-file";
import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildNestleOverviewPdf,
  type NestleOverviewPayload
} from "./nestle-export.util";

const VIEWER_ROLES = new Set<UserRole>(["admin", "supervisor", "client"]);

@Controller("admin/nestle")
@ApiTags("Admin Nestlé dashboard")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class NestleDashboardController {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private assertViewer(user: AuthenticatedUser): void {
    if (!VIEWER_ROLES.has(user.role)) {
      throw new ForbiddenException("Only supervisor, admin, or client");
    }
  }

  private async buildOverview(params: {
    from?: string;
    to?: string;
    regionId?: string;
    userId?: string;
  }): Promise<NestleOverviewPayload> {
    const fromDate = params.from !== undefined ? new Date(params.from) : undefined;
    const toDate = params.to !== undefined ? new Date(params.to) : undefined;
    const visitWhere = {
      ...(fromDate !== undefined || toDate !== undefined
        ? {
            checkedInAt: {
              ...(fromDate !== undefined ? { gte: fromDate } : {}),
              ...(toDate !== undefined ? { lte: toDate } : {})
            }
          }
        : {}),
      ...(params.regionId !== undefined && params.regionId.trim().length > 0
        ? { outlet: { regionId: params.regionId.trim() } }
        : {}),
      ...(params.userId !== undefined && params.userId.trim().length > 0
        ? { userId: params.userId.trim() }
        : {})
    };
    const vendorWhere = {
      ...(params.regionId !== undefined && params.regionId.trim().length > 0
        ? { regionId: params.regionId.trim() }
        : {}),
      ...(fromDate !== undefined || toDate !== undefined
        ? {
            createdAt: {
              ...(fromDate !== undefined ? { gte: fromDate } : {}),
              ...(toDate !== undefined ? { lte: toDate } : {})
            }
          }
        : {})
    };

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      vendorsOnboarded,
      activePromoters,
      dailyVisits,
      completedQuestionnaires,
      visibilityAgg,
      competitorReports,
      footfallAgg,
      incompleteVisits,
      unreadAlerts,
      regional
    ] = await Promise.all([
      this.prisma.outlet.count({ where: { isActive: true, ...vendorWhere } }),
      this.prisma.user.count({ where: { role: "promoter", isActive: true } }),
      this.prisma.outletVisit.count({
        where: { checkedInAt: { gte: startOfToday }, ...visitWhere }
      }),
      this.prisma.questionnaireResponse.count({
        where: {
          ...(fromDate !== undefined || toDate !== undefined
            ? {
                submittedAt: {
                  ...(fromDate !== undefined ? { gte: fromDate } : {}),
                  ...(toDate !== undefined ? { lte: toDate } : {})
                }
              }
            : {})
        }
      }),
      this.prisma.outletVisit.aggregate({
        where: { ...visitWhere, visibilityScore: { not: null } },
        _avg: { visibilityScore: true }
      }),
      this.prisma.competitorObservation.count({
        where: {
          visit: visitWhere
        }
      }),
      this.prisma.outletVisit.aggregate({
        where: { ...visitWhere, footfallEstimated: { not: null } },
        _avg: { footfallEstimated: true },
        _sum: { footfallEstimated: true, footfallManualCount: true }
      }),
      this.prisma.outletVisit.count({ where: { ...visitWhere, isComplete: false } }),
      this.prisma.opsAlert.count({ where: { isRead: false } }),
      this.prisma.outlet.groupBy({
        by: ["regionId"],
        where: { isActive: true },
        _count: { _all: true }
      })
    ]);

    const regionIds = regional.map((r) => r.regionId).filter((id): id is string => id !== null);
    const regions = await this.prisma.region.findMany({
      where: { id: { in: regionIds } },
      select: { id: true, name: true }
    });
    const regionNameById = new Map(regions.map((r) => [r.id, r.name]));

    return {
      vendorsOnboarded,
      activePromoters,
      dailyVisits,
      completedQuestionnaires,
      visibilityScoreAvg: visibilityAgg._avg.visibilityScore ?? null,
      competitorReports,
      footfall: {
        estimatedAvg: footfallAgg._avg.footfallEstimated ?? null,
        estimatedSum: footfallAgg._sum.footfallEstimated ?? null,
        manualSum: footfallAgg._sum.footfallManualCount ?? null
      },
      incompleteVisits,
      unreadAlerts,
      regionalPerformance: regional.map((r) => ({
        regionId: r.regionId,
        regionName: r.regionId !== null ? (regionNameById.get(r.regionId) ?? "Unknown") : "Unassigned",
        vendorCount: r._count._all
      }))
    };
  }

  @Get("overview")
  @ApiOperation({
    operationId: "AdminNestle_overview",
    summary: "Nestlé real-time overview KPIs"
  })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  public async overview(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("regionId") regionId?: string,
    @Query("userId") userId?: string
  ) {
    this.assertViewer(currentUser);
    return this.buildOverview({
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(regionId !== undefined ? { regionId } : {}),
      ...(userId !== undefined ? { userId } : {})
    });
  }

  @Get("export.pdf")
  @ApiOperation({
    operationId: "AdminNestle_exportPdf",
    summary: "Nestlé programme PDF report pack"
  })
  @ApiProduces("application/pdf")
  public async exportPdf(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res() res: BinaryFileResponse,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("regionId") regionId?: string,
    @Query("userId") userId?: string
  ): Promise<void> {
    this.assertViewer(currentUser);
    const payload = await this.buildOverview({
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(regionId !== undefined ? { regionId } : {}),
      ...(userId !== undefined ? { userId } : {})
    });

    let regionName: string | undefined;
    if (regionId !== undefined && regionId.trim().length > 0) {
      const region = await this.prisma.region.findUnique({
        where: { id: regionId.trim() },
        select: { name: true }
      });
      regionName = region?.name;
    }

    let promoterName: string | undefined;
    if (userId !== undefined && userId.trim().length > 0) {
      const promoter = await this.prisma.user.findUnique({
        where: { id: userId.trim() },
        select: { fullName: true }
      });
      promoterName = promoter?.fullName;
    }

    const buffer = await buildNestleOverviewPdf(payload, {
      ...(from !== undefined ? { from: from.slice(0, 10) } : {}),
      ...(to !== undefined ? { to: to.slice(0, 10) } : {}),
      ...(regionName !== undefined ? { regionName } : {}),
      ...(promoterName !== undefined ? { promoterName } : {})
    });

    const stamp = new Date().toISOString().slice(0, 10);
    sendBinaryFile(res, buffer, "application/pdf", `nestle-programme-report-${stamp}.pdf`);
  }

  @Get("visits-map")
  @ApiOperation({
    operationId: "AdminNestle_visitsMap",
    summary: "Visit map points"
  })
  public async visitsMap(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("regionId") regionId?: string,
    @Query("userId") userId?: string,
    @Query("limit") limit?: string
  ) {
    this.assertViewer(currentUser);
    const take = Math.min(1000, Math.max(1, Number(limit) || 500));
    const fromDate = from !== undefined ? new Date(from) : undefined;
    const toDate = to !== undefined ? new Date(to) : undefined;
    const visits = await this.prisma.outletVisit.findMany({
      where: {
        ...(fromDate !== undefined || toDate !== undefined
          ? {
              checkedInAt: {
                ...(fromDate !== undefined ? { gte: fromDate } : {}),
                ...(toDate !== undefined ? { lte: toDate } : {})
              }
            }
          : {}),
        ...(userId !== undefined && userId.trim().length > 0 ? { userId: userId.trim() } : {}),
        ...(regionId !== undefined && regionId.trim().length > 0
          ? { outlet: { regionId: regionId.trim() } }
          : {})
      },
      orderBy: { checkedInAt: "desc" },
      take,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        checkedInAt: true,
        visibilityScore: true,
        trafficCategory: true,
        isComplete: true,
        outlet: { select: { id: true, name: true, regionId: true, locationArea: true } },
        user: { select: { id: true, fullName: true } }
      }
    });
    return visits;
  }

  @Get("export.csv")
  @ApiOperation({ operationId: "AdminNestle_exportCsv", summary: "CSV export of visits" })
  @ApiProduces("text/csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  public async exportCsv(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res() res: BinaryFileResponse,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("kind") kind?: string,
    @Query("regionId") regionId?: string,
    @Query("userId") userId?: string
  ) {
    this.assertViewer(currentUser);
    const fromDate = from !== undefined ? new Date(from) : undefined;
    const toDate = to !== undefined ? new Date(to) : undefined;
    const exportKind = kind?.trim() || "visits";
    const regionFilter =
      regionId !== undefined && regionId.trim().length > 0 ? regionId.trim() : undefined;
    const userFilter =
      userId !== undefined && userId.trim().length > 0 ? userId.trim() : undefined;

    if (exportKind === "vendors") {
      const vendors = await this.prisma.outlet.findMany({
        where: {
          ...(regionFilter !== undefined ? { regionId: regionFilter } : {}),
          ...(fromDate !== undefined || toDate !== undefined
            ? {
                createdAt: {
                  ...(fromDate !== undefined ? { gte: fromDate } : {}),
                  ...(toDate !== undefined ? { lte: toDate } : {})
                }
              }
            : {})
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: { region: { select: { name: true } } }
      });
      const header =
        "vendorId,id,businessName,vendorName,phone,phoneSecondary,role,gender,ageBracket,employees,avgSalesDayGhs,landmark,region,district,community,vendorType,yearsInBusiness,latitude,longitude,createdAt";
      const rows = vendors.map((v) =>
        [
          csv(v.vendorCode),
          v.id,
          csv(v.name),
          csv(v.contactName),
          csv(v.contactPhone),
          csv(v.contactPhoneSecondary),
          csv(v.vendorRole),
          csv(v.gender),
          csv(v.ageBracket),
          csv(v.employeeCountBracket),
          csv(v.averageDailySalesBracket),
          csv(v.landmark),
          csv(v.region?.name),
          csv(v.district),
          csv(v.locationArea),
          csv(v.category),
          v.yearsInBusiness ?? "",
          v.latitude ?? "",
          v.longitude ?? "",
          v.createdAt.toISOString()
        ].join(",")
      );
      sendBinaryFile(
        res,
        Buffer.from([header, ...rows].join("\n"), "utf8"),
        "text/csv; charset=utf-8",
        "nestle-vendors.csv"
      );
      return;
    }

    const visits = await this.prisma.outletVisit.findMany({
      where: {
        ...(fromDate !== undefined || toDate !== undefined
          ? {
              checkedInAt: {
                ...(fromDate !== undefined ? { gte: fromDate } : {}),
                ...(toDate !== undefined ? { lte: toDate } : {})
              }
            }
          : {}),
        ...(regionFilter !== undefined ? { outlet: { regionId: regionFilter } } : {}),
        ...(userFilter !== undefined ? { userId: userFilter } : {})
      },
      orderBy: { checkedInAt: "desc" },
      take: 5000,
      include: {
        outlet: { select: { name: true, locationArea: true, district: true } },
        user: { select: { fullName: true, phone: true } },
        competitorObservations: true
      }
    });

    if (exportKind === "competitors") {
      const header =
        "visitId,vendor,promoter,brand,brandOther,products,pricing,promotions,discounts,newLaunches,displayQuality,observations,checkedInAt";
      const rows = visits.flatMap((v) =>
        v.competitorObservations.map((c) =>
          [
            v.id,
            csv(v.outlet.name),
            csv(v.user.fullName),
            csv(c.brandName),
            csv(c.brandNameOther),
            csv(c.productsJson),
            csv(c.pricingNotes),
            csv(c.promotionsNotes),
            csv(c.discountsNotes),
            csv(c.newLaunchesNotes),
            csv(c.displayQualityNotes),
            csv(c.marketObservations),
            v.checkedInAt.toISOString()
          ].join(",")
        )
      );
      sendBinaryFile(
        res,
        Buffer.from([header, ...rows].join("\n"), "utf8"),
        "text/csv; charset=utf-8",
        "nestle-competitors.csv"
      );
      return;
    }

    const header =
      "visitId,vendor,community,district,promoter,phone,latitude,longitude,traffic,footfallEstimated,peakPeriods,nestleProducts,visibilityScore,complete,checkedInAt";
    const rows = visits.map((v) =>
      [
        v.id,
        csv(v.outlet.name),
        csv(v.outlet.locationArea),
        csv(v.outlet.district),
        csv(v.user.fullName),
        csv(v.user.phone),
        v.latitude,
        v.longitude,
        v.trafficCategory ?? "",
        v.footfallEstimated ?? "",
        csv(v.footfallPeakPeriods),
        csv(v.nestleProductsJson),
        v.visibilityScore ?? "",
        v.isComplete ? "yes" : "no",
        v.checkedInAt.toISOString()
      ].join(",")
    );
    sendBinaryFile(
      res,
      Buffer.from([header, ...rows].join("\n"), "utf8"),
      "text/csv; charset=utf-8",
      "nestle-visits.csv"
    );
  }
}

const csv = (value: string | null | undefined): string => {
  const raw = value ?? "";
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
};
