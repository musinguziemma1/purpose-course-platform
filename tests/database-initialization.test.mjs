import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

function isolated(source, variables = {}) {
  const env = { ...process.env, NODE_ENV: "production" };
  for (const key of ["DATABASE_URL", "DATABASE_SSL_CA", "DATABASE_POOL_MAX", "PGHOST", "PGDATABASE", "PGUSER", "PGPASSWORD"]) delete env[key];
  Object.assign(env, variables);
  return execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
    cwd: process.cwd(), env, encoding: "utf8", timeout: 15000,
  });
}

test("route dependencies can be imported in a fresh build process without database credentials", () => {
  isolated(`
    import assert from 'node:assert/strict';
    import { db, pool } from './src/db/index.ts';
    await import('./src/db/community-access.ts');
    await import('./src/db/publishing.ts');
    assert.ok(db); assert.ok(pool);
    assert.equal(process.env.DATABASE_URL, undefined);
  `);
});

test("runtime reads and transactions still reject missing database configuration", () => {
  isolated(`
    import assert from 'node:assert/strict';
    import { sql } from 'drizzle-orm';
    import { db } from './src/db/index.ts';
    assert.throws(() => db.execute(sql\`select 1\`), /DATABASE_URL is required/);
    assert.throws(() => db.transaction(async () => {}), /DATABASE_URL is required/);
    const { GET } = await import('./src/app/api/health/route.ts');
    const response = await GET();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { ok: false });
  `);
});

test("deferred initialization still rejects remote connections without the verified CA", () => {
  isolated(`
    import assert from 'node:assert/strict';
    import { pool } from './src/db/index.ts';
    assert.throws(() => pool.query('select 1'), /DATABASE_SSL_CA is required/);
  `, { DATABASE_URL: "postgresql://backend@db.example.invalid/postgres?sslmode=disable" });
});

test("creating a query builder does not open a connection to the configured database", () => {
  assert.equal(isolated(`
    import assert from 'node:assert/strict';
    import { db, pool } from './src/db/index.ts';
    assert.ok(db.select());
    assert.equal(pool.totalCount, 0);
    await pool.end();
    console.log('No database connection opened');
  `, { DATABASE_URL: "postgresql://backend@127.0.0.1:1/unreachable" }).trim(), "No database connection opened");
});
