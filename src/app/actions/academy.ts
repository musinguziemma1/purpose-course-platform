"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  courseLevels,
  courseModules,
  courses,
  enrollments,
  lessons,
  liveMessages,
  liveSessions,
  profiles,
} from "@/db/schema";
import { canAuthorAcademy, getSessionUser, isMentor, isStudent } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { liveHost, liveReadable } from "@/db/learning-access";
import { canOverseeLearners } from "@/db/learner-access";
import { changeLessonCompletion } from "@/db/lesson-progress";

export type AcademyState = { ok?: boolean; error?: string; message?: string };

const KINDS = ["video", "audio", "reading", "illustration", "download", "practice", "live"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullable(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

function slugBase(value: string, fallback: string) {
  return slugify(value) || fallback;
}

async function log(actorId: string | undefined, action: string, description: string, entityId?: string) {
  await db.insert(activityLogs).values({
    actorId: actorId ?? null,
    action,
    entityType: "academy",
    entityId: entityId ?? null,
    description,
  });
}

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !canAuthorAcademy(user)) return null;
  return user;
}

function refreshAcademy(courseId?: number) {
  revalidatePath("/admin/academy");
  revalidatePath("/admin/academy/live");
  if (courseId) revalidatePath(`/admin/academy/courses/${courseId}`);
  revalidatePath("/learn");
  revalidatePath("/learn/courses");
  revalidatePath("/learn/live");
  revalidatePath("/course");
}

/* ------------------------------------------------------------------ *
 * Levels
 * ------------------------------------------------------------------ */

export async function createLevel(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Administrator access required." };

  const name = text(formData, "name");
  const tagline = text(formData, "tagline");
  const description = text(formData, "description");
  if (name.length < 3) return { error: "Give the level a name." };
  if (tagline.length < 3) return { error: "Add a short tagline." };
  if (description.length < 30) return { error: "Add a description of at least 30 characters." };

  const [orderRow] = await db.select({ value: max(courseLevels.sortOrder) }).from(courseLevels);
  const slug = slugBase(name, `level-${Date.now()}`);

  try {
    await db.insert(courseLevels).values({
      slug,
      name,
      tagline,
      description,
      levelNumber: Number(formData.get("levelNumber") ?? 0) || (Number(orderRow?.value ?? 0) + 1),
      weeks: Number(formData.get("weeks") ?? 5) || 5,
      accent: text(formData, "accent") || "navy",
      icon: text(formData, "icon") || "sprout",
      imageUrl: nullable(formData, "imageUrl"),
      outcomes: text(formData, "outcomes")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8),
      sortOrder: Number(orderRow?.value ?? 0) + 1,
    });
  } catch {
    return { error: "A level with that name already exists." };
  }

  await log(admin.profileId, "academy.level_created", `Created the ${name} level.`);
  refreshAcademy();
  return { ok: true, message: `${name} level created. Add its first course below.` };
}

/* ------------------------------------------------------------------ *
 * Courses
 * ------------------------------------------------------------------ */

export async function createCourse(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Administrator access required." };

  const title = text(formData, "title");
  const summary = text(formData, "summary");
  const levelId = Number(formData.get("levelId"));
  if (!levelId) return { error: "Choose a level for this course." };
  if (title.length < 4) return { error: "Give the course a title." };
  if (summary.length < 20) return { error: "Add a summary of at least 20 characters." };

  const [orderRow] = await db
    .select({ value: max(courses.sortOrder) })
    .from(courses)
    .where(eq(courses.levelId, levelId));

  const inserted = await db
    .insert(courses)
    .values({
      levelId,
      slug: slugBase(title, `course-${Date.now()}`),
      title,
      subtitle: nullable(formData, "subtitle"),
      summary,
      description: nullable(formData, "description"),
      coverImageUrl: nullable(formData, "coverImageUrl"),
      accent: text(formData, "accent") || "navy",
      estimatedHours: Number(formData.get("estimatedHours") ?? 4) || 4,
      status: "draft",
      isSequential: formData.get("isSequential") === "on",
      sortOrder: Number(orderRow?.value ?? 0) + 1,
    })
    .returning({ id: courses.id });

  await log(admin.profileId, "academy.course_created", `Created the course “${title}”.`, String(inserted[0].id));
  refreshAcademy();
  redirect(`/admin/academy/courses/${inserted[0].id}`);
}

export async function updateCourse(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Administrator access required." };

  const courseId = Number(formData.get("courseId"));
  if (!courseId) return { error: "Missing course." };

  const status = text(formData, "status");
  const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!rows[0]) return { error: "Course not found." };

  await db
    .update(courses)
    .set({
      title: text(formData, "title") || rows[0].title,
      subtitle: nullable(formData, "subtitle"),
      summary: text(formData, "summary") || rows[0].summary,
      description: nullable(formData, "description"),
      coverImageUrl: nullable(formData, "coverImageUrl"),
      accent: text(formData, "accent") || rows[0].accent,
      estimatedHours: Number(formData.get("estimatedHours") ?? rows[0].estimatedHours) || rows[0].estimatedHours,
      isSequential: formData.get("isSequential") === "on",
      status: (STATUSES as readonly string[]).includes(status) ? (status as (typeof STATUSES)[number]) : rows[0].status,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));

  await log(
    admin.profileId,
    "academy.course_updated",
    `Updated “${text(formData, "title") || rows[0].title}” (${status || rows[0].status}).`,
    String(courseId),
  );
  refreshAcademy(courseId);
  return { ok: true, message: "Course saved." };
}

export async function deleteCourse(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const courseId = Number(formData.get("courseId"));
  if (!courseId) return;
  const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!rows[0]) return;
  await db.delete(courses).where(eq(courses.id, courseId));
  await log(admin.profileId, "academy.course_deleted", `Deleted the course “${rows[0].title}”.`);
  refreshAcademy();
  redirect("/admin/academy");
}

/* ------------------------------------------------------------------ *
 * Modules
 * ------------------------------------------------------------------ */

export async function createModule(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Administrator access required." };

  const courseId = Number(formData.get("courseId"));
  const title = text(formData, "title");
  if (!courseId) return { error: "Missing course." };
  if (title.length < 4) return { error: "Give the module a title." };

  const [orderRow] = await db.select({ value: max(courseModules.sortOrder) }).from(courseModules).where(eq(courseModules.courseId, courseId));

  try {
    await db.insert(courseModules).values({
      courseId,
      slug: slugBase(title, `module-${Date.now()}`),
      title,
      summary: nullable(formData, "summary"),
      sessionCode: nullable(formData, "sessionCode"),
      estimatedMinutes: Number(formData.get("estimatedMinutes") ?? 45) || 45,
      isPreview: formData.get("isPreview") === "on",
      sortOrder: Number(orderRow?.value ?? 0) + 1,
    });
  } catch {
    return { error: "A module with that name already exists in this course." };
  }

  await log(admin.profileId, "academy.module_created", `Added the module “${title}”.`, String(courseId));
  refreshAcademy(courseId);
  return { ok: true, message: `Module “${title}” added.` };
}

export async function updateModule(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Administrator access required." };

  const moduleId = Number(formData.get("moduleId"));
  const courseId = Number(formData.get("courseId"));
  if (!moduleId) return { error: "Missing module." };

  await db
    .update(courseModules)
    .set({
      title: text(formData, "title") || undefined,
      summary: nullable(formData, "summary"),
      sessionCode: nullable(formData, "sessionCode"),
      estimatedMinutes: Number(formData.get("estimatedMinutes") ?? 45) || 45,
      isPreview: formData.get("isPreview") === "on",
    })
    .where(eq(courseModules.id, moduleId));

  await log(admin.profileId, "academy.module_updated", `Updated module #${moduleId}.`, String(courseId));
  refreshAcademy(courseId);
  return { ok: true, message: "Module saved." };
}

export async function moveModule(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const moduleId = Number(formData.get("moduleId"));
  const direction = text(formData, "direction");
  const courseId = Number(formData.get("courseId"));
  if (!moduleId || !courseId) return;

  const rows = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(asc(courseModules.sortOrder));
  const index = rows.findIndex((row) => row.id === moduleId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  await db.update(courseModules).set({ sortOrder: rows[swapWith].sortOrder }).where(eq(courseModules.id, rows[index].id));
  await db.update(courseModules).set({ sortOrder: rows[index].sortOrder }).where(eq(courseModules.id, rows[swapWith].id));
  refreshAcademy(courseId);
}

export async function deleteModule(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const moduleId = Number(formData.get("moduleId"));
  const courseId = Number(formData.get("courseId"));
  if (!moduleId) return;
  await db.delete(courseModules).where(eq(courseModules.id, moduleId));
  await log(admin.profileId, "academy.module_deleted", `Deleted module #${moduleId}.`, String(courseId));
  refreshAcademy(courseId);
}

/* ------------------------------------------------------------------ *
 * Lessons (video, audio, illustration, download, reading, practice)
 * ------------------------------------------------------------------ */

export async function saveLesson(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Administrator access required." };

  const moduleId = Number(formData.get("moduleId"));
  const courseId = Number(formData.get("courseId"));
  const lessonId = Number(formData.get("lessonId") ?? 0);
  const title = text(formData, "title");
  const body = text(formData, "body");
  const kind = text(formData, "kind");
  const status = text(formData, "status");

  if (!moduleId) return { error: "Choose a module for this lesson." };
  if (title.length < 4) return { error: "Give the lesson a title." };
  if ((KINDS as readonly string[]).includes(kind) === false) return { error: "Choose a valid lesson format." };
  if (body.length < 40) return { error: "Write at least a short paragraph of structured content (40+ characters)." };

  const payload = {
    title,
    kind: kind as (typeof KINDS)[number],
    summary: nullable(formData, "summary"),
    body,
    videoUrl: nullable(formData, "videoUrl"),
    audioUrl: nullable(formData, "audioUrl"),
    imageUrl: nullable(formData, "imageUrl"),
    imageAlt: nullable(formData, "imageAlt"),
    downloadUrl: nullable(formData, "downloadUrl"),
    downloadLabel: nullable(formData, "downloadLabel"),
    transcript: nullable(formData, "transcript"),
    practicePrompt: nullable(formData, "practicePrompt"),
    durationMinutes: Number(formData.get("durationMinutes") ?? 10) || 10,
    isPreview: formData.get("isPreview") === "on",
    status: (STATUSES as readonly string[]).includes(status) ? (status as (typeof STATUSES)[number]) : "published",
  };

  if (lessonId) {
    await db.update(lessons).set(payload).where(eq(lessons.id, lessonId));
    await log(admin.profileId, "academy.lesson_updated", `Updated lesson “${title}”.`, String(courseId));
    refreshAcademy(courseId);
    return { ok: true, message: "Lesson saved." };
  }

  const [orderRow] = await db.select({ value: max(lessons.sortOrder) }).from(lessons).where(eq(lessons.moduleId, moduleId));

  try {
    await db.insert(lessons).values({
      ...payload,
      moduleId,
      slug: slugBase(title, `lesson-${Date.now()}`),
      sortOrder: Number(orderRow?.value ?? 0) + 1,
    });
  } catch {
    return { error: "A lesson with that title already exists in this module." };
  }

  await log(admin.profileId, "academy.lesson_created", `Added the lesson “${title}”.`, String(courseId));
  refreshAcademy(courseId);
  return { ok: true, message: `Lesson “${title}” published to the module.` };
}

export async function deleteLesson(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const lessonId = Number(formData.get("lessonId"));
  const courseId = Number(formData.get("courseId"));
  if (!lessonId) return;
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  await log(admin.profileId, "academy.lesson_deleted", `Deleted lesson #${lessonId}.`, String(courseId));
  refreshAcademy(courseId);
}

/* ------------------------------------------------------------------ *
 * Live sessions — classes, group work, discussions
 * ------------------------------------------------------------------ */

export async function saveLiveSession(previous: AcademyState, formData: FormData): Promise<AcademyState> {
  const { saveEvent } = await import("@/app/actions/live-events");
  return saveEvent(previous, formData);
}
export async function setLiveStatus(formData: FormData) {
  const { changeEventStatus } = await import("@/app/actions/live-events");
  await changeEventStatus({}, formData);
}

export async function saveRecording(_prev:AcademyState,formData:FormData):Promise<AcademyState>{
 const {attachEventRecording}=await import("@/db/live-events");
 const result=await attachEventRecording({id:Number(formData.get("sessionId")),version:text(formData,"version"),url:text(formData,"recordingUrl")},await getSessionUser());
 if("ok"in result&&result.ok){const {refreshLiveEvents}=await import("@/app/actions/live-events");await refreshLiveEvents();revalidatePath("/mentor/live/"+formData.get("sessionId"));}
 return result;
}

export async function deleteLiveSession(formData: FormData) {
  // Preserve the event and its attendance history; cancellation is announced.
  formData.set("status", "cancelled");
  const { changeEventStatus } = await import("@/app/actions/live-events");
  await changeEventStatus({}, formData);
}

/* ------------------------------------------------------------------ *
 * Student engagement — RSVP, live feed, lesson completion
 * ------------------------------------------------------------------ */

export async function toggleRsvp(formData: FormData) {
  const { setEventRsvp } = await import("@/db/live-events");
  await setEventRsvp(Number(formData.get("sessionId")), formData.get("going") !== "false", await getSessionUser());
  const { refreshLiveEvents } = await import("@/app/actions/live-events");
  await refreshLiveEvents();
}

export async function postLiveMessage(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." };
  const sessionId = Number(formData.get("sessionId"));
  const body = text(formData, "body");
  const kind = text(formData, "kind") === "question" ? "question" : "chat";
  if (!sessionId) return { error: "Missing session." };
  if (body.length < 2) return { error: "Write a message before sending." };
  const [session] = await db.select().from(liveSessions).where(and(eq(liveSessions.id, sessionId), liveReadable(user))).limit(1);
  if (!session || !["scheduled", "live"].includes(session.status)) return { error: "Session is unavailable or closed." };

  await db.insert(liveMessages).values({
    liveSessionId: sessionId,
    authorId: user.profileId,
    authorName: user.fullName,
    authorRole: session.hostId === user.profileId || canOverseeLearners(user) ? "host" : "student",
    kind,
    body: body.slice(0, 1200),
  });

  revalidatePath(`/learn/live/${sessionId}`);
  revalidatePath(`/mentor/live/${sessionId}`);
  return { ok: true, message: "Posted to the live feed." };
}

export async function toggleLessonCompletion(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const lessonId = Number(formData.get("lessonId"));
  if (!lessonId) return;
  const result = await changeLessonCompletion(lessonId, user);
  if (!result) return;
  const courseSlug = result.courseSlug;

  revalidatePath("/learn/certificates");
  revalidatePath("/learn");
  revalidatePath("/learn/courses");
  if (courseSlug) revalidatePath(`/learn/courses/${courseSlug}`);
  revalidatePath(`/learn/courses/${courseSlug}/${lessonId}`);
}

export async function enrollInCourse(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !isStudent(user)) return;
  const levelId = Number(formData.get("levelId"));
  if (!Number.isSafeInteger(levelId) || levelId < 1) return;
  const [available] = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.levelId, levelId), eq(courses.status, "published"))).limit(1);
  if (!available) return;
  const [firstLevel] = await db.select({ id: courseLevels.id }).from(courseLevels).orderBy(courseLevels.levelNumber, courseLevels.id).limit(1);
  if (firstLevel && firstLevel.id !== levelId) {
    const { enrollInNextLevel } = await import("@/db/level-progression");
    await enrollInNextLevel(levelId, user);
    revalidatePath("/learn", "layout");
    return;
  }
  // Self-service requests join the waitlist. They cannot reactivate a paused
  // enrolment, overwrite another level, or approve their own admission.
  const inserted = await db.insert(enrollments).values({ profileId: user.profileId, email: user.email, fullName: user.fullName, levelId, status: "waitlist" }).onConflictDoNothing().returning({ id: enrollments.id });
  if (inserted.length) await log(user.profileId, "academy.enrollment_requested", `Requested admission to level #${levelId}.`);
  revalidatePath("/learn");
  revalidatePath("/learn/courses");
}

