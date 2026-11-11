"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  assignmentSubmissions,
  assignments,
  coachingSessions,
  enrollments,
  learningProgress,
  mentorAssignments,
  notifications,
  profiles,
  reflections,
  roles,
  users,
} from "@/db/schema";
import { getSessionUser, isStudent } from "@/lib/auth";

export type LearningState = { ok?: boolean; error?: string; message?: string };

async function requireStudent() {
  const user = await getSessionUser();
  if (!user || !isStudent(user)) return null;
  return user;
}

async function myEnrollment(profileId: string) {
  const rows = await db.select().from(enrollments).where(eq(enrollments.profileId, profileId)).limit(1);
  return rows[0] ?? null;
}

export async function toggleSessionComplete(formData: FormData) {
  const user = await requireStudent();
  if (!user) return;
  const sessionId = Number(formData.get("sessionId"));
  if (!sessionId) return;

  const enrollment = await myEnrollment(user.profileId);
  if (!enrollment) return;

  const existing = await db
    .select()
    .from(learningProgress)
    .where(and(eq(learningProgress.enrollmentId, enrollment.id), eq(learningProgress.sessionId, sessionId)))
    .limit(1);

  const wasCompleted = existing[0]?.completed ?? false;

  if (existing[0]) {
    await db
      .update(learningProgress)
      .set({ completed: !wasCompleted, completedAt: wasCompleted ? null : new Date() })
      .where(eq(learningProgress.id, existing[0].id));
  } else {
    await db.insert(learningProgress).values({
      enrollmentId: enrollment.id,
      sessionId,
      completed: true,
      completedAt: new Date(),
    });
  }

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: wasCompleted ? "learning.session_reopened" : "learning.session_completed",
    entityType: "course_session",
    entityId: String(sessionId),
    description: `${wasCompleted ? "Reopened" : "Completed"} course session #${sessionId}.`,
  });

  revalidatePath("/learn");
  revalidatePath("/learn/programme");
  revalidatePath("/admin");
}

export async function saveReflection(_prev: LearningState, formData: FormData): Promise<LearningState> {
  const user = await requireStudent();
  if (!user) return { error: "Sign in with a student account to journal." };

  const prompt = String(formData.get("prompt") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "mentor") as "private" | "mentor" | "cohort";
  const sessionIdRaw = String(formData.get("sessionId") ?? "");

  if (prompt.length < 4) return { error: "Give the reflection a short title or prompt." };
  if (body.length < 40) return { error: "Write at least a couple of sentences so the reflection is useful later." };

  const enrollment = await myEnrollment(user.profileId);

  await db.insert(reflections).values({
    authorProfileId: user.profileId,
    enrollmentId: enrollment?.id ?? null,
    sessionId: sessionIdRaw ? Number(sessionIdRaw) : null,
    prompt: prompt.slice(0, 200),
    body: body.slice(0, 4000),
    visibility,
  });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "learning.reflection_saved",
    entityType: "reflection",
    description: `Saved a reflection: “${prompt.slice(0, 80)}”.`,
  });

  if (visibility !== "private") {
    const mentors = await db
      .select({ id: profiles.id })
      .from(profiles)
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(eq(roles.slug, "mentor"));
    if (mentors.length) {
      await db.insert(notifications).values(
        mentors.map((mentor) => ({
          recipientId: mentor.id,
          type: "community" as const,
          title: "New reflection shared with you",
          body: `${user.fullName}: ${prompt.slice(0, 90)}`,
          href: "/mentor/mentees",
        })),
      );
    }
  }

  revalidatePath("/learn");
  revalidatePath("/learn/reflections");
  revalidatePath("/mentor");
  return { ok: true, message: "Reflection saved. It is now part of your learning record." };
}

export async function submitAssignment(_prev: LearningState, formData: FormData): Promise<LearningState> {
  const user = await requireStudent();
  if (!user) return { error: "Sign in with a student account to submit work." };

  const assignmentId = Number(formData.get("assignmentId"));
  const body = String(formData.get("body") ?? "").trim();
  const asDraft = String(formData.get("intent") ?? "submit") === "draft";

  if (!assignmentId) return { error: "Missing assignment." };
  if (body.length < 30) return { error: "Add a little more detail before saving (at least 30 characters)." };

  const assignmentRows = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  const assignment = assignmentRows[0];
  if (!assignment) return { error: "That assignment is no longer available." };

  await db
    .insert(assignmentSubmissions)
    .values({
      assignmentId,
      profileId: user.profileId,
      body: body.slice(0, 6000),
      status: asDraft ? "draft" : "submitted",
      submittedAt: asDraft ? null : new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [assignmentSubmissions.assignmentId, assignmentSubmissions.profileId],
      set: {
        body: body.slice(0, 6000),
        status: asDraft ? "draft" : "submitted",
        submittedAt: asDraft ? null : new Date(),
        feedback: asDraft ? undefined : null,
        reviewedAt: null,
        updatedAt: new Date(),
      },
    });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: asDraft ? "learning.assignment_drafted" : "learning.assignment_submitted",
    entityType: "assignment",
    entityId: String(assignmentId),
    description: `${asDraft ? "Drafted" : "Submitted"} “${assignment.title}”.`,
  });

  if (!asDraft) {
    const mentors = await db
      .select({ id: profiles.id })
      .from(profiles)
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(eq(roles.slug, "mentor"));
    if (mentors.length) {
      await db.insert(notifications).values(
        mentors.map((mentor) => ({
          recipientId: mentor.id,
          type: "review" as const,
          title: "Assignment ready for review",
          body: `${user.fullName} submitted “${assignment.title}”.`,
          href: "/mentor/submissions",
        })),
      );
    }
  }

  revalidatePath("/learn");
  revalidatePath("/learn/assignments");
  revalidatePath("/mentor/submissions");
  return { ok: true, message: asDraft ? "Draft saved." : "Submitted. Your mentor has been notified." };
}

export async function requestCoaching(_prev: LearningState, formData: FormData): Promise<LearningState> {
  const user = await requireStudent();
  if (!user) return { error: "Sign in with a student account to request coaching." };

  const title = String(formData.get("title") ?? "").trim();
  const focus = String(formData.get("focus") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "");

  if (title.length < 6) return { error: "Give the session a short title so your coach knows what it is for." };
  if (!scheduledForRaw) return { error: "Choose a date and time for the session." };

  const scheduledAt = new Date(scheduledForRaw);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "That date does not look valid." };
  if (scheduledAt.getTime() < Date.now()) return { error: "Pick a time in the future." };

  const existingMentor = await db
    .select({ mentorId: mentorAssignments.mentorId })
    .from(mentorAssignments)
    .innerJoin(profiles, eq(mentorAssignments.mentorId, profiles.id))
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(and(eq(mentorAssignments.studentId, user.profileId), eq(mentorAssignments.status, "active"), eq(users.isActive, true)))
    .limit(1);

  const mentorId = existingMentor[0]?.mentorId ?? null;
  if (!mentorId) return { error: "An active mentor has not been assigned yet. Contact the course desk." };

  const enrollment = await myEnrollment(user.profileId);

  await db.insert(coachingSessions).values({
    mentorId,
    studentId: user.profileId,
    enrollmentId: enrollment?.id ?? null,
    title: title.slice(0, 200),
    focus: focus.slice(0, 1200) || null,
    status: "requested",
    scheduledAt,
    durationMinutes: 45,
  });

  await db.insert(notifications).values({
    recipientId: mentorId,
    type: "review",
    title: "New coaching request",
    body: `${user.fullName} requested “${title}”.`,
    href: "/mentor/sessions",
  });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "learning.coaching_requested",
    entityType: "coaching_session",
    description: `Requested a coaching session: “${title}”.`,
  });

  revalidatePath("/learn");
  revalidatePath("/learn/mentor");
  revalidatePath("/mentor");
  revalidatePath("/mentor/sessions");
  return { ok: true, message: "Request sent. Your mentor will confirm the time and the meeting link by notification." };
}
