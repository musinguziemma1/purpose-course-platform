import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, initialPassword, passwordError, verifyPassword } from "./password-security.mjs";

test("generated owner passwords are accepted and their hashes reject a different password", () => {
  const password = initialPassword();
  assert.equal(passwordError(password), null);
  const hash = hashPassword(password);
  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword(initialPassword(), hash), false);
  assert.notEqual(hashPassword(password), hash);
});

test("malformed credential hashes and oversized input fail closed without throwing", () => {
  for (const stored of ["", "scrypt:x:y", "scrypt:" + "f".repeat(32) + ":zz", "other:hash"]) assert.equal(verifyPassword("example", stored), false);
  assert.equal(verifyPassword("x".repeat(129), hashPassword("example")), false);
  assert.ok(passwordError("short"));
  assert.ok(passwordError("x".repeat(129)));
});
