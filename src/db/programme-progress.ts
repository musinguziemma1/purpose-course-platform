import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, courseSessions, enrollments, learningProgress } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

/** A self-reported checklist entry never awards lesson progress or a certificate. */
export async function setProgrammeSessionComplete(sessionId: number, completed: boolean, viewer: SessionUser) {
  if (!Number.isSafeInteger(sessionId) || sessionId < 1 || viewer.roleSlug !== "student" || !can(viewer, "learning.submit")) return false;
  return db.transaction(async (tx) => {
    const [record] = await tx.select({ enrollment: enrollments }).from(enrollments)
      .innerJoin(courseSessions, eq(courseSessions.levelId, enrollments.levelId))
      .where(and(eq(courseSessions.id, sessionId), eq(enrollments.profileId, viewer.profileId), eq(enrollments.status, "enrolled")))
      .orderBy(desc(enrollments.createdAt), desc(enrollments.id)).limit(1).for("update", { of: enrollments });
    if (!record) return false;
    const [existing] = await tx.select().from(learningProgress)
      .where(and(eq(learningProgress.enrollmentId, record.enrollment.id), eq(learningProgress.sessionId, sessionId))).limit(1);
    if ((existing?.completed ?? false) === completed) return true;
    await tx.insert(learningProgress).values({ enrollmentId: record.enrollment.id, sessionId, completed, completedAt: completed ? new Date() : null })
      .onConflictDoUpdate({ target: [learningProgress.enrollmentId, learningProgress.sessionId], set: { completed, completedAt: completed ? new Date() : null } });
    await tx.insert(activityLogs).values({ actorId: viewer.profileId, action: completed ? "learning.session_completed" : "learning.session_reopened",
      entityType: "course_session", entityId: String(sessionId), description: `${completed ? "Checked" : "Unchecked"} self-reported programme session #${sessionId}.` });
    return true;
  });
}
