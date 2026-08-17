/**
 * Upserts Ghana's 16 regions. Safe for production — does not create users.
 * Usage: pnpm exec tsx src/scripts/seed-regions.ts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client";
import { GHANA_REGIONS } from "../modules/region/ghana-regions";

const main = async (): Promise<void> => {
  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined || connectionString.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
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
        select: { slug: true, name: true, code: true }
      });
      console.log(`${region.code.padEnd(4)} ${region.slug} (${region.name})`);
    }
    console.log(`\n${String(GHANA_REGIONS.length)} Ghana regions upserted`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
