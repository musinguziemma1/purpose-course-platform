import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { canReadLearner, coachingReadable, learnerReadable } from "@/db/learner-access";
import {
  assignmentSubmissions,
  assignments,
  coachingSessions,
  courseLevels,
  courseModules,
  courseSessions,
  courses,
  enrollments,
  learningProgress,
  lessons,
  mentorAssignments,
  profiles,
  reflections,
  roles,
} from "@/db/schema";

/* ------------------------------------------------------------------ *
 * Student workspace
 * ------------------------------------------------------------------ */

export type StudentWorkspace = Awaited<ReturnType<typeof getStudentWorkspace>>;

export async function getStudentWorkspace(profileId: string) {
  const viewer = await getSessionUser();
  if (!(await canReadLearner(profileId, viewer))) throw new Error("Learner access required.");
  const enrollmentRows = await db
    .select({
      enrollment: enrollments,
      level: courseLevels,
    })
    .from(enrollments)
    .leftJoin(courseLevels, eq(enrollments.levelId, courseLevels.id))
    .where(and(eq(enrollments.profileId, profileId), inArray(enrollments.status, ["enrolled", "completed"]), learnerReadable(enrollments.profileId, viewer)))
    .orderBy(desc(enrollments.createdAt), desc(enrollments.id))
    .limit(1);

  const enrollment = enrollmentRows[0]?.enrollment ?? null;
  const level = enrollmentRows[0]?.level ?? null;

  const [levels, sessions, progress, coaching, assignmentRows, reflectionRows, mentorRows, programmeModules] = await Promise.all([
    db.select().from(courseLevels).orderBy(asc(courseLevels.sortOrder)),
    db.select().from(courseSessions).orderBy(asc(courseSessions.sortOrder)),
    db.select({ progress: learningProgress }).from(learningProgress)
      .innerJoin(enrollments, eq(enrollments.id, learningProgress.enrollmentId))
      .innerJoin(courseSessions, and(eq(courseSessions.id, learningProgress.sessionId), eq(courseSessions.levelId, enrollments.levelId)))
      .where(and(eq(enrollments.profileId, profileId), inArray(enrollments.status, ["enrolled", "completed"])))
      .then((rows) => rows.map((row) => row.progress)),
    db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.studentId, profileId))
      .orderBy(desc(coachingSessions.scheduledAt))
      .limit(12),
    db
      .select({
        assignment: assignments,
        submission: assignmentSubmissions,
      })
      .from(assignments)
      .leftJoin(
        assignmentSubmissions,
        and(eq(assignmentSubmissions.assignmentId, assignments.id), eq(assignmentSubmissions.profileId, profileId)),
      )
      .where(and(level ? eq(assignments.levelId, level.id) : sql`false`, or(isNull(assignments.assigneeId), eq(assignments.assigneeId, profileId))))
      .orderBy(asc(assignments.sortOrder)),
    db
      .select()
      .from(reflections)
      .where(eq(reflections.authorProfileId, profileId))
      .orderBy(desc(reflections.createdAt))
      .limit(12),
    db
      .select({ mentorId: mentorAssignments.mentorId })
      .from(mentorAssignments)
      .where(and(eq(mentorAssignments.studentId, profileId), eq(mentorAssignments.status, "active")))
      .limit(1),
    db.select({ id: courseModules.id, title: courseModules.title, sessionCode: courseModules.sessionCode, levelId: courses.levelId,
      courseSlug: courses.slug, lessons: sql<number>`count(${lessons.id})::int` }).from(courseModules)
      .innerJoin(courses, eq(courses.id, courseModules.courseId))
      .innerJoin(lessons, and(eq(lessons.moduleId, courseModules.id), eq(lessons.status, "published")))
      .where(eq(courses.status, "published")).groupBy(courseModules.id, courses.id)
      .orderBy(asc(courses.sortOrder), asc(courseModules.sortOrder), asc(courseModules.id)),
  ]);

  const mentorId = mentorRows[0]?.mentorId ?? null;
  const mentor = mentorId
    ? (
        await db
          .select({
            id: profiles.id,
            fullName: profiles.fullName,
            title: profiles.title,
            bio: profiles.bio,
          })
          .from(profiles)
          .where(eq(profiles.id, mentorId))
          .limit(1)
      )[0] ?? null
    : null;

  const completedIds = new Set(progress.filter((row) => row.completed).map((row) => row.sessionId));
  const levelSessions = level ? sessions.filter((session) => session.levelId === level.id) : [];
  const completedInLevel = levelSessions.filter((session) => completedIds.has(session.id)).length;
  const nextSession = levelSessions.find((session) => !completedIds.has(session.id)) ?? null;
  const totalSessions = sessions.length;
  const completedTotal = completedIds.size;

  return {
    enrollment,
    level,
    levels,
    sessions,
    programmeModules,
    levelSessions,
    progress,
    completedIds,
    completedInLevel,
    completedTotal,
    totalSessions,
    percent: levelSessions.length ? Math.round((completedInLevel / levelSessions.length) * 100) : 0,
    nextSession,
    coaching,
    upcomingCoaching: coaching
      .filter((item) => item.status === "scheduled" && item.scheduledAt.getTime() > Date.now())
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
    assignments: assignmentRows,
    reflections: reflectionRows,
    mentor,
  };
}

/* ------------------------------------------------------------------ *
 * Mentor workspace
 * ------------------------------------------------------------------ */

export async function getMentorWorkspace(mentorId: string) {
  const viewer = await getSessionUser();
  const [sessionRows, pendingSubmissions, menteeRows, sharedReflections, allStudents] = await Promise.all([
    db
      .select({
        session: coachingSessions,
        studentName: profiles.fullName,
        studentTitle: profiles.title,
      })
      .from(coachingSessions)
      .innerJoin(profiles, eq(coachingSessions.studentId, profiles.id))
      .where(and(eq(coachingSessions.mentorId, mentorId), coachingReadable(viewer)))
      .orderBy(asc(coachingSessions.scheduledAt)),
    db
      .select({
        submission: assignmentSubmissions,
        assignment: assignments,
        studentName: profiles.fullName,
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .innerJoin(profiles, eq(assignmentSubmissions.profileId, profiles.id))
      .where(and(inArray(assignmentSubmissions.status, ["submitted", "reviewed"]), learnerReadable(assignmentSubmissions.profileId, viewer)))
      .orderBy(sql`case when ${assignmentSubmissions.status} = 'submitted' then 0 else 1 end`, desc(assignmentSubmissions.submittedAt))
      .limit(100),
    db
      .select({
        studentId: mentorAssignments.studentId,
        studentName: profiles.fullName,
        studentTitle: profiles.title,
        sessions: count(coachingSessions.id),
      })
      .from(mentorAssignments)
      .innerJoin(profiles, eq(mentorAssignments.studentId, profiles.id))
      .leftJoin(coachingSessions, and(eq(coachingSessions.studentId, mentorAssignments.studentId), eq(coachingSessions.mentorId, mentorId)))
      .where(and(eq(mentorAssignments.mentorId, mentorId), eq(mentorAssignments.status, "active"), learnerReadable(mentorAssignments.studentId, viewer)))
      .groupBy(mentorAssignments.studentId, profiles.fullName, profiles.title),
    db
      .select({
        reflection: reflections,
        authorName: profiles.fullName,
      })
      .from(reflections)
      .innerJoin(profiles, eq(reflections.authorProfileId, profiles.id))
      .where(and(inArray(reflections.visibility, ["mentor", "cohort"]), learnerReadable(reflections.authorProfileId, viewer)))
      .orderBy(desc(reflections.createdAt))
      .limit(10),
    db
      .select({
        profileId: profiles.id,
        fullName: profiles.fullName,
        email: profiles.slug,
        cohort: enrollments.cohort,
        status: enrollments.status,
        levelName: courseLevels.name,
        enrollmentId: enrollments.id,
      })
      .from(enrollments)
      .innerJoin(profiles, eq(enrollments.profileId, profiles.id))
      .leftJoin(courseLevels, eq(enrollments.levelId, courseLevels.id))
      .where(learnerReadable(enrollments.profileId, viewer))
      .orderBy(desc(enrollments.createdAt))
      .limit(30),
  ]);

  const now = Date.now();
  const upcoming = sessionRows.filter(
    (row) => row.session.scheduledAt.getTime() >= now && row.session.status !== "cancelled",
  );
  const requested = sessionRows.filter((row) => row.session.status === "requested");
  const completed = sessionRows.filter((row) => row.session.status === "completed");
  const awaitingReview = pendingSubmissions.filter((row) => row.submission.status === "submitted");

  return {
    sessions: sessionRows,
    upcoming,
    requested,
    completed,
    pendingSubmissions,
    awaitingReview,
    mentees: menteeRows,
    reflections: sharedReflections,
    students: allStudents,
    stats: {
      mentees: menteeRows.length,
      upcoming: upcoming.length,
      requested: requested.length,
      completed: completed.length,
      awaitingReview: awaitingReview.length,
    },
  };
}

export async function getProgressForStudents(profileIds: string[]) {
  const viewer = await getSessionUser();
  if (!profileIds.length) return new Map<string, { completed: number; total: number; level: string | null }>();
  const rows = await db
    .select({
      profileId: enrollments.profileId,
      level: courseLevels.name,
      completed: sql<number>`count(*) filter (where ${learningProgress.completed})::int`,
      total: sql<number>`count(${learningProgress.id})::int`,
    })
    .from(enrollments)
    .leftJoin(learningProgress, eq(learningProgress.enrollmentId, enrollments.id))
    .leftJoin(courseLevels, eq(enrollments.levelId, courseLevels.id))
    .where(and(inArray(enrollments.profileId, profileIds), learnerReadable(enrollments.profileId, viewer)))
    .groupBy(enrollments.profileId, courseLevels.name);

  return new Map(
    rows
      .filter((row): row is typeof row & { profileId: string } => Boolean(row.profileId))
      .map((row) => [
        row.profileId,
        { completed: Number(row.completed), total: Number(row.total), level: row.level },
      ]),
  );
}

export async function getFirstMentorId() {
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(roles.slug, "mentor"))
    .orderBy(asc(profiles.createdAt))
    .limit(1);
  return rows[0]?.id ?? null;
}

/* ------------------------------------------------------------------ *
 * Academy-wide oversight (administrator)
 * ------------------------------------------------------------------ */

export async function getAcademyOverview() {
  const [studentCount, mentorCount, sessionCount, upcoming, submissionCount, reflectionCount] = await Promise.all([
    db.select({ value: count() }).from(profiles).innerJoin(roles, eq(profiles.roleId, roles.id)).where(eq(roles.slug, "student")),
    db.select({ value: count() }).from(profiles).innerJoin(roles, eq(profiles.roleId, roles.id)).where(eq(roles.slug, "mentor")),
    db.select({ value: count() }).from(coachingSessions),
    db
      .select({ value: count() })
      .from(coachingSessions)
      .where(and(eq(coachingSessions.status, "scheduled"), gte(coachingSessions.scheduledAt, new Date()))),
    db.select({ value: count() }).from(assignmentSubmissions).where(eq(assignmentSubmissions.status, "submitted")),
    db.select({ value: count() }).from(reflections),
  ]);

  return {
    students: Number(studentCount[0]?.value ?? 0),
    mentors: Number(mentorCount[0]?.value ?? 0),
    coachingSessions: Number(sessionCount[0]?.value ?? 0),
    upcomingSessions: Number(upcoming[0]?.value ?? 0),
    submissionsAwaitingReview: Number(submissionCount[0]?.value ?? 0),
    reflections: Number(reflectionCount[0]?.value ?? 0),
  };
}
