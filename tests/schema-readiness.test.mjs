import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";

let readiness, appPool, db, sql;

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Readiness checks require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  readiness = await import("../src/db/schema-readiness.ts");
  ({ db, pool: appPool } = await import("../src/db/index.ts"));
  ({ sql } = await import("drizzle-orm"));
});

test("a missing table or column switches a feature off instead of failing the page", async () => {
  assert.equal(await readiness.whenSchemaReady("Fixture", () => db.execute(sql`select * from definitely_missing_feature_table`), "fallback"), "fallback");
  assert.equal(await readiness.whenSchemaReady("Fixture", () => db.execute(sql`select definitely_missing_column from profiles limit 1`), "fallback"), "fallback");
  await assert.rejects(readiness.whenSchemaReady("Fixture", () => db.execute(sql`select 1 / 0`), "fallback"), "Other database errors are never hidden.");
  assert.equal(readiness.isPendingMigrationError({ message: "wrapped", cause: { code: "42P01" } }), true, "Errors wrapped by Drizzle are recognised.");
  assert.equal(readiness.isPendingMigrationError(new Error("plain")), false);
});

test("the readiness report names each optional feature and any missing table", async () => {
  const report = await readiness.getSchemaReadiness();
  assert.deepEqual(report.map((item) => item.feature).sort(), ["Announcements", "Purpose Profile and Journey"]);
  for (const item of report) assert.equal(item.ready, item.missing.length === 0);
});

after(async () => {
  if (appPool) await appPool.end();
});
