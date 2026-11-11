import { and, eq, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { coachingSessions, courseGroups, groupMembers, instrumentResults, instrumentSessions, liveSessions, mentorAssignments, profiles } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

export function canOverseeLearners(viewer: SessionUser | null) {
  return can(viewer, "academy.oversee") || can(viewer, "people.manage");
}

export function learnerReadable(profileId: AnyPgColumn, viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  if (canOverseeLearners(viewer)) return sql`true`;
  const faculty = can(viewer, "mentorship.view") || can(viewer, "mentorship.coach");
  return or(eq(profileId, viewer.profileId), faculty ? sql`exists (select 1 from ${mentorAssignments} as learner_access_assignment where learner_access_assignment.student_id = ${profileId} and learner_access_assignment.mentor_id = ${viewer.profileId} and learner_access_assignment.status = 'active')` : sql`false`)!;
}

export function instrumentReadable(viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  return and(learnerReadable(instrumentResults.profileId, viewer), or(
    eq(instrumentResults.profileId, viewer.profileId),
    sql`exists (select 1 from ${instrumentSessions} where ${instrumentSessions.id} = ${instrumentResults.sessionId} and ${instrumentSessions.profileId} = ${instrumentResults.profileId} and ${instrumentSessions.consentGiven} = true and ${instrumentSessions.sharedWithMentor} = true)`,
  ))!;
}

export function coachingReadable(viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  if (canOverseeLearners(viewer)) return sql`true`;
  return or(eq(coachingSessions.studentId, viewer.profileId), and(eq(coachingSessions.mentorId, viewer.profileId), learnerReadable(coachingSessions.studentId, viewer)))!;
}

export function liveManageable(viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  return canOverseeLearners(viewer) ? sql`true` : eq(liveSessions.hostId, viewer.profileId);
}

export function groupReviewable(viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  if (canOverseeLearners(viewer)) return sql`true`;
  if (!can(viewer, "mentorship.coach")) return sql`false`;
  return and(eq(courseGroups.mentorId, viewer.profileId), sql`not exists (select 1 from ${groupMembers} where ${groupMembers.groupId} = ${courseGroups.id} and not (${learnerReadable(groupMembers.profileId, viewer)}))`)!;
}

export async function canReadLearner(profileId: string, viewer: SessionUser | null) {
  if (!viewer || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(profileId)) return false;
  const rows = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), learnerReadable(profiles.id, viewer))).limit(1);
  return Boolean(rows[0]);
}

export async function canCoachLearner(profileId: string, viewer: SessionUser | null) {
  if (!viewer || (!can(viewer, "mentorship.coach") && !canOverseeLearners(viewer))) return false;
  return canReadLearner(profileId, viewer);
}
