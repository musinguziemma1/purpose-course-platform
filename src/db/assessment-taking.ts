import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, assessmentAnswers, assessmentAttempts, assessmentQuestions, assessmentSessions, assessments, courseLevels, courseModules, courses, learningEvents, lessonProgress, lessons, mentorAssignments, notifications, profiles, users } from "@/db/schema";
import { assessmentReadable } from "@/db/learning-access";
import { awardEarnedCertificates } from "@/db/certificate-awards";
import type { SessionUser } from "@/lib/auth";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function clock(tx: Transaction) { return new Date((await tx.execute<{ now: string }>(sql`select clock_timestamp() as now`)).rows[0].now); }

async function prerequisites(tx: Transaction, assessment: typeof assessments.$inferSelect, profileId: string) {
  const content = await tx.select({ id: lessons.id }).from(lessons).innerJoin(courseModules, eq(lessons.moduleId, courseModules.id)).innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(courses.status, "published"), eq(lessons.status, "published"),
      assessment.kind === "session" && assessment.moduleId ? eq(courseModules.id, assessment.moduleId) : assessment.courseId ? eq(courses.id, assessment.courseId) : eq(courses.levelId, assessment.levelId!)));
  if (!content.length) return "Teaching content for this assessment is not available yet.";
  const completed = await tx.select({ id: lessonProgress.lessonId }).from(lessonProgress).where(and(eq(lessonProgress.profileId, profileId), eq(lessonProgress.status, "completed"), inArray(lessonProgress.lessonId, content.map((row) => row.id))));
  if (completed.length !== content.length) return "Complete the published lessons for this assessment first.";
  if (assessment.kind === "level") {
    const required = await tx.select({ id: assessments.id }).from(assessments).where(and(eq(assessments.levelId, assessment.levelId!), eq(assessments.kind, "session"), eq(assessments.status, "published"), eq(assessments.isRequired, true), sql`(${assessments.courseId} is null or exists (select 1 from ${courses} where ${courses.id}=${assessments.courseId} and ${courses.status}='published'))`));
    const passed = required.length ? await tx.select({ id: assessmentAttempts.assessmentId }).from(assessmentAttempts).where(and(eq(assessmentAttempts.profileId, profileId), eq(assessmentAttempts.status, "submitted"), eq(assessmentAttempts.passed, true), inArray(assessmentAttempts.assessmentId, required.map((row) => row.id)))) : [];
    const passedIds = new Set(passed.map((row) => row.id));
    if (!required.every((row) => passedIds.has(row.id))) return "Pass the required session assessments before the level examination.";
  }
  return null;
}

function publicSession(session: typeof assessmentSessions.$inferSelect, now: Date, attemptsUsed: number, maxAttempts: number) {
  return { sessionId: session.id, questions: session.questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
    expiresAt: session.expiresAt.toISOString(), serverTime: now.toISOString(), passMark: session.passMark, attemptsUsed, maxAttempts };
}

export async function beginAssessment(assessmentId: number, viewer: SessionUser) {
  if (!Number.isSafeInteger(assessmentId) || assessmentId < 1) return { error: "Invalid assessment." } as const;
  return db.transaction(async (tx) => {
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, viewer.profileId)).for("update");
    const [assessment] = await tx.select().from(assessments).where(and(eq(assessments.id, assessmentId), assessmentReadable(viewer))).limit(1);
    if (!assessment) return { error: "That assessment is not available for your enrolment." } as const;
    if (!Number.isInteger(assessment.maxAttempts) || assessment.maxAttempts < 1 || !Number.isInteger(assessment.timeLimitMinutes) || assessment.timeLimitMinutes < 1 || assessment.timeLimitMinutes > 240) return { error: "The assessment settings need faculty review." } as const;
    const prerequisite = await prerequisites(tx, assessment, viewer.profileId);
    if (prerequisite) return { error: prerequisite } as const;
    const now = await clock(tx);
    await tx.update(assessmentSessions).set({ status: "expired" }).where(and(eq(assessmentSessions.profileId, viewer.profileId), eq(assessmentSessions.assessmentId, assessmentId), eq(assessmentSessions.status, "in_progress"), sql`${assessmentSessions.expiresAt} <= ${now}`));
    const submitted = await tx.select({ value: sql<number>`count(*)::int` }).from(assessmentAttempts).where(and(eq(assessmentAttempts.profileId, viewer.profileId), eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.status, "submitted")));
    const unfinished = await tx.select({ value: sql<number>`count(*)::int` }).from(assessmentSessions).where(and(eq(assessmentSessions.profileId, viewer.profileId), eq(assessmentSessions.assessmentId, assessmentId), inArray(assessmentSessions.status, ["in_progress", "expired"])));
    const active = await tx.select().from(assessmentSessions).where(and(eq(assessmentSessions.profileId, viewer.profileId), eq(assessmentSessions.assessmentId, assessmentId), eq(assessmentSessions.status, "in_progress"))).limit(1);
    const used = submitted[0].value + unfinished[0].value;
    if (active[0]) return { ok: true, ...publicSession(active[0], now, used, assessment.maxAttempts) } as const;
    if (used >= assessment.maxAttempts) return { error: "All assessment attempts have been used. Contact your mentor for review." } as const;
    const questions = await tx.select({ id: assessmentQuestions.id, prompt: assessmentQuestions.prompt, options: assessmentQuestions.options, correctIndex: assessmentQuestions.correctIndex, explanation: assessmentQuestions.explanation }).from(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, assessmentId)).orderBy(asc(assessmentQuestions.sortOrder), asc(assessmentQuestions.id));
    if (!questions.length || questions.some((question) => question.options.length < 2 || !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length)) return { error: "The question bank needs faculty review." } as const;
    const [level] = await tx.select({ passMark: courseLevels.passMark }).from(courseLevels).where(eq(courseLevels.id, assessment.levelId!)).limit(1);
    const passMark = Math.max(assessment.passMark, level?.passMark ?? 0);
    if (passMark < 0 || passMark > 100) return { error: "The assessment pass mark needs faculty review." } as const;
    const [session] = await tx.insert(assessmentSessions).values({ assessmentId, profileId: viewer.profileId, questions, passMark, startedAt: now, expiresAt: new Date(now.getTime() + assessment.timeLimitMinutes * 60000) }).returning();
    await tx.insert(learningEvents).values({ profileId: viewer.profileId, eventType: "assessment_started", courseId: assessment.courseId, assessmentId, metadata: { sessionId: session.id } });
    return { ok: true, ...publicSession(session, now, used + 1, assessment.maxAttempts) } as const;
  });
}

export async function completeAssessment(input: { assessmentId: number; sessionId: string; selections: { questionId: number; selectedIndex: number }[] }, viewer: SessionUser) {
  if (!uuid.test(input.sessionId) || !Number.isSafeInteger(input.assessmentId)) return { error: "Start this assessment before submitting." } as const;
  return db.transaction(async (tx) => {
    await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, viewer.profileId)).for("update");
    const [assessment] = await tx.select().from(assessments).where(and(eq(assessments.id, input.assessmentId), assessmentReadable(viewer))).limit(1);
    if (!assessment) return { error: "That assessment is not available for your enrolment." } as const;
    const [session] = await tx.select().from(assessmentSessions).where(and(eq(assessmentSessions.id, input.sessionId), eq(assessmentSessions.assessmentId, input.assessmentId), eq(assessmentSessions.profileId, viewer.profileId))).for("update").limit(1);
    if (!session) return { error: "Assessment session not found." } as const;
    if (session.status === "submitted" && session.attemptId) {
      const [attempt] = await tx.select().from(assessmentAttempts).where(and(eq(assessmentAttempts.id, session.attemptId), eq(assessmentAttempts.status, "submitted"))).limit(1);
      return attempt ? { ok: true, attempt, assessment, newlyIssued: [] as string[], certificate: null, duplicate: true } as const : { error: "This attempt is no longer valid." } as const;
    }
    const now = await clock(tx);
    if (session.status === "expired" || now.getTime() >= session.expiresAt.getTime()) {
      await tx.update(assessmentSessions).set({ status: "expired" }).where(eq(assessmentSessions.id, session.id));
      return { error: "The assessment time limit has expired. This attempt is used." } as const;
    }
    const prerequisite = await prerequisites(tx, assessment, viewer.profileId);
    if (prerequisite) return { error: prerequisite } as const;
    if (!Array.isArray(input.selections) || input.selections.length !== session.questions.length || input.selections.some((item) => !item || !Number.isSafeInteger(item.questionId) || !Number.isInteger(item.selectedIndex))) return { error: "Choose one valid answer for every question." } as const;
    const selected = new Map(input.selections.map((item) => [item.questionId, item.selectedIndex]));
    if (selected.size !== session.questions.length || session.questions.some((question) => !selected.has(question.id) || selected.get(question.id)! < 0 || selected.get(question.id)! >= question.options.length)) return { error: "Choose one valid answer for every question." } as const;
    const correctCount = session.questions.filter((question) => selected.get(question.id) === question.correctIndex).length;
    const score = Math.round(100 * correctCount / session.questions.length), passed = score >= session.passMark;
    const [attempt] = await tx.insert(assessmentAttempts).values({ assessmentId: assessment.id, profileId: viewer.profileId, correctCount, totalCount: session.questions.length, score, passed, passMark: session.passMark, submittedAt: now }).returning();
    await tx.insert(assessmentAnswers).values(session.questions.map((question) => ({ attemptId: attempt.id, questionId: question.id, selectedIndex: selected.get(question.id)!, isCorrect: selected.get(question.id) === question.correctIndex })));
    await tx.update(assessmentSessions).set({ status: "submitted", attemptId: attempt.id, selections: input.selections, submittedAt: now }).where(eq(assessmentSessions.id, session.id));
    await tx.insert(activityLogs).values({ actorId: viewer.profileId, action: "assessment.submitted", entityType: "assessment_attempt", entityId: String(attempt.id), description: `Scored ${score}% on “${assessment.title}”.` });
    await tx.insert(learningEvents).values({ profileId: viewer.profileId, eventType: "assessment_submitted", courseId: assessment.courseId, assessmentId: assessment.id, score, durationSeconds: Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 1000)), metadata: { passed, attemptId: attempt.id } });
    if (!passed) {
      const mentors = await tx.select({ id: mentorAssignments.mentorId }).from(mentorAssignments).innerJoin(profiles, eq(mentorAssignments.mentorId, profiles.id)).innerJoin(users, eq(profiles.userId, users.id)).where(and(eq(mentorAssignments.studentId, viewer.profileId), eq(mentorAssignments.status, "active"), eq(users.isActive, true)));
      if (mentors.length) await tx.insert(notifications).values(mentors.map((mentor) => ({ recipientId: mentor.id, type: "review" as const, title: "Student below the pass mark", body: `${viewer.fullName} scored ${score}% on “${assessment.title}”.`, href: "/mentor/assessments" })));
    }
    const awards = await awardEarnedCertificates(tx, viewer.profileId);
    const certificate = awards.awards.find((award) => assessment.kind === "level" ? award.kind === "level" && award.levelId === assessment.levelId : award.kind === "course" && award.courseId === assessment.courseId) ?? null;
    return { ok: true, attempt, assessment, newlyIssued: awards.newlyIssued, certificate, duplicate: false } as const;
  });
}
