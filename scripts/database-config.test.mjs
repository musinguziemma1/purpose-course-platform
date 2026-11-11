import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseConfig } from "./database-config.mjs";
import { isDemoEnabled } from "../src/lib/demo.ts";

test("remote connections reject missing certificates and enforce verified TLS despite URI SSL overrides", () => {
  const DATABASE_URL = "postgresql://backend:example@host.pooler.supabase.com:5432/postgres?ssl=false&sslmode=disable&sslrootcert=untrusted.pem";
  assert.throws(() => databaseConfig({ DATABASE_URL }), /DATABASE_SSL_CA/);
  const config = databaseConfig({ DATABASE_URL, DATABASE_SSL_CA: "certificate\\ncontents" });
  assert.deepEqual(config.ssl, { ca: "certificate\ncontents", rejectUnauthorized: true });
  assert.equal(new URL(config.connectionString).searchParams.has("sslmode"), false);
  assert.equal(new URL(config.connectionString).searchParams.has("sslrootcert"), false);
  assert.equal(new URL(config.connectionString).searchParams.has("ssl"), false);
});

test("project-local connections work without a cloud certificate", () => {
  const config = databaseConfig({ DATABASE_URL: "postgresql://local:example@127.0.0.1:54329/local" });
  assert.equal(config.ssl, undefined);
});

test("connection pools reject invalid or excessive sizes", () => {
  for (const max of ["0", "21", "NaN", "2.5"]) {
    assert.throws(() => databaseConfig({ DATABASE_URL: "postgresql://localhost/local", DATABASE_POOL_MAX: max }), /DATABASE_POOL_MAX/);
  }
});

test("demo access is always closed in production, on remote databases, and without explicit opt-in", () => {
  const previous = { ...process.env };
  try {
    for (const [mode, url, flag, expected] of [
      ["production", "postgresql://localhost/local", "true", false],
      ["development", "postgresql://host.pooler.supabase.com/postgres", "true", false],
      ["development", "postgresql://localhost/local", "false", false],
      ["development", "postgresql://localhost/local", "", false],
      ["development", "invalid", "true", false],
      ["development", "postgresql://localhost/local", "true", true],
    ]) {
      process.env.NODE_ENV = mode;
      process.env.DATABASE_URL = url;
      process.env.PURPOSE_DEMO_OPEN = flag;
      assert.equal(isDemoEnabled(), expected);
    }
  } finally {
    for (const key of ["NODE_ENV", "DATABASE_URL", "PURPOSE_DEMO_OPEN"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
