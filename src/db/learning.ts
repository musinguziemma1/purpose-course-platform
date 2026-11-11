import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cohortMembers,
  cohortWeeks,
  cohorts,
  communities,
  communityMembers,
  contentReports,
  courseLevels,
  courses,
  discussionPosts,
  discussionThreads,
  instrumentResults,
  instruments,
  learnerFlags,
  learnerGoals,
  liveSessions,
  mentorAssignments,
  mentoringNotes,
  notificationOutbox,
  orgMemberships,
  organizations,
  profiles,
  reactions,
  roles,
  sessionAttendance,
} from "@/db/schema";

/* ------------------------------------------------------------------ *
 * Mentorship
 * ------------------------------------------------------------------ */

export async function getLearnerGoals(studentId: string) {
  return db
    .select({ goal: learnerGoals, mentorName: profiles.fullName })
    .from(learnerGoals)
    .leftJoin(profiles, eq(learnerGoals.mentorId, profiles.id))
    .where(eq(learnerGoals.studentId, studentId))
    .orderBy(asc(learnerGoals.status), asc(learnerGoals.dueAt));
}

export async function getMentoringNotes(studentId: string) {
  return db
    .select({ note: mentoringNotes, mentorName: profiles.fullName })
    .from(mentoringNotes)
    .innerJoin(profiles, eq(mentoringNotes.mentorId, profiles.id))
    .where(and(eq(mentoringNotes.studentId, studentId), eq(mentoringNotes.visibility, "shared")))
    .orderBy(desc(mentoringNotes.createdAt))
    .limit(12);
}

export async function getLearnerFlags(studentId?: string) {
  const conditions = [eq(learnerFlags.status, "open")];
  if (studentId) conditions.push(eq(learnerFlags.studentId, studentId));
  return db
    .select({
      flag: learnerFlags,
      studentName: profiles.fullName,
      mentorName: sql<string | null>`(select full_name from ${profiles} p where p.id = ${learnerFlags.mentorId})`,
    })
    .from(learnerFlags)
    .innerJoin(profiles, eq(learnerFlags.studentId, profiles.id))
    .where(and(...conditions))
    .orderBy(desc(learnerFlags.createdAt))
    .limit(30);
}

export async function getMentorRoster(mentorId: string) {
  const assignments = await db
    .select({
      studentId: mentorAssignments.studentId,
      fullName: profiles.fullName,
      title: profiles.title,
      status: mentorAssignments.status,
      focus: mentorAssignments.focus,
      assignedAt: mentorAssignments.createdAt,
    })
    .from(mentorAssignments)
    .innerJoin(profiles, eq(mentorAssignments.studentId, profiles.id))
    .where(eq(mentorAssignments.mentorId, mentorId))
    .orderBy(asc(profiles.fullName));

  const ids = assignments.map((row) => row.studentId);
  if (ids.length === 0) return [];

  const [goals, flags, notes, results, attendance] = await Promise.all([
    db.select().from(learnerGoals).where(inArray(learnerGoals.studentId, ids)),
    db.select().from(learnerFlags).where(inArray(learnerFlags.studentId, ids)),
    db.select().from(mentoringNotes).where(inArray(mentoringNotes.studentId, ids)),
    db.select().from(instrumentResults).where(inArray(instrumentResults.profileId, ids)),
    db.select().from(sessionAttendance).where(inArray(sessionAttendance.profileId, ids)),
  ]);

  return assignments.map((student) => {
    const studentGoals = goals.filter((goal) => goal.studentId === student.studentId);
    const studentFlags = flags.filter((flag) => flag.studentId === student.studentId && flag.status === "open");
    const studentResults = results.filter((result) => result.profileId === student.studentId);
    const studentAttendance = attendance.filter((row) => row.profileId === student.studentId);
    const averageInstrument = studentResults.length
      ? Math.round(studentResults.reduce((sum, result) => sum + result.overallScore, 0) / studentResults.length)
      : null;
    return {
      ...student,
      goals: studentGoals,
      activeGoals: studentGoals.filter((goal) => goal.status === "active").length,
      achievedGoals: studentGoals.filter((goal) => goal.status === "achieved").length,
      flags: studentFlags,
      noteCount: notes.filter((note) => note.studentId === student.studentId).length,
      instrumentResults: studentResults.length,
      averageInstrument,
      attendancePresent: studentAttendance.filter((row) => row.status === "present").length,
      attendanceTotal: studentAttendance.length,
    };
  });
}

export async function getMentors() {
  return db
    .select({ id: profiles.id, fullName: profiles.fullName, title: profiles.title })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(inArray(roles.slug, ["mentor", "instructor", "super_admin", "platform_admin"]))
    .orderBy(asc(profiles.fullName));
}

/* ------------------------------------------------------------------ *
 * Purpose Communities
 * ------------------------------------------------------------------ */

export async function getCommunities(profileId?: string) {
  const rows = await db
    .select({
      community: communities,
      threadCount: sql<number>`(select count(*) from ${discussionThreads} where ${discussionThreads.communityId} = ${communities.id})::int`,
      memberCount: sql<number>`(select count(*) from ${communityMembers} where ${communityMembers.communityId} = ${communities.id})::int`,
      joined: profileId
        ? sql<boolean>`exists (select 1 from ${communityMembers} where ${communityMembers.communityId} = ${communities.id} and ${communityMembers.profileId} = ${profileId})`
        : sql<boolean>`false`,
    })
    .from(communities)
    .where(eq(communities.isArchived, false))
    .orderBy(asc(communities.sortOrder));
  return rows;
}

export async function getCommunity(slug: string, profileId?: string) {
  const rows = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
  const community = rows[0];
  if (!community) return null;

  const threads = await db
    .select({
      thread: discussionThreads,
      reactionCount: sql<number>`(select count(*) from ${reactions} where ${reactions.targetType} = 'thread' and ${reactions.targetId} = ${discussionThreads.id})::int`,
      lastPostAt: sql<Date | null>`(select max(${discussionPosts.createdAt}) from ${discussionPosts} where ${discussionPosts.threadId} = ${discussionThreads.id})`,
    })
    .from(discussionThreads)
    .where(and(eq(discussionThreads.communityId, community.id), eq(discussionThreads.isRemoved, false)))
    .orderBy(desc(discussionThreads.isPinned), desc(discussionThreads.lastActivityAt))
    .limit(30);

  const memberRows = await db
    .select({ fullName: profiles.fullName, title: profiles.title, role: communityMembers.role })
    .from(communityMembers)
    .innerJoin(profiles, eq(communityMembers.profileId, profiles.id))
    .where(eq(communityMembers.communityId, community.id))
    .limit(12);

  const joined = profileId
    ? Boolean(
        (
          await db
            .select({ id: communityMembers.id })
            .from(communityMembers)
            .where(and(eq(communityMembers.communityId, community.id), eq(communityMembers.profileId, profileId)))
            .limit(1)
        )[0],
      )
    : false;

  return { community, threads, members: memberRows, joined };
}

export async function getThread(threadId: number, profileId?: string) {
  const rows = await db
    .select({
      thread: discussionThreads,
      communityName: communities.name,
      communitySlug: communities.slug,
      reactionCount: sql<number>`(select count(*) from ${reactions} where ${reactions.targetType} = 'thread' and ${reactions.targetId} = ${discussionThreads.id})::int`,
      reacted: profileId
        ? sql<boolean>`exists (select 1 from ${reactions} where ${reactions.targetType} = 'thread' and ${reactions.targetId} = ${discussionThreads.id} and ${reactions.profileId} = ${profileId})`
        : sql<boolean>`false`,
    })
    .from(discussionThreads)
    .leftJoin(communities, eq(discussionThreads.communityId, communities.id))
    .where(eq(discussionThreads.id, threadId))
    .limit(1);
  if (!rows[0]) return null;

  const posts = await db
    .select({
      post: discussionPosts,
      reactionCount: sql<number>`(select count(*) from ${reactions} where ${reactions.targetType} = 'post' and ${reactions.targetId} = ${discussionPosts.id})::int`,
    })
    .from(discussionPosts)
    .where(and(eq(discussionPosts.threadId, threadId), eq(discussionPosts.isRemoved, false)))
    .orderBy(asc(discussionPosts.createdAt));

  return { ...rows[0], posts };
}

export async function getOpenReports() {
  return db
    .select({
      report: contentReports,
      reporterName: profiles.fullName,
      reporterSlug: profiles.slug,
    })
    .from(contentReports)
    .leftJoin(profiles, eq(contentReports.reporterId, profiles.id))
    .orderBy(desc(contentReports.createdAt))
    .limit(40);
}

export async function getCommunityStats() {
  const [communityCount, threadCount, reportCount, reactionCount] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(communities),
    db.select({ value: sql<number>`count(*)::int` }).from(discussionThreads),
    db.select({ value: sql<number>`count(*)::int` }).from(contentReports).where(eq(contentReports.status, "open")),
    db.select({ value: sql<number>`count(*)::int` }).from(reactions),
  ]);
  return {
    communities: Number(communityCount[0]?.value ?? 0),
    threads: Number(threadCount[0]?.value ?? 0),
    openReports: Number(reportCount[0]?.value ?? 0),
    reactions: Number(reactionCount[0]?.value ?? 0),
  };
}

/* ------------------------------------------------------------------ *
 * Cohorts & attendance
 * ------------------------------------------------------------------ */

export async function getCohorts() {
  return db
    .select({
      cohort: cohorts,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      learnerCount: sql<number>`(select count(*) from ${cohortMembers} where ${cohortMembers.cohortId} = ${cohorts.id} and ${cohortMembers.role} = 'learner')::int`,
      mentorCount: sql<number>`(select count(*) from ${cohortMembers} where ${cohortMembers.cohortId} = ${cohorts.id} and ${cohortMembers.role} <> 'learner')::int`,
      weekCount: sql<number>`(select count(*) from ${cohortWeeks} where ${cohortWeeks.cohortId} = ${cohorts.id})::int`,
    })
    .from(cohorts)
    .leftJoin(courseLevels, eq(cohorts.levelId, courseLevels.id))
    .leftJoin(courses, eq(cohorts.courseId, courses.id))
    .orderBy(desc(cohorts.startsAt));
}

export async function getCohort(slug: string) {
  const rows = await db
    .select({
      cohort: cohorts,
      levelName: courseLevels.name,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(cohorts)
    .leftJoin(courseLevels, eq(cohorts.levelId, courseLevels.id))
    .leftJoin(courses, eq(cohorts.courseId, courses.id))
    .where(eq(cohorts.slug, slug))
    .limit(1);
  const record = rows[0];
  if (!record) return null;

  const [members, weeks, sessions] = await Promise.all([
    db
      .select({
        member: cohortMembers,
        profileId: profiles.id,
        fullName: profiles.fullName,
        title: profiles.title,
      })
      .from(cohortMembers)
      .innerJoin(profiles, eq(cohortMembers.profileId, profiles.id))
      .where(eq(cohortMembers.cohortId, record.cohort.id))
      .orderBy(asc(cohortMembers.role), asc(profiles.fullName)),
    db
      .select()
      .from(cohortWeeks)
      .where(eq(cohortWeeks.cohortId, record.cohort.id))
      .orderBy(asc(cohortWeeks.weekNumber)),
    db
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.cohortId, record.cohort.id))
      .orderBy(asc(liveSessions.startsAt)),
  ]);

  return { ...record, members, weeks, sessions };
}

export async function getCohortForProfile(profileId: string) {
  const rows = await db
    .select({ slug: cohorts.slug, name: cohorts.name, role: cohortMembers.role, status: cohortMembers.status })
    .from(cohortMembers)
    .innerJoin(cohorts, eq(cohortMembers.cohortId, cohorts.id))
    .where(eq(cohortMembers.profileId, profileId))
    .orderBy(desc(cohorts.startsAt))
    .limit(1);
  if (!rows[0]) return null;
  return getCohort(rows[0].slug);
}

export async function getUpcomingCohortSessions(cohortId: number) {
  return db
    .select()
    .from(liveSessions)
    .where(and(eq(liveSessions.cohortId, cohortId), gte(liveSessions.startsAt, new Date())))
    .orderBy(asc(liveSessions.startsAt))
    .limit(8);
}

export async function getAttendanceForSession(sessionId: number) {
  return db
    .select({
      attendance: sessionAttendance,
      fullName: profiles.fullName,
    })
    .from(sessionAttendance)
    .innerJoin(profiles, eq(sessionAttendance.profileId, profiles.id))
    .where(eq(sessionAttendance.liveSessionId, sessionId))
    .orderBy(asc(profiles.fullName));
}

export async function getAttendanceForProfile(profileId: string) {
  return db
    .select({
      attendance: sessionAttendance,
      sessionTitle: liveSessions.title,
      startsAt: liveSessions.startsAt,
    })
    .from(sessionAttendance)
    .innerJoin(liveSessions, eq(sessionAttendance.liveSessionId, liveSessions.id))
    .where(eq(sessionAttendance.profileId, profileId))
    .orderBy(desc(liveSessions.startsAt))
    .limit(12);
}

export async function getSessionsForAttendance() {
  return db
    .select({
      session: liveSessions,
      marked: sql<number>`(select count(*) from ${sessionAttendance} where ${sessionAttendance.liveSessionId} = ${liveSessions.id})::int`,
      cohortName: sql<string | null>`(select name from ${cohorts} c where c.id = ${liveSessions.cohortId})`,
    })
    .from(liveSessions)
    .orderBy(desc(liveSessions.startsAt))
    .limit(20);
}

/* ------------------------------------------------------------------ *
 * RBAC administration
 * ------------------------------------------------------------------ */

export async function getOrganizations() {
  return db
    .select({
      organization: organizations,
      memberCount: sql<number>`(select count(*) from ${orgMemberships} where ${orgMemberships.organizationId} = ${organizations.id})::int`,
    })
    .from(organizations)
    .orderBy(asc(organizations.name));
}

export async function getRoleMatrix() {
  const roleRows = await db.select().from(roles).orderBy(desc(roles.level));
  const counts = await db
    .select({ roleId: profiles.roleId, value: sql<number>`count(*)::int` })
    .from(profiles)
    .groupBy(profiles.roleId);
  const countByRole = new Map(counts.map((row) => [row.roleId, Number(row.value)]));
  return roleRows.map((role) => ({ ...role, members: countByRole.get(role.id) ?? 0 }));
}

export async function getOutboxWithNames(limit = 40) {
  return db
    .select({ outbox: notificationOutbox, recipient: profiles.fullName })
    .from(notificationOutbox)
    .leftJoin(profiles, eq(notificationOutbox.profileId, profiles.id))
    .orderBy(desc(notificationOutbox.createdAt))
    .limit(limit);
}

export async function getInstrumentResultsOverview() {
  return db
    .select({
      result: instrumentResults,
      instrumentTitle: instruments.title,
      instrumentSlug: instruments.slug,
      version: instruments.version,
      studentName: profiles.fullName,
      shared: sql<boolean>`true`,
    })
    .from(instrumentResults)
    .innerJoin(instruments, eq(instrumentResults.instrumentId, instruments.id))
    .innerJoin(profiles, eq(instrumentResults.profileId, profiles.id))
    .orderBy(desc(instrumentResults.createdAt))
    .limit(40);
}

export async function countPendingMentorWork(mentorId: string) {
  const [flags, goals] = await Promise.all([
    db.select({ value: count() }).from(learnerFlags).where(eq(learnerFlags.status, "open")),
    db
      .select({ value: count() })
      .from(learnerGoals)
      .where(and(eq(learnerGoals.mentorId, mentorId), eq(learnerGoals.status, "active"))),
  ]);
  return { openFlags: Number(flags[0]?.value ?? 0), activeGoals: Number(goals[0]?.value ?? 0) };
}

