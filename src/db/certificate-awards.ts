import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { activityLogs, assessmentAttempts, assessments, certificates, courseLevels, courseModules, courses, enrollments, learningEvents, lessonProgress, lessons, notifications, profiles } from "@/db/schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type AwardInput = { kind: "course" | "level"; courseId?: number; levelId: number; title: string; levelName: string; score: number | null; hours: number };

async function award(tx: Transaction, profileId: string, input: AwardInput) {
  const scope = and(eq(certificates.profileId, profileId), eq(certificates.kind, input.kind), input.kind === "course" ? eq(certificates.courseId, input.courseId!) : eq(certificates.levelId, input.levelId))!;
  const [existing] = await tx.select().from(certificates).where(scope).limit(1);
  if (existing) return { certificate: existing.revokedAt ? null : existing, created: false };
  const [created] = await tx.insert(certificates).values({ ...input, profileId, code: `PC-${new Date().getFullYear()}-${randomBytes(10).toString("hex").toUpperCase()}` }).onConflictDoNothing().returning();
  if (!created) {
    const [sameScope] = await tx.select().from(certificates).where(and(scope, isNull(certificates.revokedAt))).limit(1);
    return { certificate: sameScope ?? null, created: false };
  }
  await tx.insert(activityLogs).values({ actorId: profileId, action: "certificate.earned", entityType: "certificate", entityId: String(created.id), description: `Earned ${input.kind} certificate for “${input.title}”.` });
  await tx.insert(notifications).values({ recipientId: profileId, type: "system", title: "Certificate earned", body: `Your verified completion of “${input.title}” is now certified.`, href: "/learn/certificates" });
  await tx.insert(learningEvents).values({ profileId, eventType: "certificate_earned", courseId: input.courseId ?? null, metadata: { kind: input.kind, levelId: input.levelId, certificateId: created.id } });
  return { certificate: created, created: true };
}

/** Caller holds the learner row lock so concurrent grading/completion agrees. */
export async function awardEarnedCertificates(tx: Transaction, profileId: string) {
  const courseRows = await tx.select({ course: courses, level: courseLevels }).from(courses).innerJoin(courseLevels, eq(courses.levelId, courseLevels.id)).where(eq(courses.status, "published"));
    const lessonRows = await tx.select({ id: lessons.id, courseId: courseModules.courseId }).from(lessons).innerJoin(courseModules, eq(lessons.moduleId, courseModules.id)).where(eq(lessons.status, "published"));
    const completedRows = await tx.select({ id: lessonProgress.lessonId }).from(lessonProgress).where(and(eq(lessonProgress.profileId, profileId), eq(lessonProgress.status, "completed")));
    const required = await tx.select().from(assessments).where(and(eq(assessments.status, "published"), eq(assessments.isRequired, true), sql`(${assessments.courseId} is null or exists (select 1 from ${courses} where ${courses.id}=${assessments.courseId} and ${courses.status}='published'))`));
    const passedRows = await tx.select({ id: assessmentAttempts.assessmentId, score: assessmentAttempts.score }).from(assessmentAttempts).where(and(eq(assessmentAttempts.profileId, profileId), eq(assessmentAttempts.status, "submitted"), eq(assessmentAttempts.passed, true)));
    const enrollmentRows = await tx.select({ levelId: enrollments.levelId }).from(enrollments).where(and(eq(enrollments.profileId, profileId), inArray(enrollments.status, ["enrolled", "completed"])));
  const completed = new Set(completedRows.map((row) => row.id)), passed = new Set(passedRows.map((row) => row.id));
  const enrolled = new Set(enrollmentRows.map((row) => row.levelId));
  const eligibleCourses = new Set<number>();
  const awards: (typeof certificates.$inferSelect)[] = [], newlyIssued: string[] = [];
  const scoreFor = (ids: number[]) => {
    const best = ids.map((id) => Math.max(...passedRows.filter((row) => row.id === id).map((row) => row.score)));
    return best.length && best.every(Number.isFinite) ? Math.round(best.reduce((sum, score) => sum + score, 0) / best.length) : null;
  };
  for (const { course, level } of courseRows) {
    const content = lessonRows.filter((lesson) => lesson.courseId === course.id);
    const quizzes = required.filter((assessment) => assessment.courseId === course.id && assessment.kind === "session");
    if (!enrolled.has(level.id) || !content.length || !content.every((lesson) => completed.has(lesson.id)) || !quizzes.every((quiz) => passed.has(quiz.id))) continue;
    const result = await award(tx, profileId, { kind: "course", courseId: course.id, levelId: level.id, title: course.title, levelName: level.name, score: scoreFor(quizzes.map((quiz) => quiz.id)), hours: course.estimatedHours });
    if (result.certificate) { awards.push(result.certificate); eligibleCourses.add(course.id); }
    if (result.created) newlyIssued.push(result.certificate!.code);
  }
  for (const levelId of enrolled) {
    const levelCourses = courseRows.filter((row) => row.level.id === levelId);
    const exams = required.filter((assessment) => assessment.levelId === levelId && assessment.kind === "level");
    const levelRequirements = required.filter((assessment) => assessment.levelId === levelId);
    if (!levelCourses.length || !exams.length || !levelCourses.every((row) => eligibleCourses.has(row.course.id)) || !levelRequirements.every((assessment) => passed.has(assessment.id))) continue;
    const level = levelCourses[0].level;
    const result = await award(tx, profileId, { kind: "level", levelId: level.id, title: `${level.name} Level — Completed`, levelName: level.name, score: scoreFor(exams.map((exam) => exam.id)), hours: levelCourses.reduce((sum, row) => sum + row.course.estimatedHours, 0) });
    if (result.certificate) awards.push(result.certificate);
    if (result.certificate) await tx.update(enrollments).set({ status: "completed", updatedAt: new Date() }).where(and(eq(enrollments.profileId, profileId), eq(enrollments.levelId, level.id), eq(enrollments.status, "enrolled")));
    if (result.created) newlyIssued.push(result.certificate!.code);
  }
  return { awards, newlyIssued };
}

export async function synchronizeCertificates(profileId: string) {
  return db.transaction(async (tx) => {
    const [profile] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, profileId)).for("update").limit(1);
    return profile ? awardEarnedCertificates(tx, profileId) : { awards: [], newlyIssued: [] };
  });
}
