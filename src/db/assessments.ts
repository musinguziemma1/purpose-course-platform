import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentAnswers,
  assessmentAttempts,
  assessmentQuestions,
  assessmentSessions,
  assessments,
  certificates,
  courseGroups,
  courseLevels,
  courseModules,
  courses,
  groupMembers,
  groupSubmissions,
  lessonProgress,
  liveSessions,
  profiles,
  roles,
  users,
} from "@/db/schema";
import { getAcademyTree } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { synchronizeCertificates } from "@/db/certificate-awards";
import { assessmentReadable } from "@/db/learning-access";
import { groupReviewable, learnerReadable } from "@/db/learner-access";
import { getLearnerMetrics } from "@/db/learning-metrics";

/* ------------------------------------------------------------------ *
 * Assessment catalogue
 * ------------------------------------------------------------------ */

export type AssessmentCard = {
  id: number;
  kind: "session" | "level";
  title: string;
  description: string | null;
  passMark: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  levelId: number | null;
  levelName: string | null;
  courseId: number | null;
  courseTitle: string | null;
  courseSlug: string | null;
  moduleId: number | null;
  moduleTitle: string | null;
  questionCount: number;
  bestScore: number | null;
  attemptsUsed: number;
  hasActiveSession: boolean;
  passed: boolean;
  lastSubmittedAt: Date | null;
};

export async function getAssessmentsForStudent(profileId: string): Promise<AssessmentCard[]> {
  const viewer = await getSessionUser();
  if (!viewer || viewer.profileId !== profileId) return [];
  const rows = await db
    .select({
      assessment: assessments,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      moduleTitle: courseModules.title,
      questionCount: sql<number>`(select count(*) from ${assessmentQuestions} where ${assessmentQuestions.assessmentId} = ${assessments.id})::int`,
      bestScore: sql<number | null>`(select max(${assessmentAttempts.score}) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId} and ${assessmentAttempts.status} = 'submitted')`,
      attemptsUsed: sql<number>`(select count(*) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId} and ${assessmentAttempts.status} = 'submitted')::int + (select count(*) from ${assessmentSessions} where ${assessmentSessions.assessmentId} = ${assessments.id} and ${assessmentSessions.profileId} = ${profileId} and ${assessmentSessions.status} in ('in_progress', 'expired'))::int`,
      hasActiveSession: sql<boolean>`exists (select 1 from ${assessmentSessions} where ${assessmentSessions.assessmentId} = ${assessments.id} and ${assessmentSessions.profileId} = ${profileId} and ${assessmentSessions.status} = 'in_progress' and ${assessmentSessions.expiresAt} > now())`,
      passed: sql<boolean>`(select bool_or(${assessmentAttempts.passed}) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId} and ${assessmentAttempts.status} = 'submitted')`,
      lastSubmittedAt: sql<Date | null>`(select max(${assessmentAttempts.submittedAt}) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId} and ${assessmentAttempts.status} = 'submitted')`,
    })
    .from(assessments)
    .leftJoin(courseLevels, eq(assessments.levelId, courseLevels.id))
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(courseModules, eq(assessments.moduleId, courseModules.id))
    .where(assessmentReadable(viewer))
    .orderBy(asc(courseLevels.sortOrder), asc(assessments.kind), asc(assessments.sortOrder));

  return rows.map((row) => ({
    id: row.assessment.id,
    kind: row.assessment.kind,
    title: row.assessment.title,
    description: row.assessment.description,
    passMark: row.assessment.passMark,
    timeLimitMinutes: row.assessment.timeLimitMinutes,
    maxAttempts: row.assessment.maxAttempts,
    levelId: row.assessment.levelId,
    levelName: row.levelName,
    courseId: row.assessment.courseId,
    courseTitle: row.courseTitle,
    courseSlug: row.courseSlug,
    moduleId: row.assessment.moduleId,
    moduleTitle: row.moduleTitle,
    questionCount: Number(row.questionCount ?? 0),
    bestScore: row.bestScore === null ? null : Number(row.bestScore),
    attemptsUsed: Number(row.attemptsUsed ?? 0),
    hasActiveSession: row.hasActiveSession,
    passed: Boolean(row.passed),
    lastSubmittedAt: row.lastSubmittedAt ? new Date(row.lastSubmittedAt) : null,
  }));
}

export async function getAssessmentForTaking(assessmentId: number, profileId: string) {
  const viewer = await getSessionUser();
  if (!viewer || viewer.profileId !== profileId) return null;
  const rows = await db
    .select({
      assessment: assessments,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      moduleTitle: courseModules.title,
    })
    .from(assessments)
    .leftJoin(courseLevels, eq(assessments.levelId, courseLevels.id))
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(courseModules, eq(assessments.moduleId, courseModules.id))
    .where(and(eq(assessments.id, assessmentId), assessmentReadable(viewer)))
    .limit(1);
  const record = rows[0];
  if (!record) return null;

  const [questions, attempts, sessions] = await Promise.all([
    db
      .select({
        value: sql<number>`count(*)::int`,
      })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, assessmentId)),
    db
      .select()
      .from(assessmentAttempts)
      .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.profileId, profileId), eq(assessmentAttempts.status, "submitted")))
      .orderBy(desc(assessmentAttempts.submittedAt)),
    db.select({ status: assessmentSessions.status, expiresAt: assessmentSessions.expiresAt }).from(assessmentSessions).where(and(eq(assessmentSessions.assessmentId, assessmentId), eq(assessmentSessions.profileId, profileId), inArray(assessmentSessions.status, ["in_progress", "expired"]))),
  ]);

  return { ...record, questionCount: questions[0]?.value ?? 0, attempts, attemptsUsed: attempts.length + sessions.length, canResume: sessions.some((session) => session.status === "in_progress" && session.expiresAt.getTime() > Date.now()) };
}

export async function getAttemptReview(attemptId: number, profileId: string) {
  const viewer = await getSessionUser();
  if (!viewer || viewer.profileId !== profileId) return null;
  const rows = await db
    .select({
      attempt: assessmentAttempts,
      assessmentTitle: assessments.title,
      passMark: assessments.passMark,
      kind: assessments.kind,
      courseSlug: courses.slug,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .where(eq(assessmentAttempts.id, attemptId))
    .limit(1);
  const record = rows[0];
  if (!record || record.attempt.profileId !== profileId) return null;

  const [session] = await db.select({ questions: assessmentSessions.questions, selections: assessmentSessions.selections }).from(assessmentSessions).where(and(eq(assessmentSessions.attemptId, attemptId), eq(assessmentSessions.profileId, profileId))).limit(1);
  if (session) {
    const selections = new Map(session.selections.map((answer) => [answer.questionId, answer.selectedIndex]));
    return { ...record, answers: session.questions.map((question) => ({ questionId: question.id, prompt: question.prompt, options: question.options, correctIndex: question.correctIndex, explanation: question.explanation, selectedIndex: selections.get(question.id) ?? null, isCorrect: selections.get(question.id) === question.correctIndex })) };
  }

  const answers = await db
    .select({
      questionId: assessmentQuestions.id,
      prompt: assessmentQuestions.prompt,
      options: assessmentQuestions.options,
      correctIndex: assessmentQuestions.correctIndex,
      explanation: assessmentQuestions.explanation,
      selectedIndex: assessmentAnswers.selectedIndex,
      isCorrect: assessmentAnswers.isCorrect,
    })
    .from(assessmentQuestions)
    .leftJoin(assessmentAnswers, and(eq(assessmentAnswers.questionId, assessmentQuestions.id), eq(assessmentAnswers.attemptId, attemptId)))
    .where(eq(assessmentQuestions.assessmentId, record.attempt.assessmentId))
    .orderBy(asc(assessmentQuestions.sortOrder));

  return { ...record, answers };
}

/* ------------------------------------------------------------------ *
 * Grading + certificate issue
 * ------------------------------------------------------------------ */

export async function syncCertificates(profileId: string) {
  return (await synchronizeCertificates(profileId)).newlyIssued;
}

export async function issueCertificate(input: { profileId: string; kind: "course" | "level"; courseId?: number; levelId?: number; title: string; levelName: string | null; score: number | null; hours: number | null }) {
  const result = await synchronizeCertificates(input.profileId);
  return result.awards.find((award) => award.kind === input.kind && (input.kind === "course" ? award.courseId === input.courseId : award.levelId === input.levelId)) ?? null;
}

/* ------------------------------------------------------------------ *
 * Certificates
 * ------------------------------------------------------------------ */

export async function getCertificates(profileId: string) {
  return db
    .select({
      certificate: certificates,
      studentName: profiles.fullName,
    })
    .from(certificates)
    .innerJoin(profiles, eq(certificates.profileId, profiles.id))
    .where(eq(certificates.profileId, profileId))
    .orderBy(desc(certificates.issuedAt));
}

export async function getCertificateByCode(code: string) {
  const rows = await db
    .select({
      certificate: certificates,
      studentName: profiles.fullName,
      studentTitle: profiles.title,
    })
    .from(certificates)
    .innerJoin(profiles, eq(certificates.profileId, profiles.id))
    .where(and(eq(certificates.code, code.toUpperCase()), isNull(certificates.revokedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ *
 * Mentor / admin performance analytics
 * ------------------------------------------------------------------ */

export type StudentPerformance = {
  profileId: string;
  fullName: string;
  email: string;
  levelName: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  lessonPercent: number;
  averageScore: number | null;
  bestScore: number | null;
  lastScore: number | null;
  trend: number | null;
  attempts: number;
  passedAssessments: number;
  failedAssessments: number;
  groupScore: number | null;
  certificates: number;
  risk: "excellent" | "on_track" | "at_risk" | "critical";
  attention: string[];
};

export async function getCohortPerformance(
  levelId?: number | null,
): Promise<StudentPerformance[]> {
  const viewer = await getSessionUser();
  const students = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(
      and(
        eq(roles.slug, "student"),
        eq(users.isActive, true),
        learnerReadable(profiles.id, viewer),
      ),
    );
  const metrics = await getLearnerMetrics(
    viewer,
    students.map((student) => student.id),
    levelId ?? null,
  );
  const studentIds = metrics.map((student) => student.profileId);
  if (!studentIds.length) return [];
  const [groupRows, groupScoreRows] = await Promise.all([
    db
      .select({
        profileId: groupMembers.profileId,
        groupId: groupMembers.groupId,
      })
      .from(groupMembers)
      .innerJoin(courseGroups, eq(groupMembers.groupId, courseGroups.id))
      .leftJoin(courses, eq(courseGroups.courseId, courses.id))
      .where(
        and(
          inArray(groupMembers.profileId, studentIds),
          levelId ? eq(courses.levelId, levelId) : undefined,
        ),
      ),
    db
      .select({
        groupId: groupSubmissions.groupId,
        score: sql<number | null>`max(${groupSubmissions.score})`,
      })
      .from(groupSubmissions)
      .where(eq(groupSubmissions.status, "reviewed"))
      .groupBy(groupSubmissions.groupId),
  ]);
  const groupScoreByGroup = new Map(
    groupScoreRows.map((row) => [
      row.groupId,
      row.score === null ? null : Number(row.score),
    ]),
  );
  return metrics.map((student) => {
    const attempts = student.attempts,
      scores = attempts.map((row) => row.score);
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    const bestScore = scores.length ? Math.max(...scores) : null;
    const lastScore = scores.length ? scores[scores.length - 1] : null;
    const passedAssessments = attempts.filter((row) => row.passed).length;
    const latest = new Map(
      attempts.map((attempt) => [attempt.assessmentId, attempt]),
    );
    const latestFailures = [...latest.values()].filter(
      (attempt) => !attempt.passed,
    );
    const groupScores = groupRows
      .filter((row) => row.profileId === student.profileId)
      .map((row) => groupScoreByGroup.get(row.groupId))
      .filter((value): value is number => typeof value === "number");
    const groupScore = groupScores.length
      ? Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length)
      : null;
    const lessonPercent = student.lessonsTotal
      ? Math.round((student.lessonsCompleted / student.lessonsTotal) * 100)
      : 0;
    const attention: string[] = [];
    for (const failure of latestFailures)
      attention.push(
        failure.title +
          ": latest score " +
          failure.score +
          "% is below its " +
          failure.passMark +
          "% pass mark",
      );
    if (student.improvement !== null && student.improvement < 0)
      attention.push(
        "Comparable assessment scores changed by " +
          student.improvement +
          " points from first to latest",
      );
    if (student.lessonsTotal && !student.lessonsCompleted)
      attention.push("No assigned lessons completed yet");
    if (student.lessonsTotal && !attempts.length)
      attention.push("No current curriculum assessments submitted yet");
    if (groupScore !== null && groupScore < 70)
      attention.push("Reviewed group work scored " + groupScore + "%");
    // Follow-up indicators, not a dropout prediction. New learners are not
    // classified at risk merely because their curriculum has not started.
    const risk: StudentPerformance["risk"] =
      latestFailures.length >= 2
        ? "critical"
        : latestFailures.length
          ? "at_risk"
          : averageScore !== null && averageScore >= 90 && lessonPercent >= 80
            ? "excellent"
            : "on_track";
    return {
      profileId: student.profileId,
      fullName: student.fullName,
      email: student.email,
      levelName: student.levelName,
      lessonsCompleted: student.lessonsCompleted,
      lessonsTotal: student.lessonsTotal,
      lessonPercent,
      averageScore,
      bestScore,
      lastScore,
      trend: student.improvement,
      attempts: attempts.length,
      passedAssessments,
      failedAssessments: attempts.length - passedAssessments,
      groupScore,
      certificates: student.certificates,
      risk,
      attention,
    };
  });
}

export async function getAssessmentResults(
  filters: { assessmentId?: number; profileId?: string } = {},
) {
  const viewer = await getSessionUser();
  const conditions = [
    learnerReadable(assessmentAttempts.profileId, viewer),
    eq(assessmentAttempts.status, "submitted"),
    eq(users.isActive, true),
    eq(users.isDemoAccount, Boolean(viewer?.isDemoAccount)),
    eq(roles.slug, "student"),
    sql`${assessmentAttempts.submittedAt} <= now()`,
  ];
  if (filters.assessmentId)
    conditions.push(eq(assessmentAttempts.assessmentId, filters.assessmentId));
  if (filters.profileId)
    conditions.push(eq(assessmentAttempts.profileId, filters.profileId));

  return db
    .select({
      attempt: assessmentAttempts,
      assessmentTitle: assessments.title,
      assessmentKind: assessments.kind,
      studentName: profiles.fullName,
      studentSlug: profiles.slug,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .innerJoin(profiles, eq(assessmentAttempts.profileId, profiles.id))
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(assessmentAttempts.submittedAt))
    .limit(60);
}

export async function getAssessmentAdminList() {
  const viewer = await getSessionUser();
  const attemptsFrom = sql`from ${assessmentAttempts} inner join ${profiles} on ${profiles.id}=${assessmentAttempts.profileId}
    inner join ${users} on ${users.id}=${profiles.userId} inner join ${roles} on ${roles.id}=${profiles.roleId}
    where ${assessmentAttempts.assessmentId}=${assessments.id} and ${assessmentAttempts.status}='submitted'
      and ${assessmentAttempts.submittedAt}<=now() and ${users.isActive} and ${roles.slug}='student'
      and ${users.isDemoAccount}=${Boolean(viewer?.isDemoAccount)}
      and ${learnerReadable(assessmentAttempts.profileId, viewer)}`;
  const rows = await db
    .select({
      assessment: assessments,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      moduleTitle: courseModules.title,
      questionCount: sql<number>`(select count(*) from ${assessmentQuestions} where ${assessmentQuestions.assessmentId} = ${assessments.id})::int`,
      attemptCount: sql<number>`(select count(*) ${attemptsFrom})::int`,
      averageScore: sql<
        number | null
      >`(select avg(${assessmentAttempts.score}) ${attemptsFrom})`,
      passRate: sql<
        number | null
      >`(select round(100.0 * count(*) filter (where ${assessmentAttempts.passed}) / nullif(count(*),0)) ${attemptsFrom})`,
    })
    .from(assessments)
    .leftJoin(courseLevels, eq(assessments.levelId, courseLevels.id))
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(courseModules, eq(assessments.moduleId, courseModules.id))
    .orderBy(
      asc(courseLevels.sortOrder),
      asc(assessments.kind),
      asc(assessments.sortOrder),
    );
  return rows;
}

export async function getAssessmentForAdmin(assessmentId: number) {
  const viewer = await getSessionUser();
  const rows = await db
    .select({
      assessment: assessments,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      moduleTitle: courseModules.title,
    })
    .from(assessments)
    .leftJoin(courseLevels, eq(assessments.levelId, courseLevels.id))
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(courseModules, eq(assessments.moduleId, courseModules.id))
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  if (!rows[0]) return null;
  const [questions, attempts] = await Promise.all([
    db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, assessmentId))
      .orderBy(asc(assessmentQuestions.sortOrder)),
    db
      .select({ attempt: assessmentAttempts, studentName: profiles.fullName })
      .from(assessmentAttempts)
      .innerJoin(profiles, eq(assessmentAttempts.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(and(eq(assessmentAttempts.assessmentId, assessmentId), learnerReadable(assessmentAttempts.profileId, viewer), eq(assessmentAttempts.status, "submitted"), eq(users.isActive, true), eq(users.isDemoAccount, Boolean(viewer?.isDemoAccount)), eq(roles.slug, "student"), sql`${assessmentAttempts.submittedAt} <= now()`))
      .orderBy(desc(assessmentAttempts.submittedAt))
      .limit(20),
  ]);
  return { ...rows[0], questions, attempts };
}

/* ------------------------------------------------------------------ *
 * Group work
 * ------------------------------------------------------------------ */

export async function getGroupsForStudent(profileId: string) {
  const viewer = await getSessionUser();
  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(and(eq(groupMembers.profileId, profileId), learnerReadable(groupMembers.profileId, viewer)));
  const groupIds = memberships.map((row) => row.groupId);
  if (groupIds.length === 0) return [];

  const [groups, members, submissions] = await Promise.all([
    db
      .select({ group: courseGroups, courseTitle: courses.title, courseSlug: courses.slug })
      .from(courseGroups)
      .leftJoin(courses, eq(courseGroups.courseId, courses.id))
      .where(inArray(courseGroups.id, groupIds)),
    db
      .select({ groupId: groupMembers.groupId, profileId: groupMembers.profileId, fullName: profiles.fullName, role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(profiles, eq(groupMembers.profileId, profiles.id))
      .where(inArray(groupMembers.groupId, groupIds)),
    db.select().from(groupSubmissions).where(inArray(groupSubmissions.groupId, groupIds)).orderBy(desc(groupSubmissions.updatedAt)),
  ]);

  return groups.map((row) => ({
    ...row.group,
    courseTitle: row.courseTitle,
    courseSlug: row.courseSlug,
    members: members.filter((member) => member.groupId === row.group.id),
    submissions: submissions.filter((submission) => submission.groupId === row.group.id),
  }));
}

export async function getGroupsForReview() {
  const viewer = await getSessionUser();
  const groups = await db
    .select({ group: courseGroups, courseTitle: courses.title, mentorName: profiles.fullName })
    .from(courseGroups)
    .leftJoin(courses, eq(courseGroups.courseId, courses.id))
    .leftJoin(profiles, eq(courseGroups.mentorId, profiles.id))
    .where(groupReviewable(viewer))
    .orderBy(desc(courseGroups.createdAt));
  const groupIds = groups.map((row) => row.group.id);
  if (!groupIds.length) return [];

  const [members, submissions] = await Promise.all([
    db
      .select({ groupId: groupMembers.groupId, profileId: groupMembers.profileId, fullName: profiles.fullName, role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(profiles, eq(groupMembers.profileId, profiles.id))
      .where(inArray(groupMembers.groupId, groupIds)),
    db.select().from(groupSubmissions).where(inArray(groupSubmissions.groupId, groupIds)).orderBy(desc(groupSubmissions.updatedAt)),
  ]);

  return groups.map((row) => ({
    ...row.group,
    courseTitle: row.courseTitle,
    mentorName: row.mentorName,
    members: members.filter((member) => member.groupId === row.group.id),
    submissions: submissions.filter((submission) => submission.groupId === row.group.id),
  }));
}
