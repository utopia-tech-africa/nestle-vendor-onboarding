/**
 * Upserts test users, all Ghana regions, and the Nestlé default questionnaire.
 * Usage: pnpm exec tsx src/scripts/seed-test-users.ts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient, type QuestionType, type UserRole } from "../generated/prisma/client";
import {
  DEFAULT_QUESTIONNAIRE_DESCRIPTION,
  DEFAULT_QUESTIONNAIRE_TITLE,
  buildDefaultQuestionnaireQuestions
} from "../modules/questionnaire/default-questionnaire";

type SeedUser = {
  fullName: string;
  phone: string;
  uniqueCode: string;
  role: UserRole;
  /** Set for supervisor/admin when SEED_ALERT_EMAIL is configured. */
  email?: string | null;
};

/** Ghana's 16 administrative regions (post-2019). */
const GHANA_REGIONS: { slug: string; name: string; code: string }[] = [
  { slug: "ahafo", name: "Ahafo", code: "AH" },
  { slug: "ashanti", name: "Ashanti", code: "AS" },
  { slug: "bono", name: "Bono", code: "BO" },
  { slug: "bono-east", name: "Bono East", code: "BE" },
  { slug: "central", name: "Central", code: "CR" },
  { slug: "eastern", name: "Eastern", code: "ER" },
  { slug: "greater-accra", name: "Greater Accra", code: "GA" },
  { slug: "north-east", name: "North East", code: "NE" },
  { slug: "northern", name: "Northern", code: "NR" },
  { slug: "oti", name: "Oti", code: "OT" },
  { slug: "savannah", name: "Savannah", code: "SV" },
  { slug: "upper-east", name: "Upper East", code: "UE" },
  { slug: "upper-west", name: "Upper West", code: "UW" },
  { slug: "volta", name: "Volta", code: "VR" },
  { slug: "western", name: "Western", code: "WR" },
  { slug: "western-north", name: "Western North", code: "WN" }
];

const SEED_USERS: SeedUser[] = [
  {
    fullName: "Test Promoter",
    phone: "0200000001",
    uniqueCode: "P-test0001",
    role: "promoter"
  },
  {
    fullName: "Test Client",
    phone: "0200000002",
    uniqueCode: "C-test0002",
    role: "client"
  },
  {
    fullName: "Test Supervisor",
    phone: "0200000003",
    uniqueCode: "S-test0003",
    role: "supervisor"
  },
  {
    fullName: "Test Admin",
    phone: "0200000004",
    uniqueCode: "A-test0004",
    role: "admin"
  }
];

const alertEmailRaw = process.env["SEED_ALERT_EMAIL"]?.trim() ?? "";
const seedAlertEmail =
  alertEmailRaw.length > 0 && alertEmailRaw.includes("@") ? alertEmailRaw.toLowerCase() : null;

// Email is unique — seed only the supervisor so staging alert QA has a Resend recipient.
const supervisorSeed = SEED_USERS.find((u) => u.role === "supervisor");
if (supervisorSeed !== undefined && seedAlertEmail !== null) {
  supervisorSeed.email = seedAlertEmail;
}

const defaultQuestionnaireQuestions = (): {
  prompt: string;
  helpText: string | null;
  type: QuestionType;
  required: boolean;
  sortOrder: number;
  optionsJson: string | null;
  isActive: boolean;
}[] =>
  buildDefaultQuestionnaireQuestions().map((question, index) => ({
    prompt: question.prompt,
    helpText: question.helpText?.trim() ?? null,
    type: (question.type ?? "text") as QuestionType,
    required: question.required ?? false,
    sortOrder: question.sortOrder ?? index,
    optionsJson:
      question.options !== undefined && question.options.length > 0
        ? JSON.stringify(question.options)
        : null,
    isActive: true
  }));

const main = async (): Promise<void> => {
  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined || connectionString.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log("Seeding Nestlé supervisor E2E bootstrap…\n");

    let greaterAccraId: string | null = null;
    for (const regionSeed of GHANA_REGIONS) {
      const region = await prisma.region.upsert({
        where: { slug: regionSeed.slug },
        create: {
          slug: regionSeed.slug,
          name: regionSeed.name,
          code: regionSeed.code,
          isActive: true
        },
        update: {
          name: regionSeed.name,
          code: regionSeed.code,
          isActive: true
        },
        select: { id: true, name: true, slug: true }
      });
      if (region.slug === "greater-accra") {
        greaterAccraId = region.id;
      }
      console.log(`region       ${region.slug} (${region.name})`);
    }
    console.log(`regions      ${String(GHANA_REGIONS.length)} Ghana regions upserted\n`);

    if (greaterAccraId === null) {
      throw new Error("Greater Accra region missing after seed");
    }

    for (const seed of SEED_USERS) {
      const user = await prisma.user.upsert({
        where: { phone: seed.phone },
        create: {
          fullName: seed.fullName,
          phone: seed.phone,
          uniqueCode: seed.uniqueCode,
          role: seed.role,
          email: seed.email ?? null,
          authProvider: "credentials",
          isActive: true,
          regionId: seed.role === "promoter" ? greaterAccraId : null
        },
        update: {
          fullName: seed.fullName,
          uniqueCode: seed.uniqueCode,
          role: seed.role,
          authProvider: "credentials",
          isActive: true,
          ...(seed.email !== undefined ? { email: seed.email } : {}),
          ...(seed.role === "promoter" ? { regionId: greaterAccraId } : {})
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          uniqueCode: true,
          role: true,
          email: true,
          isActive: true
        }
      });

      console.log(
        `${user.role.padEnd(12)} ${user.phone}  code=${user.uniqueCode}  email=${user.email ?? "—"}  (${user.fullName})`
      );
    }

    const questions = defaultQuestionnaireQuestions();
    const existingForm = await prisma.questionnaire.findFirst({
      where: { title: DEFAULT_QUESTIONNAIRE_TITLE },
      select: { id: true }
    });
    const form =
      existingForm === null
        ? await prisma.questionnaire.create({
            data: {
              title: DEFAULT_QUESTIONNAIRE_TITLE,
              description: DEFAULT_QUESTIONNAIRE_DESCRIPTION,
              isActive: true,
              questions: { create: questions }
            },
            select: { title: true }
          })
        : await prisma.$transaction(async (tx) => {
            await tx.questionnaireQuestion.deleteMany({
              where: { questionnaireId: existingForm.id }
            });
            return tx.questionnaire.update({
              where: { id: existingForm.id },
              data: {
                description: DEFAULT_QUESTIONNAIRE_DESCRIPTION,
                isActive: true,
                questions: { create: questions }
              },
              select: { title: true }
            });
          });
    console.log(`questionnaire ${form.title} (${String(questions.length)} questions, active)`);

    console.log("\nSign in at /auth/sign-in with phone + access code + matching role.");
    console.log("Supervisor: 0200000003 / S-test0003");
    console.log("Promoter:   0200000001 / P-test0001 (region: Greater Accra)");
    if (seedAlertEmail !== null) {
      console.log(`Alert email: supervisor seeded with ${seedAlertEmail} (SEED_ALERT_EMAIL)`);
    } else {
      console.log(
        "Alert email: set SEED_ALERT_EMAIL (or edit users in Ops) so supervisor/admin receive Resend alerts."
      );
    }
    console.log("Promoters may need device location if a geofence is active.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
