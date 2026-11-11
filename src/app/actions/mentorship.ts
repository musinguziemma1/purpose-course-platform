"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  assignmentSubmissions,
  assignments,
  coachingSessions,
  notifications,
  profiles,
  roles,
} from "@/db/schema";
import { getSessionUser, isMentor } from "@/lib/auth";

export type MentorState = { ok?: boolean; error?: string; message?: string };

async function requireMentor() {
  const user = await getSessionUser();
  if (!user || !isMentor(user)) return null;
  return user;
}

function revalidateMentorAreas() {
  revalidatePath("/mentor");
  revalidatePath("/mentor/sessions");
  revalidatePath("/mentor/submissions");
  revalidatePath("/mentor/mentees");
  revalidatePath("/learn");
  revalidatePath("/learn/mentor");
  revalidatePath("/admin");
}

export async function respondToRequest(formData: FormData) {
  const user = await requireMentor();
  if (!user) return;

  const sessionId = Number(formData.get("sessionId"));
  const decision = String(formData.get("decision"));
  if (!sessionId || !["accept", "decline"].includes(decision)) return;

  const rows = await db.select().from(coachingSessions).where(eq(coachingSessions.id, sessionId)).limit(1);
  const session = rows[0];
  if (!session) return;

  if (user.roleSlug === "mentor" && session.mentorId !== user.profileId) return;

  await db
    .update(coachingSessions)
    .set({ status: decision === "accept" ? "scheduled" : "cancelled" })
    .where(eq(coachingSessions.id, sessionId));

  await db.insert(notifications).values({
    recipientId: session.studentId,
    type: "review",
    title: decision === "accept" ? "Coaching session confirmed" : "Coaching request declined",
    body:
      decision === "accept"
        ? `“${session.title}” is confirmed. Bring your two drafts and your gifting evidence.`
        : `“${session.title}” could not be scheduled. Your mentor will propose an alternative.`,
    href: "/learn/mentor",
  });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: `mentorship.request_${decision}`,
    entityType: "coaching_session",
    entityId: String(sessionId),
    description: `${decision === "accept" ? "Confirmed" : "Declined"} coaching request “${session.title}”.`,
  });

  revalidateMentorAreas();
}

export async function completeCoachingSession(_prev: MentorState, formData: FormData): Promise<MentorState> {
  const user = await requireMentor();
  if (!user) return { error: "Mentor access required." };

  const sessionId = Number(formData.get("sessionId"));
  const notes = String(formData.get("mentorNotes") ?? "").trim();
  if (!sessionId) return { error: "Missing session." };
  if (notes.length < 20) return { error: "Add session notes (at least 20 characters) so the student has a record." };

  const rows = await db.select().from(coachingSessions).where(eq(coachingSessions.id, sessionId)).limit(1);
  const session = rows[0];
  if (!session) return { error: "That session no longer exists." };
  if (user.roleSlug === "mentor" && session.mentorId !== user.profileId) {
    return { error: "That session belongs to another mentor." };
  }

  await db
    .update(coachingSessions)
    .set({ status: "completed", mentorNotes: notes.slice(0, 4000) })
    .where(eq(coachingSessions.id, sessionId));

  await db.insert(notifications).values({
    recipientId: session.studentId,
    type: "review",
    title: "Coaching notes are ready",
    body: `Notes from “${session.title}” have been added to your learning record.`,
    href: "/learn/mentor",
  });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "mentorship.session_completed",
    entityType: "coaching_session",
    entityId: String(sessionId),
    description: `Completed coaching session “${session.title}” and recorded notes.`,
  });

  revalidateMentorAreas();
  return { ok: true, message: "Session marked complete and notes shared with the student." };
}

export async function reviewSubmission(_prev: MentorState, formData: FormData): Promise<MentorState> {
  const user = await requireMentor();
  if (!user) return { error: "Mentor access required." };

  const submissionId = Number(formData.get("submissionId"));
  const feedback = String(formData.get("feedback") ?? "").trim();
  if (!submissionId) return { error: "Missing submission." };
  if (feedback.length < 20) return { error: "Write at least 20 characters of feedback — specificity is the point." };

  const rows = await db
    .select({ submission: assignmentSubmissions, assignment: assignments })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .where(eq(assignmentSubmissions.id, submissionId))
    .limit(1);
  const record = rows[0];
  if (!record) return { error: "That submission no longer exists." };

  await db
    .update(assignmentSubmissions)
    .set({
      status: "reviewed",
      feedback: feedback.slice(0, 4000),
      reviewedById: user.profileId,
      reviewedAt: new Date(),
    })
    .where(eq(assignmentSubmissions.id, submissionId));

  await db.insert(notifications).values({
    recipientId: record.submission.profileId,
    type: "review",
    title: "Feedback on your assignment",
    body: `Your mentor reviewed “${record.assignment.title}”.`,
    href: "/learn/assignments",
  });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "mentorship.submission_reviewed",
    entityType: "assignment",
    entityId: String(record.assignment.id),
    description: `Reviewed “${record.assignment.title}” and left feedback.`,
  });

  revalidateMentorAreas();
  return { ok: true, message: "Feedback shared with the student." };
}

export async function scheduleFollowUp(_prev: MentorState, formData: FormData): Promise<MentorState> {
  const user = await requireMentor();
  if (!user) return { error: "Mentor access required." };

  const studentId = String(formData.get("studentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const focus = String(formData.get("focus") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "");
  if (!studentId) return { error: "Choose a mentee." };
  if (title.length < 6) return { error: "Add a session title." };
  const scheduledAt = new Date(scheduledForRaw);
  if (!scheduledForRaw || Number.isNaN(scheduledAt.getTime())) return { error: "Choose a valid date and time." };

  let mentorId = user.profileId;
  if (user.roleSlug !== "mentor") {
    const mentors = await db
      .select({ id: profiles.id })
      .from(profiles)
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(eq(roles.slug, "mentor"))
      .limit(1);
    mentorId = mentors[0]?.id ?? user.profileId;
  }

  const studentProfile = await db.select().from(profiles).where(eq(profiles.id, studentId)).limit(1);
  if (!studentProfile[0]) return { error: "That student could not be found." };

  await db.insert(coachingSessions).values({
    mentorId,
    studentId,
    title: title.slice(0, 200),
    focus: focus.slice(0, 1200) || null,
    status: "scheduled",
    scheduledAt,
    durationMinutes: 45,
  });

  await db.insert(notifications).values({
    recipientId: studentId,
    type: "review",
    title: "New coaching session scheduled",
    body: `${user.fullName} booked “${title}”.`,
    href: "/learn/mentor",
  });

  if (user.roleSlug === "mentor") {
    await db.insert(activityLogs).values({
      actorId: user.profileId,
      action: "mentorship.session_scheduled",
      entityType: "coaching_session",
      description: `Scheduled “${title}” with ${studentProfile[0].fullName}.`,
    });
  }

  revalidateMentorAreas();
  return { ok: true, message: "Session scheduled and the student notified." };
}


