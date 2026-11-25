import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignmentSubmissions, coachingSessions } from "@/db/schema";
import { getSessionUser, homePathForRole, isMentor } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { coachingReadable, learnerReadable } from "@/db/learner-access";
import { profileIsComplete } from "@/lib/profile";
import { mentorNavigation, workspacesFor } from "@/lib/navigation";
import "./mentor-desk.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "Mentor desk", template: "%s · Purpose Course Mentorship" },
  robots: { index: false, follow: false },
};

export default async function MentorLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mentor");
  if (!isMentor(user)) redirect(homePathForRole(user.roleSlug));
  if (!user.isDemo && !profileIsComplete(user)) redirect("/account?complete=1");

  const [requests, reviews] = await Promise.all([
    db.select({ value: count() }).from(coachingSessions).where(and(eq(coachingSessions.status, "requested"), coachingReadable(user))),
    db.select({ value: count() }).from(assignmentSubmissions).where(and(eq(assignmentSubmissions.status, "submitted"), learnerReadable(assignmentSubmissions.profileId, user))),
  ]);

  return (
    <WorkspaceShell
      sections={mentorNavigation({ requests: Number(requests[0]?.value ?? 0), submissions: Number(reviews[0]?.value ?? 0) })}
      user={{ profileId: user.profileId, fullName: user.fullName, roleName: user.roleName, title: user.title }}
      workspaceName="Mentor desk"
      workspaceHome="/mentor"
      workspaces={workspacesFor(user)}
      accent="teal"
      reviewMode={Boolean(user.isDemo)}
      banner={user.isDemoAccount ? <p className="border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-[13px] text-navy sm:px-6">Demo mentor account · Explore the assigned demo student and practice coaching records.</p> : null}
    >
      <div className="mentor-desk mx-auto max-w-[88rem]">{children}</div>
    </WorkspaceShell>
  );
}
