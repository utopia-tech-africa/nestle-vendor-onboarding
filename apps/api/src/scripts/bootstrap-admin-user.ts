/**
 * Creates an admin user without sending invite SMS (for empty DB bootstrap).
 * Usage: pnpm exec tsx src/scripts/bootstrap-admin-user.ts "Full Name" "0201234567"
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client";

const normalizePhone = (raw: string): string => {
  const compact = raw.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d{8,17}$/.test(compact)) {
    throw new Error(`Invalid phone: ${raw}`);
  }
  return compact;
};

const main = async (): Promise<void> => {
  const fullName = process.argv[2]?.trim();
  const phoneRaw = process.argv[3]?.trim();

  if (fullName === undefined || fullName.length < 2 || phoneRaw === undefined) {
    console.error(
      'Usage: pnpm exec tsx src/scripts/bootstrap-admin-user.ts "Full Name" "0201234567"'
    );
    process.exit(1);
  }

  const phone = normalizePhone(phoneRaw);
  const uniqueCode = `A-${randomUUID().slice(0, 8)}`;

  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined || connectionString.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing !== null) {
      console.error(
        `Phone already registered: ${phone} (${existing.fullName}, role=${existing.role})`
      );
      console.error(`Existing access code: ${existing.uniqueCode}`);
      process.exit(1);
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        phone,
        role: "admin",
        uniqueCode,
        email: null,
        authProvider: "credentials",
        isActive: true
      },
      select: { id: true, fullName: true, phone: true, role: true, uniqueCode: true }
    });

    console.log("Admin account created:");
    console.log(JSON.stringify(user, null, 2));
    console.log("\nSign in with:");
    console.log(`  Phone:       ${user.phone}`);
    console.log(`  Access code: ${user.uniqueCode}`);
    console.log(`  Role:        admin`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
