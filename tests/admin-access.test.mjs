import assert from "node:assert/strict";
import { test } from "node:test";
import { canAccessAdminPath, canAssignRole } from "../src/lib/admin-access.ts";
import { can } from "../src/lib/rbac.ts";

const actor = (roleSlug) => ({ roleSlug, permissions: [] });

test("authors can reach their writing workspace but not audience, settings, reviews or learner records", () => {
  assert.equal(canAccessAdminPath(actor("author"), "/admin/articles/new"), true);
  for (const path of ["/admin", "/admin/students", "/admin/academy", "/admin/reviews", "/admin/settings", "/admin/activity", "/admin/people"]) assert.equal(canAccessAdminPath(actor("author"), path), false, path);
});

test("role seniority does not grant unrelated publishing or newsletter privileges", () => {
  assert.equal(canAccessAdminPath(actor("program_manager"), "/admin/academy"), true);
  assert.equal(can(actor("program_manager"), "content.publish"), false);
  assert.equal(canAccessAdminPath(actor("program_manager"), "/admin/reviews"), false);
  assert.equal(canAccessAdminPath(actor("program_manager"), "/admin/students"), false);
  assert.equal(canAccessAdminPath(actor("editor"), "/admin/reviews"), true);
  assert.equal(canAccessAdminPath(actor("editor"), "/admin/students"), true);
  assert.equal(canAccessAdminPath(actor("editor"), "/admin/activity"), false);
});

test("students and unauthenticated users cannot access administrative routes", () => {
  for (const user of [null, actor("student"), actor("mentor"), actor("guest")]) {
    for (const path of ["/admin", "/admin/articles/123", "/admin/academy", "/admin/people"]) assert.equal(canAccessAdminPath(user, path), false);
  }
  assert.equal(canAccessAdminPath(actor("super_admin"), "/admin/unknown"), false);
});

test("instructors can author academy content without gaining editorial or people management privileges", () => {
  assert.equal(canAccessAdminPath(actor("instructor"), "/admin/academy"), true);
  assert.equal(canAccessAdminPath(actor("instructor"), "/admin/academy/assessments/1"), true);
  assert.equal(canAccessAdminPath(actor("instructor"), "/admin/articles/new"), false);
  assert.equal(canAccessAdminPath(actor("instructor"), "/admin/people"), false);
});

test("platform administrators cannot grant or modify Super Admin ownership", () => {
  assert.equal(canAssignRole(actor("platform_admin"), "student", "super_admin"), false);
  assert.equal(canAssignRole(actor("platform_admin"), "super_admin", "student"), false);
  assert.equal(canAssignRole(actor("platform_admin"), "student", "mentor"), true);
  assert.equal(canAssignRole(actor("super_admin"), "student", "super_admin"), true);
  assert.equal(canAssignRole(actor("author"), "student", "mentor"), false);
});
