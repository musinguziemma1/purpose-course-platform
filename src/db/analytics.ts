import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievements,
  articles,
  assessmentAttempts,
  assessments,
  certificates,
  cohortMembers,
  cohorts,
  courseModules,
  courses,
  discussionThreads,
  engagementSnapshots,
  enrollments,
  instrumentResults,
  learnerAchievements,
  learnerGoals,
  learningEvents,
  lessonProgress,
  lessons,
  mentorAssignments,
  mentoringNotes,
  platformEvents,
  profiles,
  reflections,
  subscribers,
} from "@/db/schema";

const PRINCIPLES = ["Identity", "Source", "Purpose", "Potential", "Destiny"] as const;
export type Principle = (typeof PRINCIPLES)[number];

export const PRINCIPLE_QUESTIONS: Record<Principle, string> = {
  Identity: "Who am I?",
  Source: "Where am I from?",
  Purpose: "Why am I here?",
  Potential: "What can I do?",
  Destiny: "Where am I going?",
};

/* ------------------------------------------------------------------ *
 * Platform level
 * ------------------------------------------------------------------ */

export async function getPlatformAnalytics() {
  const [
    users,
    learners,
    enrollRows,
    certificateRows,
    lessonRows,
    attemptRows,
    cohortRows,
    discussionRows,
    subscriberRows,
    activeRows,
    eventRows,
    principleRows,
    articleRows,
  ] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(profiles),
    db.select({ value: sql<number>`count(*)::int` }).from(profiles).innerJoin(sql`roles`, sql`roles.id = profiles.role_id`).where(sql`roles.slug = 'student'`),
    db.select({ status: enrollments.status, value: sql<number>`count(*)::int` }).from(enrollments).groupBy(enrollments.status),
    db.select({ value: sql<number>`count(*)::int` }).from(certificates),
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${lessonProgress.status} = 'completed')::int`,
      })
      .from(lessonProgress),
    db
      .select({
        attempts: sql<number>`count(*)::int`,
        passed: sql<number>`count(*) filter (where ${assessmentAttempts.passed})::int`,
        average: sql<number | null>`round(avg(${assessmentAttempts.score}))`,
        firstAvg: sql<number | null>`round(avg(${assessmentAttempts.score}) filter (where ${assessmentAttempts.submittedAt} < now() - interval '7 days'))`,
        recentAvg: sql<number | null>`round(avg(${assessmentAttempts.score}) filter (where ${assessmentAttempts.submittedAt} >= now() - interval '7 days'))`,
      })
      .from(assessmentAttempts),
    db.select({ value: sql<number>`count(*)::int` }).from(cohorts).where(eq(cohorts.status, "active")),
    db
      .select({
        threads: sql<number>`count(*)::int`,
        replies: sql<number>`coalesce(sum(${discussionThreads.replyCount}), 0)::int`,
      })
      .from(discussionThreads),
    db.select({ value: sql<number>`count(*)::int` }).from(subscribers),
    db
      .select({ value: sql<number>`count(distinct ${learningEvents.profileId})::int` })
      .from(learningEvents)
      .where(gte(learningEvents.occurredAt, new Date(Date.now() - 30 * 86400000))),
    db
      .select({ name: platformEvents.name, module: platformEvents.module, value: sql<number>`count(*)::int` })
      .from(platformEvents)
      .groupBy(platformEvents.name, platformEvents.module)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({
        moduleCode: courseModules.sessionCode,
        total: sql<number>`count(${lessons.id})::int`,
        completed: sql<number>`count(*) filter (where ${lessonProgress.status} = 'completed')::int`,
      })
      .from(lessons)
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .leftJoin(lessonProgress, eq(lessonProgress.lessonId, lessons.id))
      .where(eq(lessons.status, "published"))
      .groupBy(courseModules.sessionCode),
    db
      .select({
        published: sql<number>`count(*) filter (where ${articles.status} = 'published')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(articles),
  ]);

  const enrollByStatus = Object.fromEntries(enrollRows.map((row) => [row.status, Number(row.value)]));
  const totalEnrolled = Number(enrollByStatus.enrolled ?? 0) + Number(enrollByStatus.completed ?? 0);
  const completed = Number(enrollByStatus.completed ?? 0);
  const attempts = attemptRows[0];
  const lessonTotals = lessonRows[0];

  const principleTotals = PRINCIPLES.map((principle, index) => {
    const code = String(index + 1);
    const rows = principleRows.filter((row) => row.moduleCode?.endsWith(code));
    const total = rows.reduce((sum, row) => sum + Number(row.total), 0);
    const done = rows.reduce((sum, row) => sum + Number(row.completed), 0);
    return {
      principle,
      question: PRINCIPLE_QUESTIONS[principle],
      percent: total ? Math.round((done / total) * 100) : 0,
      lessons: total,
      completed: done,
    };
  });

  const completionRate = Number(lessonTotals?.total ?? 0)
    ? Math.round((Number(lessonTotals.completed) / Number(lessonTotals.total)) * 100)
    : 0;

  return {
    users: Number(users[0]?.value ?? 0),
    learners: Number(learners[0]?.value ?? 0),
    activeLearners: Number(activeRows[0]?.value ?? 0),
    enrollments: totalEnrolled,
    completionRate,
    courseCompletion: totalEnrolled ? Math.round((completed / totalEnrolled) * 100) : 0,
    certificates: Number(certificateRows[0]?.value ?? 0),
    assessmentAttempts: Number(attempts?.attempts ?? 0),
    assessmentPassRate: Number(attempts?.attempts ?? 0) ? Math.round((Number(attempts.passed) / Number(attempts.attempts)) * 100) : 0,
    assessmentAverage: attempts?.average === null ? null : Number(attempts?.average ?? 0),
    assessmentImprovement:
      attempts?.recentAvg !== null && attempts?.firstAvg !== null
        ? Number(attempts.recentAvg) - Number(attempts.firstAvg)
        : null,
    activeCohorts: Number(cohortRows[0]?.value ?? 0),
    threads: Number(discussionRows[0]?.threads ?? 0),
    replies: Number(discussionRows[0]?.replies ?? 0),
    subscribers: Number(subscriberRows[0]?.value ?? 0),
    articlePipeline: {
      published: Number(articleRows[0]?.published ?? 0),
      total: Number(articleRows[0]?.total ?? 0),
    },
    principles: principleTotals,
    topEvents: eventRows.map((row) => ({ name: row.name, module: row.module, value: Number(row.value) })),
  };
}

export async function getEngagementTrend(days = 14) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db
    .select({
      date: engagementSnapshots.snapshotDate,
      minutes: sql<number>`coalesce(sum(${engagementSnapshots.minutesLearned}), 0)::int`,
      active: sql<number>`count(*) filter (where ${engagementSnapshots.activeFlag})::int`,
      lessons: sql<number>`coalesce(sum(${engagementSnapshots.lessonsCompleted}), 0)::int`,
    })
    .from(engagementSnapshots)
    .where(sql`${engagementSnapshots.snapshotDate} >= ${since.toISOString().slice(0, 10)}`)
    .groupBy(engagementSnapshots.snapshotDate)
    .orderBy(engagementSnapshots.snapshotDate);
  return rows.map((row) => ({
    date: row.date,
    minutes: Number(row.minutes),
    active: Number(row.active),
    lessons: Number(row.lessons),
  }));
}

export async function getRetention() {
  const rows = await db
    .select({
      cohortWeek: sql<number>`floor(extract(epoch from (now() - ${platformEvents.occurredAt})) / 604800)::int`,
      learners: sql<number>`count(distinct ${platformEvents.profileId})::int`,
    })
    .from(platformEvents)
    .where(sql`${platformEvents.occurredAt} > now() - interval '56 days'`)
    .groupBy(sql`floor(extract(epoch from (now() - ${platformEvents.occurredAt})) / 604800)`)
    .orderBy(sql`floor(extract(epoch from (now() - ${platformEvents.occurredAt})) / 604800) desc`);
  return rows.map((row) => ({ week: Number(row.cohortWeek), learners: Number(row.learners) }));
}

/* ------------------------------------------------------------------ *
 * Programme level
 * ------------------------------------------------------------------ */

export async function getProgrammeAnalytics() {
  const [cohortRows, goalRows, mentorRows, noteRows, dropoffRows, satisfactionRows] = await Promise.all([
    db
      .select({
        cohort: cohorts,
        learners: sql<number>`(select count(*) from ${cohortMembers} where ${cohortMembers.cohortId} = ${cohorts.id} and ${cohortMembers.role} = 'learner')::int`,
      })
      .from(cohorts)
      .orderBy(desc(cohorts.startsAt)),
    db
      .select({ status: learnerGoals.status, value: sql<number>`count(*)::int` })
      .from(learnerGoals)
      .groupBy(learnerGoals.status),
    db.select({ value: sql<number>`count(*)::int` }).from(mentorAssignments),
    db.select({ value: sql<number>`count(*)::int` }).from(mentoringNotes),
    db
      .select({ courseId: courses.id, title: courses.title, total: sql<number>`count(${lessons.id})::int`, completed: sql<number>`count(*) filter (where ${lessonProgress.status} = 'completed')::int` })
      .from(courses)
      .innerJoin(courseModules, eq(courseModules.courseId, courses.id))
      .innerJoin(lessons, eq(lessons.moduleId, courseModules.id))
      .leftJoin(lessonProgress, eq(lessonProgress.lessonId, lessons.id))
      .groupBy(courses.id, courses.title)
      .orderBy(desc(sql`count(${lessons.id})`)),
    db
      .select({ value: sql<number>`coalesce(round(avg(${instrumentResults.overallScore})), 0)::int` })
      .from(instrumentResults),
  ]);

  const goalByStatus = Object.fromEntries(goalRows.map((row) => [row.status, Number(row.value)]));
  const totalGoals = Object.values(goalByStatus).reduce((sum, value) => sum + value, 0);

  return {
    cohorts: cohortRows.map((row) => ({
      id: row.cohort.id,
      slug: row.cohort.slug,
      name: row.cohort.name,
      status: row.cohort.status,
      learners: Number(row.learners),
      capacity: row.cohort.capacity,
      startsAt: row.cohort.startsAt,
      endsAt: row.cohort.endsAt,
    })),
    goals: {
      total: totalGoals,
      active: goalByStatus.active ?? 0,
      achieved: goalByStatus.achieved ?? 0,
      achievedRate: totalGoals ? Math.round(((goalByStatus.achieved ?? 0) / totalGoals) * 100) : 0,
    },
    mentorAssignments: Number(mentorRows[0]?.value ?? 0),
    mentoringNotes: Number(noteRows[0]?.value ?? 0),
    dropout: dropoffRows
      .filter((row) => Number(row.total) > 0)
      .map((row) => {
        const percent = Number(row.total) ? Math.round((Number(row.completed) / Number(row.total)) * 100) : 0;
        return { id: row.courseId, title: row.title, completion: percent, dropout: 100 - percent };
      }),
    satisfaction: Number(satisfactionRows[0]?.value ?? 0),
  };
}

/* ------------------------------------------------------------------ *
 * Individual level — with per-principle progress
 * ------------------------------------------------------------------ */

export async function getLearnerAnalytics(profileId: string) {
  const [progressRows, attemptRows, goalRows, reflectionRows, achievementRows, certificateRows, instrumentRows, eventRows] = await Promise.all([
    db
      .select({ moduleCode: courseModules.sessionCode, lessonId: lessons.id, status: lessonProgress.status })
      .from(lessons)
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.profileId, profileId)))
      .where(eq(lessons.status, "published")),
    db
      .select({ score: assessmentAttempts.score, passed: assessmentAttempts.passed, submittedAt: assessmentAttempts.submittedAt, title: assessments.title })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .where(eq(assessmentAttempts.profileId, profileId))
      .orderBy(assessmentAttempts.submittedAt),
    db.select().from(learnerGoals).where(eq(learnerGoals.studentId, profileId)),
    db.select({ value: sql<number>`count(*)::int` }).from(reflections).where(eq(reflections.authorProfileId, profileId)),
    db
      .select({ achievement: achievements, awardedAt: learnerAchievements.awardedAt })
      .from(learnerAchievements)
      .innerJoin(achievements, eq(learnerAchievements.achievementId, achievements.id))
      .where(eq(learnerAchievements.profileId, profileId)),
    db.select({ value: sql<number>`count(*)::int` }).from(certificates).where(eq(certificates.profileId, profileId)),
    db.select().from(instrumentResults).where(eq(instrumentResults.profileId, profileId)).orderBy(desc(instrumentResults.createdAt)).limit(8),
    db.select({ value: sql<number>`count(*)::int` }).from(learningEvents).where(eq(learningEvents.profileId, profileId)),
  ]);

  const principles = PRINCIPLES.map((principle, index) => {
    const code = String(index + 1);
    const rows = progressRows.filter((row) => row.moduleCode?.endsWith(code));
    const total = rows.length;
    const done = rows.filter((row) => row.status === "completed").length;
    return {
      principle,
      question: PRINCIPLE_QUESTIONS[principle],
      total,
      completed: done,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  });

  const scores = attemptRows.map((row) => Number(row.score));
  const completedLessons = progressRows.filter((row) => row.status === "completed").length;
  return {
    lessons: { total: progressRows.length, completed: completedLessons, percent: progressRows.length ? Math.round((completedLessons / progressRows.length) * 100) : 0 },
    principles,
    assessments: {
      attempts: attemptRows.length,
      average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      best: scores.length ? Math.max(...scores) : null,
      first: scores.length ? scores[0] : null,
      last: scores.length ? scores[scores.length - 1] : null,
      improvement: scores.length >= 2 ? scores[scores.length - 1] - scores[0] : null,
      history: attemptRows.map((row) => ({ title: row.title, score: Number(row.score), passed: row.passed })),
    },
    goals: {
      total: goalRows.length,
      achieved: goalRows.filter((row) => row.status === "achieved").length,
      averageProgress: goalRows.length ? Math.round(goalRows.reduce((sum, row) => sum + row.progress, 0) / goalRows.length) : 0,
    },
    reflections: Number(reflectionRows[0]?.value ?? 0),
    achievements: achievementRows.map((row) => ({ name: row.achievement.name, description: row.achievement.description, icon: row.achievement.icon, points: row.achievement.points, awardedAt: row.awardedAt })),
    certificates: Number(certificateRows[0]?.value ?? 0),
    instruments: instrumentRows.map((row) => ({
      title: row.instrumentId,
      score: row.overallScore,
      band: row.bandLabel,
      createdAt: row.createdAt,
      dimensions: row.dimensions,
    })),
    learningEvents: Number(eventRows[0]?.value ?? 0),
  };
}

/* ------------------------------------------------------------------ *
 * Audit & security
 * ------------------------------------------------------------------ */

export async function getAuditTrail(limit = 60) {
  const [changes, security, events] = await Promise.all([
    db
      .select({ change: sql<Record<string, unknown>>`json_build_object('id', data_changes.id, 'table', data_changes.table_name, 'record', data_changes.record_id, 'type', data_changes.change_type, 'at', data_changes.created_at)`, actor: profiles.fullName })
      .from(sql`data_changes`)
      .leftJoin(profiles, sql`profiles.id = data_changes.actor_id`)
      .orderBy(sql`data_changes.created_at desc`)
      .limit(limit),
    db
      .select({ detail: sql<string>`event_type || ' · ' || severity`, profileId: sql<string | null>`profile_id`, at: sql<Date>`created_at` })
      .from(sql`security_events`)
      .orderBy(sql`created_at desc`)
      .limit(20),
    db
      .select({ name: platformEvents.name, module: platformEvents.module, at: platformEvents.occurredAt })
      .from(platformEvents)
      .orderBy(desc(platformEvents.occurredAt))
      .limit(20),
  ]);
  return { changes, security, events };
}

export async function getAchievements(profileId?: string) {
  const rows = await db.select().from(achievements).orderBy(achievements.points);
  if (!profileId) return rows.map((row) => ({ achievement: row, awardedAt: null as Date | null }));
  const awarded = await db.select().from(learnerAchievements).where(eq(learnerAchievements.profileId, profileId));
  return rows.map((row) => ({
    achievement: row,
    awardedAt: awarded.find((entry) => entry.achievementId === row.id)?.awardedAt ?? null,
  }));
}

