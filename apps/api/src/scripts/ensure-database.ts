/**
 * Creates the DATABASE_URL database if it does not exist.
 * Usage: pnpm exec tsx src/scripts/ensure-database.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

const loadDatabaseUrl = (): string => {
  const fromEnv = process.env["DATABASE_URL"];
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv;
  }
  const envPath = resolve(process.cwd(), ".env");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const match = /^DATABASE_URL\s*=\s*(.*)$/.exec(trimmed);
    if (match === null) {
      continue;
    }
    let value = match[1] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  throw new Error("DATABASE_URL is not set");
};

const main = async (): Promise<void> => {
  const databaseUrl = loadDatabaseUrl();
  const parsed = new URL(databaseUrl);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (dbName.length === 0) {
    throw new Error("DATABASE_URL has no database name");
  }

  parsed.pathname = "/postgres";
  const client = new Client({ connectionString: parsed.toString() });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName.replaceAll('"', "")}"`);
      console.log(`Created database ${dbName}`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }
  } finally {
    await client.end();
  }
};

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
