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
  lessonProgress,
  lessons,
  liveMessages,
  liveRsvps,
  liveSessions,
  profiles,
  roles,
} from "@/db/schema";
import { canManagePeople, getSessionUser, isMentor, isStudent } from "@/lib/auth";
import { syncCertificates } from "@/db/assessments";
import { slugify } from "@/lib/utils";

export type AcademyState = { ok?: boolean; error?: string; message?: string };

const KINDS = ["video", "audio", "reading", "illustration", "download", "practice", "live"] as const;
const TYPES = ["class", "group_work", "discussion", "office_hours"] as const;
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
  if (!user || !canManagePeople(user)) return null;
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

export async function saveLiveSession(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in required." };
  if (!canManagePeople(user) && !isMentor(user)) return { error: "Only administrators and mentors can schedule live sessions." };

  const title = text(formData, "title");
  const type = text(formData, "type");
  const startsAtRaw = text(formData, "startsAt");
  const courseIdRaw = text(formData, "courseId");
  if (title.length < 4) return { error: "Give the session a title." };
  if (!(TYPES as readonly string[]).includes(type)) return { error: "Choose a session type." };

  const startsAt = new Date(startsAtRaw);
  if (!startsAtRaw || Number.isNaN(startsAt.getTime())) return { error: "Choose a valid start date and time." };

  await db.insert(liveSessions).values({
    title,
    description: nullable(formData, "description"),
    agenda: nullable(formData, "agenda"),
    type: type as (typeof TYPES)[number],
    status: "scheduled",
    startsAt,
    durationMinutes: Number(formData.get("durationMinutes") ?? 90) || 90,
    meetingUrl: nullable(formData, "meetingUrl"),
    groupSize: Number(formData.get("groupSize") ?? 0) || null,
    courseId: courseIdRaw ? Number(courseIdRaw) : null,
    hostId: isMentor(user) && !canManagePeople(user) ? user.profileId : text(formData, "hostId") ? String(formData.get("hostId")) : user.profileId,
  });

  await log(user.profileId, "academy.live_created", `Scheduled “${title}” (${type.replace("_", " ")}).`);
  refreshAcademy();
  revalidatePath("/mentor");
  return { ok: true, message: `${title} scheduled. Students can now RSVP.` };
}

export async function setLiveStatus(formData: FormData) {
  const user = await getSessionUser();
  if (!user || (!canManagePeople(user) && !isMentor(user))) return;
  const sessionId = Number(formData.get("sessionId"));
  const status = text(formData, "status");
  if (!sessionId || !["scheduled", "live", "ended", "cancelled"].includes(status)) return;

  await db
    .update(liveSessions)
    .set({ status: status as "scheduled" | "live" | "ended" | "cancelled" })
    .where(eq(liveSessions.id, sessionId));

  if (status === "live") {
    await db.insert(liveMessages).values({
      liveSessionId: sessionId,
      authorId: user.profileId,
      authorName: user.fullName,
      authorRole: "host",
      kind: "system",
      body: `${user.fullName} opened the room. Post your questions in the feed.`,
    });
  }

  await log(user.profileId, `academy.live_${status}`, `Live session #${sessionId} marked ${status}.`);
  refreshAcademy();
  revalidatePath(`/learn/live/${sessionId}`);
  revalidatePath(`/mentor/live/${sessionId}`);
}

export async function saveRecording(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await getSessionUser();
  if (!user || (!canManagePeople(user) && !isMentor(user))) return { error: "Host access required." };
  const sessionId = Number(formData.get("sessionId"));
  const recordingUrl = nullable(formData, "recordingUrl");
  if (!sessionId || !recordingUrl) return { error: "Paste the recording link first." };
  await db.update(liveSessions).set({ recordingUrl, status: "ended" }).where(eq(liveSessions.id, sessionId));
  revalidatePath(`/learn/live/${sessionId}`);
  revalidatePath("/learn/live");
  return { ok: true, message: "Recording attached and the session closed." };
}

export async function deleteLiveSession(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const sessionId = Number(formData.get("sessionId"));
  if (!sessionId) return;
  await db.delete(liveSessions).where(eq(liveSessions.id, sessionId));
  await log(admin.profileId, "academy.live_deleted", `Removed live session #${sessionId}.`);
  refreshAcademy();
}

/* ------------------------------------------------------------------ *
 * Student engagement — RSVP, live feed, lesson completion
 * ------------------------------------------------------------------ */

export async function toggleRsvp(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const sessionId = Number(formData.get("sessionId"));
  if (!sessionId) return;

  const existing = await db
    .select()
    .from(liveRsvps)
    .where(and(eq(liveRsvps.liveSessionId, sessionId), eq(liveRsvps.profileId, user.profileId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(liveRsvps).where(eq(liveRsvps.id, existing[0].id));
  } else {
    await db.insert(liveRsvps).values({ liveSessionId: sessionId, profileId: user.profileId, status: "going" }).onConflictDoNothing();
  }

  revalidatePath("/learn/live");
  revalidatePath("/mentor/live");
  revalidatePath(`/learn/live/${sessionId}`);
}

export async function postLiveMessage(_prev: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await getSessionUser();
  const sessionId = Number(formData.get("sessionId"));
  const body = text(formData, "body");
  const kind = text(formData, "kind") === "question" ? "question" : "chat";
  if (!sessionId) return { error: "Missing session." };
  if (body.length < 2) return { error: "Write a message before sending." };

  await db.insert(liveMessages).values({
    liveSessionId: sessionId,
    authorId: user?.profileId ?? null,
    authorName: user?.fullName ?? text(formData, "authorName") ?? "Guest",
    authorRole: isStudent(user) ? "student" : isMentor(user) ? "mentor" : "host",
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
  const courseSlug = text(formData, "courseSlug");
  if (!lessonId) return;

  const existing = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.profileId, user.profileId), eq(lessonProgress.lessonId, lessonId)))
    .limit(1);

  const wasComplete = existing[0]?.status === "completed";

  if (existing[0]) {
    await db
      .update(lessonProgress)
      .set({
        status: wasComplete ? "in_progress" : "completed",
        completedAt: wasComplete ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lessonProgress.id, existing[0].id));
  } else {
    await db.insert(lessonProgress).values({
      profileId: user.profileId,
      lessonId,
      status: "completed",
      completedAt: new Date(),
    });
  }

  const issued = await syncCertificates(user.profileId).catch(() => []);

  await log(
    user.profileId,
    wasComplete ? "academy.lesson_reopened" : "academy.lesson_completed",
    `${wasComplete ? "Reopened" : "Completed"} lesson #${lessonId}${issued.length ? ` · certificate ${issued[0]}` : ""}.`,
  );

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
  if (!levelId) return;

  const existing = await db.select().from(enrollments).where(eq(enrollments.profileId, user.profileId)).limit(1);
  if (existing[0]) {
    await db.update(enrollments).set({ levelId, status: "enrolled" }).where(eq(enrollments.id, existing[0].id));
  } else {
    await db.insert(enrollments).values({
      profileId: user.profileId,
      email: `${user.slug}@purposecourse.org`,
      fullName: user.fullName,
      levelId,
      cohort: "Cohort 04 · 2026",
      status: "enrolled",
    });
  }

  await log(user.profileId, "academy.level_enrolled", `Enrolled in level #${levelId}.`);
  revalidatePath("/learn");
  revalidatePath("/learn/courses");
}

