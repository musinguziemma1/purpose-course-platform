import { and, eq, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { assessments, cohortMembers, cohorts, courseModules, courses, enrollments, lessonProgress, lessons, liveSessions } from "@/db/schema";
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

/** Uses the same stable module/lesson order as the course outline. */
export function lessonAccessible(viewer: SessionUser | null, options: { write?: boolean } = {}) {
  if (!viewer || !can(viewer, options.write ? "learning.submit" : "learning.access")) return sql`false`;
  const enrollment = levelEnrolled(courses.levelId, viewer);
  return and(eq(courses.status, "published"), eq(lessons.status, "published"),
    options.write ? enrollment : or(eq(lessons.isPreview, true), enrollment),
    or(eq(courses.isSequential, false), eq(lessons.isPreview, true), sql`not exists (
      select 1 from lessons as required_lesson
      inner join course_modules as required_module on required_module.id = required_lesson.module_id
      where required_module.course_id = ${courses.id} and required_lesson.status = 'published'
        and (required_module.sort_order, required_module.id, required_lesson.sort_order, required_lesson.id)
          < (${courseModules.sortOrder}, ${courseModules.id}, ${lessons.sortOrder}, ${lessons.id})
        and not exists (select 1 from ${lessonProgress} as required_progress
          where required_progress.profile_id = ${viewer.profileId} and required_progress.lesson_id = required_lesson.id
            and required_progress.status = 'completed'))`),
  )!;
}

export function assessmentReadable(viewer: SessionUser | null) {
  if (!viewer || !can(viewer, "learning.submit")) return sql`false`;
  return and(eq(assessments.status, "published"), levelEnrolled(assessments.levelId, viewer),
    sql`(${assessments.courseId} is null or exists (select 1 from ${courses}
      where ${courses.id} = ${assessments.courseId} and ${courses.status} = 'published' and ${courses.levelId} = ${assessments.levelId}))`,
    sql`(${assessments.moduleId} is null or exists (select 1 from ${courseModules}
      where ${courseModules.id} = ${assessments.moduleId} and ${courseModules.courseId} = ${assessments.courseId}))`)!;
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
