import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { assignments, coachingSessions, liveSessions } from "@/db/schema";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { liveReadable } from "@/db/learning-access";
import { profileIsComplete } from "@/lib/profile";
import { assignmentReadable } from "@/db/assignment-workflow";
import { learnerNavigation, workspacesFor } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "My learning", template: "%s · Purpose Course Academy" },
  robots: { index: false, follow: false },
};

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/learn");
  if (user.roleSlug !== "student") redirect(homePathForRole(user.roleSlug));
  if (!user.isDemo && !profileIsComplete(user)) redirect("/account?complete=1");

  const [openAssignments, openSessions, upcomingLive] = await Promise.all([
    db.select({ value: count() }).from(assignments).where(assignmentReadable(user)),
    db.select({ value: count() }).from(coachingSessions).where(and(eq(coachingSessions.studentId, user.profileId), eq(coachingSessions.status, "scheduled"))),
    db.select({ value: count() }).from(liveSessions).where(and(gte(liveSessions.startsAt, new Date()), liveReadable(user))),
  ]);

  return (
    <WorkspaceShell
      sections={learnerNavigation({
        upcomingLive: Number(upcomingLive[0]?.value ?? 0),
        openAssignments: Number(openAssignments[0]?.value ?? 0),
        coaching: Number(openSessions[0]?.value ?? 0),
      })}
      user={{ profileId: user.profileId, fullName: user.fullName, roleName: user.roleName, title: user.title }}
      workspaceName="My learning"
      workspaceHome="/learn"
      workspaces={workspacesFor(user)}
      accent="gold"
      reviewMode={Boolean(user.isDemo)}
      banner={user.isDemoAccount ? <p className="border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-[13px] text-navy sm:px-6">Demo student account · Practice work is kept separate from production learning reports.</p> : null}
    >
      {children}
    </WorkspaceShell>
  );
}
