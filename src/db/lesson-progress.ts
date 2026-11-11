import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, courseModules, courses, lessonProgress, lessons, profiles } from "@/db/schema";
import { lessonAccessible } from "@/db/learning-access";
import type { SessionUser } from "@/lib/auth";

export async function changeLessonCompletion(lessonId: number, viewer: SessionUser) {
  if (!Number.isSafeInteger(lessonId) || lessonId < 1) return null;
  return db.transaction(async (tx) => {
    // Serialize updates from multiple tabs, including two requests for a new progress row.
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, viewer.profileId)).for("update");
    const [record] = await tx.select({ lesson: lessons, courseSlug: courses.slug }).from(lessons)
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id)).innerJoin(courses, eq(courseModules.courseId, courses.id))
      .where(and(eq(lessons.id, lessonId), lessonAccessible(viewer, { write: true }))).limit(1);
    if (!record) return null;
    const [existing] = await tx.select().from(lessonProgress).where(and(eq(lessonProgress.lessonId, lessonId), eq(lessonProgress.profileId, viewer.profileId))).limit(1);
    const completed = existing?.status !== "completed";
    const values = { status: completed ? "completed" as const : "in_progress" as const, completedAt: completed ? new Date() : null, updatedAt: new Date() };
    await tx.insert(lessonProgress).values({ profileId: viewer.profileId, lessonId, ...values }).onConflictDoUpdate({ target: [lessonProgress.profileId, lessonProgress.lessonId], set: values });
    await tx.insert(activityLogs).values({ actorId: viewer.profileId, action: completed ? "academy.lesson_completed" : "academy.lesson_reopened", entityType: "lesson", entityId: String(lessonId), description: `${completed ? "Completed" : "Reopened"} lesson “${record.lesson.title}”.` });
    return { courseSlug: record.courseSlug, completed };
  });
}
