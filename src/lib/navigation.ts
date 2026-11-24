import { canAccessAdminPath, hasAdminWorkspace } from "@/lib/admin-access";

/**
 * One information architecture for the three signed-in workspaces. Sections
 * group related work so each sidebar reads as a short, scannable outline
 * instead of a flat list of every page.
 */

export type NavIcon =
  | "home" | "compass" | "fingerprint" | "layers" | "book" | "calendar" | "clipboard" | "target" | "gauge"
  | "notebook" | "award" | "user" | "users" | "message" | "bell" | "settings" | "pen" | "image" | "megaphone"
  | "inbox" | "chart" | "activity" | "shield" | "database" | "cart" | "graduation" | "check" | "flag" | "video";

export type NavItem = { href: string; label: string; icon: NavIcon; badge?: number };
export type NavSection = { label: string; items: NavItem[] };
export type WorkspaceLink = { href: string; label: string; hint: string };

type Actor = { roleSlug: string; permissions?: string[] } | null | undefined;

const STAFF_MENTOR_ROLES = new Set(["mentor", "instructor", "program_manager", "platform_admin", "super_admin"]);

export function learnerNavigation(counts: { upcomingLive?: number; openAssignments?: number; coaching?: number } = {}): NavSection[] {
  return [
    {
      label: "Overview",
      items: [
        { href: "/learn", label: "Dashboard", icon: "home" },
        { href: "/learn/journey", label: "Purpose Journey", icon: "compass" },
        { href: "/learn/profile", label: "Purpose Profile", icon: "fingerprint" },
      ],
    },
    {
      label: "Learning",
      items: [
        { href: "/learn/programme", label: "My programme", icon: "layers" },
        { href: "/learn/courses", label: "Courses", icon: "book" },
        { href: "/learn/live", label: "Live sessions", icon: "video", badge: counts.upcomingLive },
        { href: "/learn/assignments", label: "Assignments", icon: "clipboard", badge: counts.openAssignments },
        { href: "/learn/assessments", label: "Quizzes & exams", icon: "check" },
      ],
    },
    {
      label: "Growth",
      items: [
        { href: "/learn/instruments", label: "Purpose assessments", icon: "gauge" },
        { href: "/learn/goals", label: "Goals", icon: "target" },
        { href: "/learn/reflections", label: "Reflections", icon: "notebook" },
        { href: "/learn/certificates", label: "Certificates", icon: "award" },
      ],
    },
    {
      label: "People",
      items: [
        { href: "/learn/mentor", label: "My mentor", icon: "user", badge: counts.coaching },
        { href: "/learn/cohort", label: "My cohort", icon: "users" },
        { href: "/learn/groups", label: "Group work", icon: "users" },
        { href: "/community", label: "Community", icon: "message" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/learn/notifications", label: "Notifications", icon: "bell" },
        { href: "/learn/settings", label: "Profile & settings", icon: "settings" },
      ],
    },
  ];
}

export function mentorNavigation(counts: { requests?: number; submissions?: number } = {}): NavSection[] {
  return [
    { label: "Overview", items: [{ href: "/mentor", label: "Overview", icon: "home" }] },
    {
      label: "Learners",
      items: [
        { href: "/mentor/learners", label: "My learners", icon: "users" },
        { href: "/mentor/attendance", label: "Attendance", icon: "check" },
      ],
    },
    {
      label: "Teaching",
      items: [
        { href: "/mentor/live", label: "Live teaching", icon: "video" },
        { href: "/mentor/sessions", label: "Coaching sessions", icon: "calendar", badge: counts.requests },
        { href: "/mentor/groups", label: "Group work", icon: "users" },
        { href: "/mentor/assignments", label: "Set assignments", icon: "clipboard" },
      ],
    },
    {
      label: "Review",
      items: [
        { href: "/mentor/submissions", label: "Submissions", icon: "inbox", badge: counts.submissions },
        { href: "/mentor/assessments", label: "Assessment scores", icon: "gauge" },
      ],
    },
    {
      label: "Resources",
      items: [
        { href: "/mentor/media", label: "Media library", icon: "image" },
        { href: "/community", label: "Community", icon: "message" },
      ],
    },
    { label: "Account", items: [{ href: "/mentor/settings", label: "Profile & settings", icon: "settings" }] },
  ];
}

export function adminNavigation(actor: Actor, counts: { reviews?: number; admissions?: number; enquiries?: number } = {}): NavSection[] {
  const sections: NavSection[] = [
    {
      label: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "home" },
        { href: "/admin/analytics", label: "Learning analytics", icon: "chart" },
        { href: "/admin/activity", label: "Activity log", icon: "activity" },
      ],
    },
    {
      label: "Publishing",
      items: [
        { href: "/admin/articles", label: "Articles", icon: "pen" },
        { href: "/admin/reviews", label: "Review queue", icon: "check", badge: counts.reviews },
        { href: "/admin/announcements", label: "Announcements", icon: "megaphone" },
        { href: "/admin/media", label: "Media library", icon: "image" },
      ],
    },
    {
      label: "Academy",
      items: [
        { href: "/admin/academy", label: "Academy builder", icon: "graduation" },
        { href: "/admin/academy/live", label: "Live sessions", icon: "video" },
        { href: "/admin/academy/assessments", label: "Assessments", icon: "gauge" },
        { href: "/admin/assignments", label: "Assignments", icon: "clipboard" },
      ],
    },
    {
      label: "Learners",
      items: [
        { href: "/admin/admissions", label: "Applications", icon: "flag", badge: counts.admissions },
        { href: "/admin/enrollments", label: "Enrolments", icon: "users" },
        { href: "/admin/cohorts", label: "Cohorts", icon: "users" },
        { href: "/admin/programme", label: "Programme control", icon: "layers" },
        { href: "/admin/students", label: "Audience", icon: "user" },
      ],
    },
    {
      label: "Engagement",
      items: [
        { href: "/admin/community", label: "Community", icon: "message" },
        { href: "/admin/notifications", label: "Notifications", icon: "bell" },
        { href: "/admin/contact", label: "Contact inbox", icon: "inbox", badge: counts.enquiries },
      ],
    },
    { label: "Commerce", items: [{ href: "/admin/store", label: "Bookstore", icon: "cart" }] },
    {
      label: "System",
      items: [
        { href: "/admin/people", label: "People & access", icon: "shield" },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
        { href: "/admin/operations", label: "Operations", icon: "activity" },
        { href: "/admin/architecture", label: "Data architecture", icon: "database" },
      ],
    },
  ];
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessAdminPath(actor, item.href)) }))
    .filter((section) => section.items.length > 0);
}

/** Workspaces this person can open, for the switcher in every shell. */
export function workspacesFor(actor: Actor): WorkspaceLink[] {
  if (!actor) return [];
  const links: WorkspaceLink[] = [];
  if (hasAdminWorkspace(actor)) links.push({ href: "/admin", label: "Admin console", hint: "Publishing, academy and operations" });
  if (STAFF_MENTOR_ROLES.has(actor.roleSlug)) links.push({ href: "/mentor", label: "Mentor desk", hint: "Learners, teaching and review" });
  if (actor.roleSlug === "student") links.push({ href: "/learn", label: "My learning", hint: "Programme, growth and community" });
  return links;
}

/** Longest matching nav entry wins, so nested routes highlight their own item. */
export function activeNavHref(sections: NavSection[], pathname: string) {
  let best: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      const matches = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href.split("/").length > 2);
      if (matches && (!best || item.href.length > best.length)) best = item.href;
    }
  }
  return best;
}
