import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "../../scripts/database-config.mjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __purposeDatabase?: { key: string; pool: Pool };
};

const config = databaseConfig();
const key = JSON.stringify(config);
const cached = globalForDb.__purposeDatabase;
export const pool = cached?.key === key ? cached.pool : new Pool(config);

if (process.env.NODE_ENV !== "production") {
  if (cached && cached.pool !== pool) void cached.pool.end();
  globalForDb.__purposeDatabase = { key, pool };
}

export const db = drizzle(pool);
