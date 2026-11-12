import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignmentSubmissions, coachingSessions } from "@/db/schema";
import { getSessionUser, homePathForRole, isMentor } from "@/lib/auth";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/workspace/workspace-shell";
import { coachingReadable, learnerReadable } from "@/db/learner-access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "Mentor desk", template: "%s · Purpose Course Mentorship" },
  robots: { index: false, follow: false },
};

export default async function MentorLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mentor");
  if (!isMentor(user)) redirect(homePathForRole(user.roleSlug));

  const [requests, reviews] = await Promise.all([
    db
      .select({ value: count() })
      .from(coachingSessions)
      .where(
        and(
          eq(coachingSessions.status, "requested"),
          coachingReadable(user),
        ),
      ),
    db.select({ value: count() }).from(assignmentSubmissions).where(and(eq(assignmentSubmissions.status, "submitted"), learnerReadable(assignmentSubmissions.profileId, user))),
  ]);

  const nav: WorkspaceNavItem[] = [
    { href: "/mentor", label: "Overview", icon: "home" },
    { href: "/mentor/sessions", label: "Coaching sessions", icon: "calendar", badge: Number(requests[0]?.value ?? 0) },
    { href: "/mentor/submissions", label: "Assignment review", icon: "clipboard", badge: Number(reviews[0]?.value ?? 0) },
    { href: "/mentor/assessments", label: "Assessment scores", icon: "target" },
    { href: "/mentor/groups", label: "Group work", icon: "users" },
    { href: "/mentor/learners", label: "Learners & goals", icon: "target" },
    { href: "/mentor/attendance", label: "Attendance", icon: "calendar" },
    { href: "/mentor/live", label: "Live teaching", icon: "calendar" },
    { href: "/community", label: "Community", icon: "message" },
  ];

  return (
    <WorkspaceShell
      nav={nav}
      user={{ profileId: user.profileId, fullName: user.fullName, roleName: user.roleName, title: user.title }}
      workspaceName="Mentor desk"
      workspaceTitle="Mentorship workspace"
      accent="teal"
      reviewMode={Boolean(user.isDemo)}
    >
      {user.isDemoAccount ? <p className="mb-4 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-navy">Demo Mentor · Explore the assigned Demo Student and practice coaching records.</p> : null}
      {children}
    </WorkspaceShell>
  );
}
