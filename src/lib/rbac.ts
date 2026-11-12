import type { SessionUser } from "@/lib/auth";

export const PERMISSIONS = {
  "org.manage": "Manage the organisation, billing and platform settings",
  "people.manage": "Invite people and assign roles",
  "people.view": "See the people directory",
  "audience.view": "View newsletter subscribers and the audience waitlist",
  "contact.manage": "Read and respond to website enquiries",
  "content.write": "Draft and edit articles",
  "content.review": "Review, approve and publish articles",
  "content.publish": "Publish scheduled content",
  "academy.author": "Create levels, courses, modules and lessons",
  "academy.assess": "Author and inspect assessments",
  "academy.oversee": "Oversee the whole academy",
  "cohort.manage": "Create cohorts and assign facilitators",
  "mentorship.coach": "Mentor learners, set goals and record notes",
  "mentorship.view": "View learner progress and flags",
  "community.moderate": "Moderate communities, reports and reactions",
  "community.post": "Post and reply in communities",
  "learning.access": "Access enrolled courses and lessons",
  "learning.submit": "Submit assignments, reflections and assessments",
  "instrument.take": "Take Purpose Course assessments",
  "instrument.review": "Review assessment results across learners",
  "notifications.manage": "Administer notification templates and outbox",
  "analytics.view": "View platform and cohort analytics",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export type RoleDefinition = {
  slug: string;
  name: string;
  level: number;
  scope: "platform" | "organisation" | "learning";
  blurb: string;
  workspace: string;
  permissions: Permission[];
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    slug: "super_admin",
    name: "Super Admin",
    level: 100,
    scope: "platform",
    blurb: "Owns the platform across every organisation. Break-glass access, full audit visibility.",
    workspace: "/admin",
    permissions: Object.keys(PERMISSIONS) as Permission[],
  },
  {
    slug: "platform_admin",
    name: "Platform Admin",
    level: 90,
    scope: "platform",
    blurb: "Runs the platform day to day: people, academy, cohorts and settings.",
    workspace: "/admin",
    permissions: [
      "org.manage", "people.manage", "people.view", "audience.view", "contact.manage", "content.review", "content.publish", "academy.author",
      "academy.assess", "academy.oversee", "cohort.manage", "mentorship.view", "community.moderate",
      "notifications.manage", "analytics.view",
    ],
  },
  {
    slug: "program_manager",
    name: "Program Manager",
    level: 80,
    scope: "organisation",
    blurb: "Owns cohorts, facilitators and learner outcomes for a programme.",
    workspace: "/admin/academy",
    permissions: [
      "people.view", "academy.author", "academy.assess", "academy.oversee", "cohort.manage",
      "mentorship.view", "community.moderate", "analytics.view",
    ],
  },
  {
    slug: "editor",
    name: "Editor",
    level: 70,
    scope: "organisation",
    blurb: "Editorial desk: reviews, approves, schedules and publishes.",
    workspace: "/admin",
    permissions: ["people.view", "audience.view", "content.write", "content.review", "content.publish", "community.moderate"],
  },
  {
    slug: "instructor",
    name: "Instructor",
    level: 60,
    scope: "learning",
    blurb: "Teaches courses, runs live classes and marks attendance.",
    workspace: "/mentor",
    permissions: ["people.view", "academy.author", "academy.assess", "mentorship.coach", "mentorship.view", "community.post", "learning.access"],
  },
  {
    slug: "mentor",
    name: "Mentor",
    level: 50,
    scope: "learning",
    blurb: "Coaches learners, reviews work, sets goals and flags support needs.",
    workspace: "/mentor",
    permissions: ["people.view", "mentorship.coach", "mentorship.view", "instrument.review", "community.post", "learning.access"],
  },
  {
    slug: "moderator",
    name: "Moderator",
    level: 40,
    scope: "organisation",
    blurb: "Keeps communities healthy: reports, reactions and thread moderation.",
    workspace: "/admin/community",
    permissions: ["people.view", "community.moderate", "community.post", "learning.access"],
  },
  {
    slug: "author",
    name: "Author",
    level: 30,
    scope: "organisation",
    blurb: "Writes and submits articles for editorial review.",
    workspace: "/admin/articles",
    permissions: ["content.write", "community.post", "learning.access"],
  },
  {
    slug: "student",
    name: "Student",
    level: 20,
    scope: "learning",
    blurb: "Enrolled learner: courses, assessments, mentorship and communities.",
    workspace: "/learn",
    permissions: ["learning.access", "learning.submit", "instrument.take", "community.post"],
  },
  {
    slug: "guest",
    name: "Guest",
    level: 10,
    scope: "learning",
    blurb: "Read-only access to previews and public community spaces.",
    workspace: "/",
    permissions: [],
  },
];

export const PERMISSION_LIST = Object.entries(PERMISSIONS).map(([key, label]) => ({ key, label }));

export function permissionsForRole(roleSlug: string | null | undefined): Permission[] {
  if (!roleSlug) return [];
  return ROLE_DEFINITIONS.find((role) => role.slug === roleSlug)?.permissions ?? [];
}

const ROLE_LEVEL = Object.fromEntries(ROLE_DEFINITIONS.map((role) => [role.slug, role.level]));
const LEGACY_ALIASES: Record<string, string> = {
  admin: "super_admin",
};

export function normalizeRole(roleSlug: string | null | undefined) {
  if (!roleSlug) return "guest";
  return LEGACY_ALIASES[roleSlug] ?? roleSlug;
}

export function can(user: { roleSlug: string; permissions?: string[] } | null | undefined, permission: Permission) {
  if (!user) return false;
  const role = normalizeRole(user.roleSlug);
  if (role === "super_admin") return true;
  const rolePermissions = permissionsForRole(role);
  if (rolePermissions.includes(permission)) return true;
  return (user.permissions ?? []).includes(permission);
}

export function canAny(user: SessionUser | null, permissions: Permission[]) {
  return permissions.some((permission) => can(user, permission));
}

export function atLeast(user: SessionUser | null, minimumRoleSlug: string) {
  if (!user) return false;
  const level = ROLE_LEVEL[normalizeRole(user.roleSlug)] ?? 0;
  return level >= (ROLE_LEVEL[minimumRoleSlug] ?? 0);
}

export function workspaceForRole(roleSlug: string | null | undefined) {
  const role = normalizeRole(roleSlug);
  if (role === "student" || role === "guest") return "/learn";
  if (role === "mentor" || role === "instructor") return "/mentor";
  return "/admin";
}
