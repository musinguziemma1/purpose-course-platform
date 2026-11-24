import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Deploys can reach the server before `npm run db:migrate:supabase apply` has run.
 * Features backed by new tables detect that state and switch themselves off
 * instead of breaking the pages around them.
 */

const PENDING_CODES = new Set(["42P01", "42703"]); // undefined_table, undefined_column
const warned = new Set<string>();

/** True when Postgres reports a missing table or column, including errors wrapped by Drizzle. */
export function isPendingMigrationError(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; current && typeof current === "object" && depth < 5; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && PENDING_CODES.has(code)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** Runs a feature query, returning `fallback` while the feature's migration is pending. */
export async function whenSchemaReady<T>(feature: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isPendingMigrationError(error)) throw error;
    if (!warned.has(feature)) {
      warned.add(feature);
      console.warn(`[schema] ${feature} is unavailable until the pending database migration is applied (npm run db:migrate:supabase apply).`);
    }
    return fallback;
  }
}

export const FEATURE_TABLES = {
  "Purpose Profile and Journey": ["purpose_profiles", "purpose_profile_snapshots", "module_principles", "reflection_principles"],
  Announcements: ["announcements"],
} as const;

/** Which optional features have their tables in this database (for the operations page). */
export async function getSchemaReadiness() {
  const names = Object.values(FEATURE_TABLES).flat();
  const result = await db.execute<{ name: string; present: boolean }>(sql`select name, to_regclass('public.' || name) is not null as present from unnest(${sql.raw(`array[${names.map((name) => `'${name}'`).join(",")}]`)}::text[]) as name`);
  const present = new Set(result.rows.filter((row) => row.present).map((row) => row.name));
  return Object.entries(FEATURE_TABLES).map(([feature, tables]) => ({ feature, ready: tables.every((table) => present.has(table)), missing: tables.filter((table) => !present.has(table)) }));
}
