"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { courseModules, courses, lessons } from "@/db/schema";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !canAuthorAcademy(user)) return null;
  return user;
}

function t(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function n(formData: FormData, key: string) {
  const value = t(formData, key);
  return value.length ? value : null;
}

function refresh(courseId?: number) {
  revalidatePath("/admin/academy");
  revalidatePath("/admin/academy/live");
  if (courseId) {
    revalidatePath(`/admin/academy/courses/${courseId}`);
    revalidatePath(`/admin/academy/courses/${courseId}/edit`);
  }
  revalidatePath("/learn");
  revalidatePath("/learn/courses");
  revalidatePath("/learn/live");
}

export async function saveCourseForm(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const courseId = Number(formData.get("courseId"));
  if (!courseId) return;
  const status = t(formData, "status");
  await db
    .update(courses)
    .set({
      title: t(formData, "title") || undefined,
      subtitle: n(formData, "subtitle"),
      summary: t(formData, "summary") || undefined,
      description: n(formData, "description"),
      coverImageUrl: n(formData, "coverImageUrl"),
      accent: t(formData, "accent") || undefined,
      estimatedHours: Number(formData.get("estimatedHours") ?? 4) || 4,
      isSequential: formData.get("isSequential") === "on",
      status: ["draft", "published", "archived"].includes(status) ? (status as "draft" | "published" | "archived") : undefined,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId));
  refresh(courseId);
  redirect(`/admin/academy/courses/${courseId}`);
}

export async function saveModuleForm(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const courseId = Number(formData.get("courseId"));
  const moduleId = Number(formData.get("moduleId") ?? 0);
  const title = t(formData, "title");
  if (!courseId || title.length < 4) return;

  if (moduleId) {
    await db
      .update(courseModules)
      .set({
        title,
        summary: n(formData, "summary"),
        sessionCode: n(formData, "sessionCode"),
        estimatedMinutes: Number(formData.get("estimatedMinutes") ?? 45) || 45,
        isPreview: formData.get("isPreview") === "on",
      })
      .where(eq(courseModules.id, moduleId));
  } else {
    const [orderRow] = await db.select({ value: max(courseModules.sortOrder) }).from(courseModules).where(eq(courseModules.courseId, courseId));
    await db
      .insert(courseModules)
      .values({
        courseId,
        slug: slugify(title) || `module-${Date.now()}`,
        title,
        summary: n(formData, "summary"),
        sessionCode: n(formData, "sessionCode"),
        estimatedMinutes: Number(formData.get("estimatedMinutes") ?? 45) || 45,
        isPreview: formData.get("isPreview") === "on",
        sortOrder: Number(orderRow?.value ?? 0) + 1,
      })
      .onConflictDoNothing();
  }
  refresh(courseId);
  redirect(`/admin/academy/courses/${courseId}`);
}

export async function saveLessonForm(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const courseId = Number(formData.get("courseId"));
  const moduleId = Number(formData.get("moduleId"));
  const lessonId = Number(formData.get("lessonId") ?? 0);
  const title = t(formData, "title");
  const body = t(formData, "body");
  if (!moduleId || title.length < 4 || body.length < 40) return;

  const kind = t(formData, "kind");
  const payload = {
    title,
    kind: (["video", "audio", "reading", "illustration", "download", "practice", "live"].includes(kind) ? kind : "reading") as
      | "video"
      | "audio"
      | "reading"
      | "illustration"
      | "download"
      | "practice"
      | "live",
    summary: n(formData, "summary"),
    body,
    videoUrl: n(formData, "videoUrl"),
    audioUrl: n(formData, "audioUrl"),
    imageUrl: n(formData, "imageUrl"),
    imageAlt: n(formData, "imageAlt"),
    downloadUrl: n(formData, "downloadUrl"),
    downloadLabel: n(formData, "downloadLabel"),
    transcript: n(formData, "transcript"),
    practicePrompt: n(formData, "practicePrompt"),
    durationMinutes: Number(formData.get("durationMinutes") ?? 10) || 10,
    isPreview: formData.get("isPreview") === "on",
    status: (["draft", "published", "archived"].includes(t(formData, "status"))
      ? t(formData, "status")
      : "published") as "draft" | "published" | "archived",
  };

  if (lessonId) {
    await db.update(lessons).set(payload).where(eq(lessons.id, lessonId));
  } else {
    const [orderRow] = await db.select({ value: max(lessons.sortOrder) }).from(lessons).where(eq(lessons.moduleId, moduleId));
    await db
      .insert(lessons)
      .values({
        ...payload,
        moduleId,
        slug: slugify(title) || `lesson-${Date.now()}`,
        sortOrder: Number(orderRow?.value ?? 0) + 1,
      })
      .onConflictDoNothing();
  }
  refresh(courseId);
  redirect(`/admin/academy/courses/${courseId}`);
}

export async function createLiveSessionForm(formData: FormData) {
  const { saveEvent } = await import("@/app/actions/live-events");
  const result = await saveEvent({}, formData);
  if (result.ok) redirect("/admin/academy/live");
}
