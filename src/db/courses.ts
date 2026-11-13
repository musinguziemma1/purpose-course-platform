import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courseLevels,
  courseModules,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  liveMessages,
  liveRsvps,
  liveSessions,
  profiles,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { lessonAccessible, liveReadable } from "@/db/learning-access";
import { can } from "@/lib/rbac";

export type LessonRow = typeof lessons.$inferSelect;
export type ModuleRow = typeof courseModules.$inferSelect & { lessons: LessonRow[] };
export type CourseRow = typeof courses.$inferSelect & {
  levelName: string;
  levelSlug: string;
  levelAccent: string;
  levelNumber: number;
  modules: ModuleRow[];
};

export type FlatLesson = LessonRow & { moduleId: number; moduleTitle: string; moduleSort: number; position: number };

/** Orders every published lesson in a course into a single progression sequence. */
export function flattenCourse(course: CourseRow): FlatLesson[] {
  const flat: FlatLesson[] = [];
  [...course.modules]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .forEach((module) => {
      [...module.lessons]
        .filter((lesson) => lesson.status === "published")
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .forEach((lesson) => {
          flat.push({
            ...lesson,
            moduleId: module.id,
            moduleTitle: module.title,
            moduleSort: module.sortOrder,
            position: flat.length + 1,
          });
        });
    });
  return flat;
}

export async function getAcademyTree(options: { includeDrafts?: boolean } = {}): Promise<CourseRow[]> {
  const { includeDrafts = false } = options;
  const courseRows = await db
    .select({
      course: courses,
      levelName: courseLevels.name,
      levelSlug: courseLevels.slug,
      levelAccent: courseLevels.accent,
      levelNumber: courseLevels.levelNumber,
    })
    .from(courses)
    .innerJoin(courseLevels, eq(courses.levelId, courseLevels.id))
    .where(includeDrafts ? undefined : eq(courses.status, "published"))
    .orderBy(asc(courseLevels.sortOrder), asc(courses.sortOrder));

  if (courseRows.length === 0) return [];

  const courseIds = courseRows.map((row) => row.course.id);
  const [moduleRows, lessonRows] = await Promise.all([
    db.select().from(courseModules).where(inArray(courseModules.courseId, courseIds)).orderBy(asc(courseModules.sortOrder)),
    db
      .select({ lesson: lessons, moduleId: courseModules.id })
      .from(lessons)
      .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
      .where(inArray(courseModules.courseId, courseIds))
      .orderBy(asc(lessons.sortOrder)),
  ]);

  return courseRows.map((row) => ({
    ...row.course,
    levelName: row.levelName,
    levelSlug: row.levelSlug,
    levelAccent: row.levelAccent,
    levelNumber: row.levelNumber,
    modules: moduleRows
      .filter((module) => module.courseId === row.course.id)
      .map((module) => ({
        ...module,
        lessons: lessonRows
          .filter((lesson) => lesson.moduleId === module.id)
          .map((lesson) => lesson.lesson)
          .filter((lesson) => includeDrafts || lesson.status === "published"),
      })),
  }));
}

export type LessonCompletion = "not_started" | "in_progress" | "completed";

export type ProgressionLesson = Omit<FlatLesson, "status"> & {
  publishState: FlatLesson["status"];
  unlocked: boolean;
  completion: LessonCompletion;
  isNext: boolean;
};

export function buildProgression(course: CourseRow, completedIds: Set<number>): ProgressionLesson[] {
  const flat = flattenCourse(course);
  let previousComplete = true;
  return flat.map((lesson) => {
    const completed = completedIds.has(lesson.id);
    const unlocked = course.isSequential ? lesson.isPreview || previousComplete : true;
    if (!completed) previousComplete = false;
    return {
      ...lesson,
      publishState: lesson.status,
      unlocked,
      completion: (completed ? "completed" : "not_started") as LessonCompletion,
      isNext: false,
    };
  });
}

export async function getStudentAcademy(profileId: string) {
  const viewer = await getSessionUser();
  if (viewer?.profileId !== profileId || !can(viewer, "learning.access")) throw new Error("Learner access required.");
  const [tree, progressRows, enrollmentRows] = await Promise.all([
    getAcademyTree(),
    db.select().from(lessonProgress).where(eq(lessonProgress.profileId, profileId)),
    db
      .select({ levelId: enrollments.levelId, cohort: enrollments.cohort, status: enrollments.status })
      .from(enrollments)
      .where(and(eq(enrollments.profileId, profileId), inArray(enrollments.status, ["enrolled", "completed"])))
      .orderBy(desc(enrollments.createdAt)),
  ]);

  const statusById = new Map(progressRows.map((row) => [row.lessonId, row.status]));
  const completedIds = new Set(progressRows.filter((row) => row.status === "completed").map((row) => row.lessonId));
  const inProgressIds = new Set(progressRows.filter((row) => row.status === "in_progress").map((row) => row.lessonId));

  const coursesWithProgression = tree.map((course) => {
    const enrolled = enrollmentRows.some((enrollment) => enrollment.levelId === course.levelId);
    const progression = buildProgression(course, completedIds).map((lesson, index, all) => {
      const previous = all[index - 1];
      return {
        ...lesson,
        unlocked: lesson.unlocked && (enrolled || lesson.isPreview),
        completion: (statusById.get(lesson.id) ??
          (completedIds.has(lesson.id) ? "completed" : "not_started")) as LessonCompletion,
        isNext:
          enrolled && lesson.unlocked &&
          !completedIds.has(lesson.id) &&
          (!previous || completedIds.has(previous.id)),
      };
    });
    const total = progression.length;
    const completed = progression.filter((lesson) => lesson.completion === "completed").length;
    const next =
      progression.find((lesson) => lesson.isNext) ??
      progression.find((lesson) => lesson.unlocked && lesson.completion !== "completed") ??
      null;
    return {
      ...course,
      enrolled,
      progression,
      total,
      completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
      nextLesson: next,
    };
  });

  return {
    courses: coursesWithProgression,
    totalLessons: coursesWithProgression.filter((course) => course.enrolled).reduce((sum, course) => sum + course.total, 0),
    completedLessons: coursesWithProgression.filter((course) => course.enrolled).reduce((sum, course) => sum + course.completed, 0),
    inProgressCount: inProgressIds.size,
    enrollment: enrollmentRows[0] ?? null,
  };
}

export async function getCourseForStudent(profileId: string, slug: string) {
  const academy = await getStudentAcademy(profileId);
  const course = academy.courses.find((item) => item.slug === slug);
  if (!course) return null;
  return { course, academy };
}

export async function getLessonContext(profileId: string, courseSlug: string, lessonId: number) {
  const course = (await getStudentAcademy(profileId)).courses.find((item) => item.slug === courseSlug);
  if (!course) return null;

  const progression = course.progression;
  const index = progression.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) return null;

  const current = progression[index];
  if (!current.unlocked) {
    return { course, progression, current, locked: true as const, index };
  }

  const previous = index > 0 ? progression[index - 1] : null;
  const next = index < progression.length - 1 ? progression[index + 1] : null;
  return { course, progression, current, locked: false as const, index, previous, next, canComplete: course.enrolled };
}

export async function recordLessonView(profileId: string, lessonId: number) {
  const viewer = await getSessionUser();
  if (!viewer || viewer.profileId !== profileId) return;
  const [allowed] = await db.select({ id: lessons.id }).from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id)).innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(lessons.id, lessonId), lessonAccessible(viewer, { write: true }))).limit(1);
  if (!allowed) return;
  await db
    .insert(lessonProgress)
    .values({ profileId, lessonId, status: "in_progress", updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [lessonProgress.profileId, lessonProgress.lessonId],
      set: { status: sql`case when ${lessonProgress.status} = 'completed' then 'completed' else 'in_progress' end`, updatedAt: new Date() },
    });
}

/* ------------------------------------------------------------------ *
 * Live sessions & live feed
 * ------------------------------------------------------------------ */

export async function getLiveSessions(options: { limit?: number; profileId?: string } = {}) {
  const viewer = await getSessionUser();
  const { limit = 20 } = options;
  const profileId = viewer?.profileId;
  const rows = await db
    .select({
      session: liveSessions,
      hostName: profiles.fullName,
      hostTitle: profiles.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      attending: sql<number>`(select count(*) from ${liveRsvps} where ${liveRsvps.liveSessionId} = ${liveSessions.id} and ${liveRsvps.status} = 'going')::int`,
      messageCount: sql<number>`(select count(*) from ${liveMessages} where ${liveMessages.liveSessionId} = ${liveSessions.id})::int`,
      myRsvp: profileId
        ? sql<string | null>`(select ${liveRsvps.status} from ${liveRsvps} where ${liveRsvps.liveSessionId} = ${liveSessions.id} and ${liveRsvps.profileId} = ${profileId} limit 1)`
        : sql<string | null>`null`,
    })
    .from(liveSessions)
    .leftJoin(profiles, eq(liveSessions.hostId, profiles.id))
    .leftJoin(courses, eq(liveSessions.courseId, courses.id))
    .where(liveReadable(viewer))
    .orderBy(sql`case when ${liveSessions.status}='live' then 0 when ${liveSessions.status}='scheduled' and ${liveSessions.startsAt}+make_interval(mins => ${liveSessions.durationMinutes})>=now() then 1 else 2 end`, asc(liveSessions.startsAt))
    .limit(limit);
  return rows;
}

export async function getLiveSessionRoom(id: number) {
  const viewer = await getSessionUser();
  const rows = await db
    .select({
      session: liveSessions,
      hostName: profiles.fullName,
      hostTitle: profiles.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(liveSessions)
    .leftJoin(profiles, eq(liveSessions.hostId, profiles.id))
    .leftJoin(courses, eq(liveSessions.courseId, courses.id))
    .where(and(eq(liveSessions.id, id), liveReadable(viewer)))
    .limit(1);
  const record = rows[0];
  if (!record) return null;

  const [messages, attendees] = await Promise.all([
    db.select().from(liveMessages).where(eq(liveMessages.liveSessionId, id)).orderBy(asc(liveMessages.createdAt)).limit(200),
    db
      .select({ name: profiles.fullName, title: profiles.title, status: liveRsvps.status })
      .from(liveRsvps)
      .innerJoin(profiles, eq(liveRsvps.profileId, profiles.id))
      .where(eq(liveRsvps.liveSessionId, id)),
  ]);

  return { ...record, messages, attendees };
}

export async function getMentorLiveSessions(mentorId: string) {
  return db
    .select({ session: liveSessions, messageCount: sql<number>`(select count(*) from ${liveMessages} where ${liveMessages.liveSessionId} = ${liveSessions.id})::int` })
    .from(liveSessions)
    .where(eq(liveSessions.hostId, mentorId))
    .orderBy(desc(liveSessions.startsAt))
    .limit(12);
}

export async function getAcademyAdminStats() {
  const [levelCount, courseCount, moduleCount, lessonCount, liveCount] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(courseLevels),
    db.select({ value: sql<number>`count(*)::int` }).from(courses),
    db.select({ value: sql<number>`count(*)::int` }).from(courseModules),
    db.select({ value: sql<number>`count(*)::int` }).from(lessons),
    db.select({ value: sql<number>`count(*)::int` }).from(liveSessions),
  ]);
  return {
    levels: Number(levelCount[0]?.value ?? 0),
    courses: Number(courseCount[0]?.value ?? 0),
    modules: Number(moduleCount[0]?.value ?? 0),
    lessons: Number(lessonCount[0]?.value ?? 0),
    liveSessions: Number(liveCount[0]?.value ?? 0),
  };
}

export async function getLessonMediaCounts() {
  const rows = await db
    .select({
      video: sql<number>`count(*) filter (where ${lessons.videoUrl} is not null)::int`,
      audio: sql<number>`count(*) filter (where ${lessons.audioUrl} is not null)::int`,
      image: sql<number>`count(*) filter (where ${lessons.imageUrl} is not null)::int`,
      download: sql<number>`count(*) filter (where ${lessons.downloadUrl} is not null)::int`,
    })
    .from(lessons);
  return rows[0] ?? { video: 0, audio: 0, image: 0, download: 0 };
}

