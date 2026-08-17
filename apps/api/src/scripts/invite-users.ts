/**
 * Creates users in the target database and sends invite SMS with the production sign-in URL.
 *
 * Usage:
 *   pnpm exec tsx src/scripts/invite-users.ts --only 0534500705
 *   pnpm exec tsx src/scripts/invite-users.ts --all
 *   pnpm exec tsx src/scripts/invite-users.ts --only 0534500705 --resend
 *
 * The SMS always uses INVITE_APP_PUBLIC_URL (default: the Vercel app), not APP_PUBLIC_URL
 * from .env, so localhost never appears in the message.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient, type UserRole } from "../generated/prisma/client";

const DEFAULT_INVITE_APP_URL = "https://nestle-vendor-onboarding.vercel.app";
const MNOTIFY_V2_QUICK_SMS_URL = "https://api.mnotify.com/api/sms/quick";
const GREATER_ACCRA_SLUG = "greater-accra";

type Invitee = {
  fullName: string;
  phone: string;
  role: UserRole;
  regionSlug: string;
};

const TEST_INVITEE: Invitee = {
  fullName: "John Doe",
  phone: "0534500705",
  role: "supervisor",
  regionSlug: GREATER_ACCRA_SLUG
};

const FIELD_STAFF: Invitee[] = [
  { fullName: "Prosper Komla", phone: "0559969656", role: "supervisor", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Bismarck", phone: "0554441582", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Jennifer Efua Hagan", phone: "0279629629", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Agnes Ama Moses", phone: "0244879614", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Emmanuel Nyamekye", phone: "0501377205", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Samuel McArthur", phone: "0553972202", role: "supervisor", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Joseph Teye Djagbley", phone: "0243672495", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Mark", phone: "0200736856", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Irene", phone: "0249694006", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "George", phone: "0265575538", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Emily", phone: "0249566131", role: "promoter", regionSlug: GREATER_ACCRA_SLUG },
  { fullName: "Deborah", phone: "0505959155", role: "promoter", regionSlug: GREATER_ACCRA_SLUG }
];

const ALL_INVITEES: Invitee[] = [TEST_INVITEE, ...FIELD_STAFF];

const normalizePhone = (raw: string): string => {
  const compact = raw.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d{8,17}$/.test(compact)) {
    throw new Error(`Invalid phone: ${raw}`);
  }
  return compact;
};

const makeUniqueCode = (role: UserRole): string => {
  const prefix =
    role === "promoter" ? "P" : role === "client" ? "C" : role === "supervisor" ? "S" : "A";
  return `${prefix}-${randomUUID().slice(0, 8)}`;
};

const inviteAppUrl = (): string => {
  const raw = process.env["INVITE_APP_PUBLIC_URL"]?.trim() || DEFAULT_INVITE_APP_URL;
  return raw.replace(/\/$/, "");
};

const toMsisdn = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `233${digits.slice(1)}`;
  }
  return digits;
};

const buildInviteSms = (params: {
  fullName: string;
  phone: string;
  uniqueCode: string;
  role: string;
  signInUrl: string;
}): string => {
  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);
  return [
    `Hi ${params.fullName}, your Nestlé Ghana account is ready (${roleLabel}).`,
    `Sign in: ${params.signInUrl}`,
    `Phone: ${params.phone}`,
    `Access code: ${params.uniqueCode}`,
    "If you did not expect this, ignore this SMS."
  ].join("\r\n");
};

const sendInviteSms = async (params: {
  phone: string;
  fullName: string;
  uniqueCode: string;
  role: string;
}): Promise<void> => {
  const apiKey = process.env["MNOTIFY_SMS_API_KEY"]?.trim() ?? "";
  if (apiKey.length === 0) {
    throw new Error("MNOTIFY_SMS_API_KEY is not set");
  }
  const senderId = (process.env["MNOTIFY_SENDER_ID"]?.trim() || "Engaged").slice(0, 11);
  const signInUrl = `${inviteAppUrl()}/auth/sign-in`;
  const message = buildInviteSms({ ...params, signInUrl });

  const url = new URL(MNOTIFY_V2_QUICK_SMS_URL);
  url.searchParams.set("key", apiKey);
  const form = new URLSearchParams();
  form.append("recipient[0]", toMsisdn(params.phone));
  form.append("sender", senderId);
  form.append("message", message);
  form.append("is_schedule", "false");
  form.append("schedule_date", "");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: form.toString()
  });
  const rawText = await response.text();
  let json: { status?: string; message?: string } = {};
  try {
    json = rawText.length > 0 ? (JSON.parse(rawText) as { status?: string; message?: string }) : {};
  } catch {
    throw new Error(`SMS provider returned non-JSON (HTTP ${String(response.status)})`);
  }
  if (!response.ok || json.status !== "success") {
    throw new Error(json.message ?? `SMS failed (HTTP ${String(response.status)})`);
  }
};

const parseArgs = (
  argv: string[]
): { onlyPhone: string | null; sendAll: boolean; resend: boolean } => {
  const sendAll = argv.includes("--all");
  const resend = argv.includes("--resend");
  const onlyIndex = argv.indexOf("--only");
  const onlyPhone =
    onlyIndex >= 0 && argv[onlyIndex + 1] !== undefined ? normalizePhone(argv[onlyIndex + 1]) : null;
  if (sendAll && onlyPhone !== null) {
    throw new Error("Use either --only <phone> or --all, not both");
  }
  if (!sendAll && onlyPhone === null) {
    throw new Error(
      "Usage: pnpm exec tsx src/scripts/invite-users.ts --only 0534500705\n" +
        "       pnpm exec tsx src/scripts/invite-users.ts --all"
    );
  }
  return { onlyPhone, sendAll, resend };
};

const assertRemoteDatabase = (connectionString: string): void => {
  const allowLocal = process.env["ALLOW_LOCAL_INVITES"] === "1";
  if (allowLocal) {
    return;
  }
  let host = "";
  try {
    host = new URL(connectionString.replace(/^postgres(ql)?:/, "http:")).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  if (host === "localhost" || host === "127.0.0.1") {
    throw new Error(
      "Refusing to invite against a local database. Point DATABASE_URL at production, or set ALLOW_LOCAL_INVITES=1."
    );
  }
};

const main = async (): Promise<void> => {
  const { onlyPhone, sendAll, resend } = parseArgs(process.argv.slice(2));
  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined || connectionString.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }
  assertRemoteDatabase(connectionString);

  const selected = sendAll
    ? ALL_INVITEES
    : ALL_INVITEES.filter((row) => normalizePhone(row.phone) === onlyPhone);
  if (selected.length === 0) {
    throw new Error(`No invitee matches phone ${onlyPhone ?? ""}`);
  }

  const signInUrl = `${inviteAppUrl()}/auth/sign-in`;
  console.log(`Sign-in URL in SMS: ${signInUrl}`);
  console.log(`Inviting ${String(selected.length)} person(s)\n`);

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    for (const invitee of selected) {
      const phone = normalizePhone(invitee.phone);
      const region = await prisma.region.findUnique({
        where: { slug: invitee.regionSlug },
        select: { id: true, name: true }
      });
      if (region === null) {
        throw new Error(`Region not found: ${invitee.regionSlug}. Run seed-regions.ts first.`);
      }

      const existing = await prisma.user.findUnique({
        where: { phone },
        select: {
          id: true,
          fullName: true,
          phone: true,
          role: true,
          uniqueCode: true,
          regionId: true
        }
      });

      if (existing !== null && !resend) {
        console.log(
          `SKIP  ${existing.fullName}  ${existing.phone}  already exists (role=${existing.role}). Pass --resend to text again.`
        );
        continue;
      }

      let uniqueCode: string;
      let userId: string;
      let createdNow = false;

      if (existing !== null) {
        uniqueCode = existing.uniqueCode;
        userId = existing.id;
        if (existing.regionId !== region.id) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { regionId: region.id }
          });
        }
      } else {
        uniqueCode = makeUniqueCode(invitee.role);
        const created = await prisma.user.create({
          data: {
            fullName: invitee.fullName,
            phone,
            role: invitee.role,
            uniqueCode,
            authProvider: "credentials",
            isActive: true,
            regionId: region.id
          },
          select: { id: true }
        });
        userId = created.id;
        createdNow = true;
      }

      try {
        await sendInviteSms({
          phone,
          fullName: invitee.fullName,
          uniqueCode,
          role: invitee.role
        });
      } catch (err: unknown) {
        if (createdNow) {
          await prisma.user.delete({ where: { id: userId } });
          console.error(`ROLLED BACK ${invitee.fullName} (${phone}) after SMS failure`);
        }
        throw err;
      }

      console.log(
        `SENT  ${invitee.fullName.padEnd(24)} ${phone}  ${invitee.role.padEnd(11)} ${region.name}  code=${uniqueCode}`
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
