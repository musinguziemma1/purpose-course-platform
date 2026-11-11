import { and, eq, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { cohortMembers, cohorts, courses, enrollments, liveSessions } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOverseeLearners } from "@/db/learner-access";

/** Completed enrolments retain read access; paused/waitlisted records do not. */
export function levelEnrolled(levelId: AnyPgColumn, viewer: SessionUser | null) {
  if (!viewer || !can(viewer, "learning.access")) return sql`false`;
  return sql`exists (select 1 from ${enrollments} as access_enrollment
    where access_enrollment.profile_id = ${viewer.profileId}
      and access_enrollment.level_id = ${levelId}
      and access_enrollment.status in ('enrolled', 'completed'))`;
}

export function liveHost(viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  return canOverseeLearners(viewer) ? sql`true` : eq(liveSessions.hostId, viewer.profileId);
}

export function cohortReadable(viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  if (canOverseeLearners(viewer)) return sql`true`;
  return and(sql`${cohorts.status} in ('active', 'completed')`, sql`exists (
    select 1 from ${cohortMembers} where ${cohortMembers.cohortId} = ${cohorts.id}
      and ${cohortMembers.profileId} = ${viewer.profileId} and ${cohortMembers.status} = 'active')`)!;
}

/** A room link never substitutes for course enrolment or cohort membership. */
export function liveReadable(viewer: SessionUser | null) {
  if (!viewer) return sql`false`;
  return or(liveHost(viewer), and(
    can(viewer, "learning.access") ? sql`true` : sql`false`,
    sql`${liveSessions.status} <> 'cancelled'`,
    sql`(${liveSessions.courseId} is null or exists (
      select 1 from ${courses} where ${courses.id} = ${liveSessions.courseId}
        and ${courses.status} = 'published' and ${levelEnrolled(courses.levelId, viewer)}))`,
    sql`(${liveSessions.cohortId} is null or exists (
      select 1 from ${cohortMembers} inner join ${cohorts} on ${cohorts.id} = ${cohortMembers.cohortId}
      where ${cohortMembers.cohortId} = ${liveSessions.cohortId}
        and ${cohortMembers.profileId} = ${viewer.profileId} and ${cohortMembers.status} = 'active'
        and ${cohorts.status} in ('active', 'completed')))`),
  )!;
}
