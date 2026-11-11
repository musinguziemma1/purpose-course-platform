import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assessmentAnswers,
  assessmentAttempts,
  assessmentQuestions,
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
} from "@/db/schema";
import { getAcademyTree } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { groupReviewable, learnerReadable } from "@/db/learner-access";

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
  passed: boolean;
  lastSubmittedAt: Date | null;
};

export async function getAssessmentsForStudent(profileId: string): Promise<AssessmentCard[]> {
  const rows = await db
    .select({
      assessment: assessments,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      moduleTitle: courseModules.title,
      questionCount: sql<number>`(select count(*) from ${assessmentQuestions} where ${assessmentQuestions.assessmentId} = ${assessments.id})::int`,
      bestScore: sql<number | null>`(select max(${assessmentAttempts.score}) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId})`,
      attemptsUsed: sql<number>`(select count(*) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId})::int`,
      passed: sql<boolean>`(select bool_or(${assessmentAttempts.passed}) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId})`,
      lastSubmittedAt: sql<Date | null>`(select max(${assessmentAttempts.submittedAt}) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${assessmentAttempts.profileId} = ${profileId})`,
    })
    .from(assessments)
    .leftJoin(courseLevels, eq(assessments.levelId, courseLevels.id))
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(courseModules, eq(assessments.moduleId, courseModules.id))
    .where(eq(assessments.status, "published"))
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
    passed: Boolean(row.passed),
    lastSubmittedAt: row.lastSubmittedAt ? new Date(row.lastSubmittedAt) : null,
  }));
}

export async function getAssessmentForTaking(assessmentId: number, profileId: string) {
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
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  const record = rows[0];
  if (!record) return null;

  const [questions, attempts] = await Promise.all([
    db
      .select({
        id: assessmentQuestions.id,
        prompt: assessmentQuestions.prompt,
        options: assessmentQuestions.options,
      })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, assessmentId))
      .orderBy(asc(assessmentQuestions.sortOrder)),
    db
      .select()
      .from(assessmentAttempts)
      .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.profileId, profileId)))
      .orderBy(desc(assessmentAttempts.submittedAt)),
  ]);

  return { ...record, questions, attempts };
}

export async function getAttemptReview(attemptId: number, profileId: string) {
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

export async function gradeAssessment(input: {
  assessmentId: number;
  profileId: string;
  selections: { questionId: number; selectedIndex: number }[];
}) {
  const [assessmentRows, questions] = await Promise.all([
    db.select().from(assessments).where(eq(assessments.id, input.assessmentId)).limit(1),
    db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, input.assessmentId))
      .orderBy(asc(assessmentQuestions.sortOrder)),
  ]);
  const assessment = assessmentRows[0];
  if (!assessment || questions.length === 0) return null;

  const selected = new Map(input.selections.map((item) => [item.questionId, item.selectedIndex]));
  const graded = questions.map((question) => {
    const selectedIndex = selected.get(question.id) ?? -1;
    return { question, selectedIndex, isCorrect: selectedIndex === question.correctIndex };
  });
  const correctCount = graded.filter((item) => item.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);

  const levelRows = assessment.levelId
    ? await db.select().from(courseLevels).where(eq(courseLevels.id, assessment.levelId)).limit(1)
    : [];
  const passMark = Math.max(assessment.passMark, levelRows[0]?.passMark ?? 0);
  const passed = score >= passMark;

  const [attempt] = await db
    .insert(assessmentAttempts)
    .values({
      assessmentId: assessment.id,
      profileId: input.profileId,
      score,
      passed,
      correctCount,
      totalCount: questions.length,
      passMark,
    })
    .returning();

  await db.insert(assessmentAnswers).values(
    graded.map((item) => ({
      attemptId: attempt.id,
      questionId: item.question.id,
      selectedIndex: item.selectedIndex,
      isCorrect: item.isCorrect,
    })),
  );

  const certificate = passed ? await issueCertificateForAssessment(input.profileId, assessment.id) : null;

  return { attempt, assessment, graded, score, passed, passMark, certificate };
}

export async function issueCertificateForAssessment(profileId: string, assessmentId: number) {
  const rows = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  const assessment = rows[0];
  if (!assessment) return null;

  if (assessment.kind === "level" && assessment.levelId) {
    const levelRows = await db.select().from(courseLevels).where(eq(courseLevels.id, assessment.levelId)).limit(1);
    const level = levelRows[0];
    const best = await bestScore(profileId, assessmentId);
    return issueCertificate({
      profileId,
      kind: "level",
      levelId: assessment.levelId,
      title: `${level?.name ?? "Purpose Course"} Level — Completed`,
      levelName: level?.name ?? null,
      score: best,
      hours: (level?.weeks ?? 5) * 3,
    });
  }

  if (assessment.courseId) {
    const courseRows = await db.select().from(courses).where(eq(courses.id, assessment.courseId)).limit(1);
    const course = courseRows[0];
    if (!course) return null;
    const levelRows = await db.select().from(courseLevels).where(eq(courseLevels.id, course.levelId)).limit(1);
    const best = await bestScore(profileId, assessmentId);
    return issueCertificate({
      profileId,
      kind: "course",
      courseId: course.id,
      levelId: course.levelId,
      title: course.title,
      levelName: levelRows[0]?.name ?? null,
      score: best,
      hours: course.estimatedHours,
    });
  }
  return null;
}

async function bestScore(profileId: string, assessmentId: number) {
  const rows = await db
    .select({ value: sql<number | null>`max(${assessmentAttempts.score})` })
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.profileId, profileId)));
  const value = rows[0]?.value;
  return value === null || value === undefined ? null : Number(value);
}

export async function issueCertificate(input: {
  profileId: string;
  kind: "course" | "level";
  courseId?: number;
  levelId?: number;
  title: string;
  levelName: string | null;
  score: number | null;
  hours: number | null;
}) {
  const [existing] = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.profileId, input.profileId),
        input.kind === "course" && input.courseId
          ? eq(certificates.courseId, input.courseId)
          : input.kind === "level" && input.levelId
            ? eq(certificates.levelId, input.levelId)
            : isNull(certificates.courseId),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const code = `PC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const [created] = await db
    .insert(certificates)
    .values({
      code,
      profileId: input.profileId,
      kind: input.kind,
      courseId: input.courseId ?? null,
      levelId: input.levelId ?? null,
      title: input.title,
      levelName: input.levelName,
      score: input.score,
      hours: input.hours,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;
  const [again] = await db.select().from(certificates).where(eq(certificates.profileId, input.profileId)).limit(1);
  return again ?? null;
}

/** Called whenever a lesson or assessment is completed: issues any earned certificates. */
export async function syncCertificates(profileId: string) {
  const tree = await getAcademyTree();
  const completedRows = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.profileId, profileId), eq(lessonProgress.status, "completed")));
  const completedIds = new Set(completedRows.map((row) => row.lessonId));

  const issued: string[] = [];
  for (const course of tree) {
    const courseLessons = course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.status === "published");
    if (courseLessons.length === 0) continue;
    const allDone = courseLessons.every((lesson) => completedIds.has(lesson.id));
    if (!allDone) continue;
    const certificate = await issueCertificate({
      profileId,
      kind: "course",
      courseId: course.id,
      levelId: course.levelId,
      title: course.title,
      levelName: course.levelName,
      score: null,
      hours: course.estimatedHours,
    });
    if (certificate) issued.push(certificate.code);
  }
  return issued;
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
    .where(eq(certificates.code, code.toUpperCase()))
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

export async function getCohortPerformance(levelId?: number | null): Promise<StudentPerformance[]> {
  const viewer = await getSessionUser();
  const students = await db
    .select({
      profileId: profiles.id,
      fullName: profiles.fullName,
      slug: profiles.slug,
      title: profiles.title,
    })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(eq(roles.slug, "student"), learnerReadable(profiles.id, viewer)))
    .orderBy(asc(profiles.fullName));
  const studentIds = students.map((student) => student.profileId);
  if (!studentIds.length) return [];

  const tree = await getAcademyTree();
  const totalLessons = tree.reduce(
    (sum, course) => sum + course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.status === "published").length,
    0,
  );

  const [progressRows, attemptRows, groupRows, certificateRows, levelRows, groupScoreRows] = await Promise.all([
    db
      .select({ profileId: lessonProgress.profileId, value: sql<number>`count(*)::int` })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.status, "completed"), inArray(lessonProgress.profileId, studentIds)))
      .groupBy(lessonProgress.profileId),
    db
      .select({
        profileId: assessmentAttempts.profileId,
        score: assessmentAttempts.score,
        passed: assessmentAttempts.passed,
        submittedAt: assessmentAttempts.submittedAt,
        levelId: assessments.levelId,
      })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .where(inArray(assessmentAttempts.profileId, studentIds))
      .orderBy(asc(assessmentAttempts.submittedAt)),
    db
      .select({ profileId: groupMembers.profileId, groupId: groupMembers.groupId, groupName: courseGroups.name })
      .from(groupMembers)
      .innerJoin(courseGroups, eq(groupMembers.groupId, courseGroups.id))
      .where(inArray(groupMembers.profileId, studentIds)),
    db.select({ profileId: certificates.profileId, value: sql<number>`count(*)::int` }).from(certificates).where(inArray(certificates.profileId, studentIds)).groupBy(certificates.profileId),
    db.select().from(courseLevels).orderBy(asc(courseLevels.sortOrder)),
    db
      .select({
        groupId: groupSubmissions.groupId,
        score: sql<number | null>`max(${groupSubmissions.score})`,
      })
      .from(groupSubmissions)
      .groupBy(groupSubmissions.groupId),
  ]);

  const progressByProfile = new Map(progressRows.map((row) => [row.profileId, Number(row.value)]));
  const certificateByProfile = new Map(certificateRows.map((row) => [row.profileId, Number(row.value)]));
  const groupScoreByGroup = new Map(groupScoreRows.map((row) => [row.groupId, row.score === null ? null : Number(row.score)]));
  const leadPassMark = levelRows.find((level) => level.id === levelId)?.passMark ?? 80;

  return students.map((student) => {
    const attempts = attemptRows.filter((row) => row.profileId === student.profileId);
    const scores = attempts.map((row) => row.score);
    const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.max(...scores) : null;
    const lastScore = scores.length ? scores[scores.length - 1] : null;
    const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : null;
    const passedAssessments = attempts.filter((row) => row.passed).length;
    const failedAssessments = attempts.length - passedAssessments;

    const memberships = groupRows.filter((row) => row.profileId === student.profileId);
    const groupScores = memberships
      .map((row) => groupScoreByGroup.get(row.groupId))
      .filter((value): value is number => typeof value === "number");
    const groupScore = groupScores.length ? Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length) : null;

    const lessonsCompleted = progressByProfile.get(student.profileId) ?? 0;
    const lessonPercent = totalLessons ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
    const attention: string[] = [];

    if (averageScore !== null && averageScore < leadPassMark) attention.push(`Assessment average ${averageScore}% is below the ${leadPassMark}% pass mark`);
    if (trend !== null && trend < 0) attention.push(`Score fell ${Math.abs(trend)} points between the last two attempts`);
    if (lessonsCompleted === 0) attention.push("No lessons completed yet");
    else if (lessonPercent < 40) attention.push(`Only ${lessonPercent}% of lessons completed`);
    if (attempts.length === 0) attention.push("No assessments attempted");
    if (groupScore !== null && groupScore < 70) attention.push(`Group work scored ${groupScore}%`);
    if (failedAssessments >= 2) attention.push(`${failedAssessments} failed assessment attempts`);

    const risk: StudentPerformance["risk"] =
      (averageScore !== null && averageScore < 60) || (attempts.length > 0 && failedAssessments >= 2 && lessonPercent < 30)
        ? "critical"
        : attention.length >= 2 || (averageScore !== null && averageScore < leadPassMark)
          ? "at_risk"
          : averageScore !== null && averageScore >= 90 && lessonPercent >= 80
            ? "excellent"
            : "on_track";

    return {
      profileId: student.profileId,
      fullName: student.fullName,
      email: `${student.slug}@purposecourse.app`,
      levelName: student.title,
      lessonsCompleted,
      lessonsTotal: totalLessons,
      lessonPercent,
      averageScore,
      bestScore,
      lastScore,
      trend,
      attempts: attempts.length,
      passedAssessments,
      failedAssessments,
      groupScore,
      certificates: certificateByProfile.get(student.profileId) ?? 0,
      risk,
      attention,
    };
  });
}

export async function getAssessmentResults(filters: { assessmentId?: number; profileId?: string } = {}) {
  const conditions = [learnerReadable(assessmentAttempts.profileId, await getSessionUser())];
  if (filters.assessmentId) conditions.push(eq(assessmentAttempts.assessmentId, filters.assessmentId));
  if (filters.profileId) conditions.push(eq(assessmentAttempts.profileId, filters.profileId));

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
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(assessmentAttempts.submittedAt))
    .limit(60);
}

export async function getAssessmentAdminList() {
  const viewer = await getSessionUser();
  const rows = await db
    .select({
      assessment: assessments,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      moduleTitle: courseModules.title,
      questionCount: sql<number>`(select count(*) from ${assessmentQuestions} where ${assessmentQuestions.assessmentId} = ${assessments.id})::int`,
      attemptCount: sql<number>`(select count(*) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${learnerReadable(assessmentAttempts.profileId, viewer)})::int`,
      averageScore: sql<number | null>`(select round(avg(${assessmentAttempts.score})) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${learnerReadable(assessmentAttempts.profileId, viewer)})`,
      passRate: sql<number | null>`(select round(100.0 * count(*) filter (where ${assessmentAttempts.passed}) / greatest(count(*),1)) from ${assessmentAttempts} where ${assessmentAttempts.assessmentId} = ${assessments.id} and ${learnerReadable(assessmentAttempts.profileId, viewer)})`,
    })
    .from(assessments)
    .leftJoin(courseLevels, eq(assessments.levelId, courseLevels.id))
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(courseModules, eq(assessments.moduleId, courseModules.id))
    .orderBy(asc(courseLevels.sortOrder), asc(assessments.kind), asc(assessments.sortOrder));
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
      .where(and(eq(assessmentAttempts.assessmentId, assessmentId), learnerReadable(assessmentAttempts.profileId, viewer)))
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
