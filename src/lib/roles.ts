import { ROLE_DEFINITIONS } from "@/lib/rbac";

export type RoleSlug =
  | "super_admin"
  | "platform_admin"
  | "program_manager"
  | "editor"
  | "instructor"
  | "mentor"
  | "moderator"
  | "author"
  | "student"
  | "guest";

export const ROLE_CATALOG = ROLE_DEFINITIONS.map((role) => ({
  slug: role.slug as RoleSlug,
  name: role.name,
  level: role.level,
  workspace: role.workspace,
  workspaceLabel:
    role.slug === "student" || role.slug === "guest"
      ? "My learning"
      : role.slug === "mentor" || role.slug === "instructor"
        ? "Mentor desk"
        : role.slug === "author"
          ? "Writing desk"
          : "Admin console",
  blurb: role.blurb,
  permissions: [...role.permissions],
}));

export const ROLE_LEVEL: Record<string, number> = Object.fromEntries(ROLE_CATALOG.map((role) => [role.slug, role.level]));

export const DEMO_PASSWORD = "Purpose2026!";

export const DEMO_ACCOUNTS: {
  email: string;
  password: string;
  role: RoleSlug;
  fullName: string;
  title: string;
  bio: string;
}[] = [
  {
    email: "admin@purposecourse.org",
    password: DEMO_PASSWORD,
    role: "super_admin",
    fullName: "Alex Ssenyondo",
    title: "Founder & Lead Facilitator",
    bio: "Alex founded the School of Purpose and Leadership and oversees the platform, faculty and editorial desk.",
  },
  {
    email: "editor@purposecourse.org",
    password: DEMO_PASSWORD,
    role: "editor",
    fullName: "Grace Namusoke",
    title: "Managing Editor",
    bio: "Grace leads the editorial desk, shaping the Purpose Journal and coaching new writers through their first submissions.",
  },
  {
    email: "author@purposecourse.org",
    password: DEMO_PASSWORD,
    role: "author",
    fullName: "Daniel Okello",
    title: "Writer & Community Host",
    bio: "Daniel writes on identity, work and calling, and hosts the weekly Purpose Lounge conversation.",
  },
  {
    email: "mentor@purposecourse.org",
    password: DEMO_PASSWORD,
    role: "mentor",
    fullName: "Miriam Kaggwa",
    title: "Clarity Coach & Mentor",
    bio: "Miriam walks Intermediate participants through the clarity sessions — gifting, story and the purpose statement.",
  },
  {
    email: "student@purposecourse.org",
    password: DEMO_PASSWORD,
    role: "student",
    fullName: "Joan Kirabo",
    title: "Intermediate participant · Cohort 04",
    bio: "Financial analyst, Cohort 04, working through Purpose Discovery and Clarity with Coach Miriam.",
  },
];

export function homePathForRole(roleSlug: string | null | undefined) {
  switch (roleSlug) {
    case "student":
    case "guest":
      return "/learn";
    case "mentor":
    case "instructor":
      return "/mentor";
    default:
      return "/admin";
  }
}

export function workspaceLabelForRole(roleSlug: string | null | undefined) {
  if (roleSlug === "student" || roleSlug === "guest") return "My learning";
  if (roleSlug === "mentor" || roleSlug === "instructor") return "Mentor desk";
  if (roleSlug === "author") return "Writing desk";
  if (roleSlug === "moderator") return "Community desk";
  if (roleSlug === "super_admin" || roleSlug === "platform_admin") return "Admin console";
  return "Programme desk";
}
