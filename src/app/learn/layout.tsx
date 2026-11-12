import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { assignments, coachingSessions, liveSessions } from "@/db/schema";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/workspace/workspace-shell";
import { levelEnrolled, liveReadable } from "@/db/learning-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "My learning", template: "%s · Purpose Course Academy" },
  robots: { index: false, follow: false },
};

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/learn");
  if (user.roleSlug !== "student") redirect(homePathForRole(user.roleSlug));

  const [openAssignments, openSessions, upcomingLive] = await Promise.all([
    db.select({ value: count() }).from(assignments).where(levelEnrolled(assignments.levelId, user)),
    db
      .select({ value: count() })
      .from(coachingSessions)
      .where(eq(coachingSessions.studentId, user.profileId)),
    db
      .select({ value: count() })
      .from(liveSessions)
      .where(and(gte(liveSessions.startsAt, new Date()), liveReadable(user))),
  ]);

  const nav: WorkspaceNavItem[] = [
    { href: "/learn", label: "Dashboard", icon: "home" },
    { href: "/learn/courses", label: "Courses", icon: "book" },
    { href: "/learn/live", label: "Live sessions", icon: "calendar", badge: Number(upcomingLive[0]?.value ?? 0) },
    { href: "/learn/cohort", label: "My cohort", icon: "users" },
    { href: "/learn/instruments", label: "Purpose assessments", icon: "target" },
    { href: "/learn/goals", label: "Goals & mentor", icon: "award" },
    { href: "/learn/notifications", label: "Inbox & achievements", icon: "bell" },
    { href: "/learn/programme", label: "Programme", icon: "layers" },
    { href: "/learn/assignments", label: "Assignments", icon: "clipboard", badge: Number(openAssignments[0]?.value ?? 0) },
    { href: "/learn/assessments", label: "Quizzes & exams", icon: "target" },
    { href: "/learn/groups", label: "Group work", icon: "users" },
    { href: "/learn/reflections", label: "Reflections", icon: "notebook" },
    { href: "/learn/mentor", label: "My mentor", icon: "user", badge: Number(openSessions[0]?.value ?? 0) },
    { href: "/learn/certificates", label: "Certificates", icon: "award" },
    { href: "/community", label: "Community", icon: "message" },
  ];

  return (
    <WorkspaceShell
      nav={nav}
      user={{ profileId: user.profileId, fullName: user.fullName, roleName: user.roleName, title: user.title }}
      workspaceName="Academy"
      workspaceTitle="My learning"
      accent="gold"
      reviewMode={Boolean(user.isDemo)}
    >
      {user.isDemoAccount ? <p className="mb-4 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-navy">Demo Student · Your practice work is separate from production learning reports.</p> : null}
      {children}
    </WorkspaceShell>
  );
}
