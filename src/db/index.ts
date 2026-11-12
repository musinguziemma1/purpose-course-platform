import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "../../scripts/database-config.mjs";

const globalForDb = globalThis as typeof globalThis & {
  __purposeDatabase?: { key: string; pool: Pool };
};

type Database = ReturnType<typeof drizzle>;
let runtime: { pool: Pool; db: Database } | undefined;

function databaseRuntime() {
  if (runtime) return runtime;
  // Next.js imports route modules while collecting build configuration. Validate
  // credentials and create the pool only when an actual database API is used.
  const config = databaseConfig();
  const key = JSON.stringify(config);
  const cached = globalForDb.__purposeDatabase;
  const client = cached?.key === key ? cached.pool : new Pool(config);

  if (process.env.NODE_ENV !== "production") {
    if (cached && cached.pool !== client) void cached.pool.end();
    globalForDb.__purposeDatabase = { key, pool: client };
  }
  runtime = { pool: client, db: drizzle(client) };
  return runtime;
}

function lazyClient<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const client = resolve();
      const value = Reflect.get(client, property, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const pool = lazyClient(() => databaseRuntime().pool);
export const db = lazyClient(() => databaseRuntime().db);
