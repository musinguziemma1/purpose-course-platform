import assert from "node:assert/strict";
import { test } from "node:test";
import { pendingMigrations, sqlDigest } from "./migrate-supabase.mjs";
const first = { version: "20261111150611", file: "baseline.sql", sql: "select 1;\n" };
const second = { version: "20261111193018", file: "next.sql", sql: "select 2;\n" };
test("migration planning accepts unchanged history and portable line endings", () => {
  assert.equal(sqlDigest("select 1;\r\n"), sqlDigest(first.sql));
  assert.deepEqual(pendingMigrations([first, second], [{ version: first.version, statements: [first.sql] }]), [second]);
});
test("modified applied migrations and unknown history fail closed", () => {
  assert.throws(() => pendingMigrations([first], [{ version: first.version, statements: ["select 3;"] }]), /modified/);
  assert.throws(() => pendingMigrations([first], [{ version: second.version, statements: [second.sql] }]), /unknown/);
});
test("a migration cannot be inserted behind already applied history", () => {
  assert.throws(() => pendingMigrations([first, second], [{ version: second.version, statements: [second.sql] }]), /out of order/);
});
