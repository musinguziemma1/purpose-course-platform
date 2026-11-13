import { can, type Permission } from "@/lib/rbac";

type Actor = { roleSlug: string; permissions?: string[] } | null | undefined;

const ROUTES: [string, Permission[]][] = [
  ["/admin/media", ["media.access"]],
  ["/admin/admissions", ["people.manage", "cohort.manage"]],
  ["/admin/assignments", ["academy.oversee"]],
  ["/admin/academy/live", ["academy.author", "cohort.manage"]],
  ["/admin/academy/assessments", ["academy.assess"]],
  ["/admin/academy", ["academy.author", "academy.oversee"]],
  ["/admin/articles", ["content.write", "content.review"]],
  ["/admin/reviews", ["content.review"]],
  ["/admin/students", ["audience.view"]],
  ["/admin/contact", ["contact.manage"]],
  ["/admin/people", ["people.manage"]],
  ["/admin/programme", ["cohort.manage"]],
  ["/admin/cohorts", ["cohort.manage"]],
  ["/admin/enrollments", ["cohort.manage"]],
  ["/admin/analytics", ["analytics.view"]],
  ["/admin/notifications", ["notifications.manage"]],
  ["/admin/architecture", ["people.manage"]],
  ["/admin/community", ["community.moderate"]],
  ["/admin/activity", ["people.manage"]],
  ["/admin/settings", ["org.manage"]],
  ["/admin", ["people.manage", "analytics.view"]],
];

export function canAccessAdminPath(actor: Actor, pathname: string) {
  const route = ROUTES.find(([prefix]) => pathname === prefix || (prefix !== "/admin" && pathname.startsWith(`${prefix}/`)));
  return Boolean(route && route[1].some((permission) => can(actor, permission)));
}

export function hasAdminWorkspace(actor: Actor) {
  return ROUTES.some(([path]) => canAccessAdminPath(actor, path));
}

export function canAssignRole(actor: Actor, currentRole: string, nextRole: string) {
  if (!can(actor, "people.manage")) return false;
  if (currentRole === "super_admin" || nextRole === "super_admin") return actor?.roleSlug === "super_admin";
  return true;
}
