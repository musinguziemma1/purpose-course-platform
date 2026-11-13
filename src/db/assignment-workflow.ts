import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  assignments,
  assignmentSubmissions,
  enrollments,
  mediaAssets,
  notifications,
  profiles,
  users,
} from "@/db/schema";
import { currentActor } from "@/db/actor";
import { learnerReadable, canOverseeLearners } from "@/db/learner-access";
import { levelEnrolled } from "@/db/learning-access";
import { can } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { isUuid } from "@/lib/contact";

export function assignmentReadable(viewer: SessionUser | null) {
  if (!viewer || viewer.roleSlug !== "student") return undefined;
  return and(
    levelEnrolled(assignments.levelId, viewer),
    or(
      isNull(assignments.assigneeId),
      eq(assignments.assigneeId, viewer.profileId),
    ),
  );
}

export async function createLearningAssignment(
  input: {
    title: string;
    brief: string;
    levelId: number;
    assigneeId: string;
    dueAt: string;
    attachmentId: string;
  },
  viewer: SessionUser | null,
) {
  const title = input.title.trim(),
    brief = input.brief.trim();
  if (
    title.length < 6 ||
    title.length > 220 ||
    brief.length < 30 ||
    brief.length > 10000
  )
    return {
      error:
        "Use a title of 6–220 characters and instructions of 30–10,000 characters.",
    };
  if (
    !Number.isSafeInteger(input.levelId) ||
    input.levelId < 1 ||
    (input.assigneeId && !isUuid(input.assigneeId)) ||
    (input.attachmentId && !isUuid(input.attachmentId))
  )
    return { error: "Choose a valid level, learner and attachment." };
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (
    dueAt &&
    (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now())
  )
    return { error: "Choose a future due date, including its time zone." };
  return db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (
      !actor ||
      !(canOverseeLearners(actor) || can(actor, "mentorship.coach"))
    )
      return { error: "Assignment authoring access required." };
    if (!input.assigneeId && !canOverseeLearners(actor))
      return { error: "Mentors must choose one of their assigned learners." };
    const learners = await tx
      .select({ id: profiles.id })
      .from(enrollments)
      .innerJoin(profiles, eq(enrollments.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(
        and(
          eq(enrollments.levelId, input.levelId),
          eq(enrollments.status, "enrolled"),
          eq(users.isActive, true),
          input.assigneeId ? eq(profiles.id, input.assigneeId) : undefined,
          learnerReadable(profiles.id, actor),
        ),
      );
    if (
      !learners.length ||
      (input.assigneeId && !learners.some((row) => row.id === input.assigneeId))
    )
      return {
        error:
          "Choose an active learner assigned to you and their enrolled level.",
      };
    if (input.attachmentId) {
      const [attachment] = await tx
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.id, input.attachmentId),
            eq(mediaAssets.state, "ready"),
            eq(mediaAssets.purpose, "library"),
          ),
        )
        .limit(1);
      if (!attachment)
        return { error: "Choose an uploaded library attachment." };
    }
    const [created] = await tx
      .insert(assignments)
      .values({
        title,
        brief,
        levelId: input.levelId,
        assigneeId: input.assigneeId || null,
        createdById: actor.profileId,
        dueAt,
        attachmentId: input.attachmentId || null,
      })
      .returning({ id: assignments.id });
    await tx
      .insert(notifications)
      .values(
        [...new Set(learners.map((row) => row.id))].map((id) => ({
          recipientId: id,
          type: "system" as const,
          title: "New assignment",
          body: title,
          href: "/learn/assignments",
        })),
      );
    await tx
      .insert(activityLogs)
      .values({
        actorId: actor.profileId,
        action: "assignment.created",
        entityType: "assignment",
        entityId: String(created.id),
        description: "Created an assignment for authorized enrolled learners.",
      });
    return {
      ok: true,
      message: "Assignment published to the selected learner or level.",
      id: created.id,
    };
  });
}

export async function saveAssignmentResponse(
  input: {
    assignmentId: number;
    body: string;
    asDraft: boolean;
    attachmentId: string;
    version: string;
  },
  viewer: SessionUser | null,
) {
  const body = input.body.trim();
  if (
    !Number.isSafeInteger(input.assignmentId) ||
    input.assignmentId < 1 ||
    body.length < 30 ||
    body.length > 20000 ||
    (input.attachmentId && !isUuid(input.attachmentId))
  )
    return {
      error:
        "Choose an assignment and write 30–20,000 characters. An attachment is optional.",
    };
  return db.transaction(async (tx) => {
    if (!viewer) return { error: "Student sign-in required." };
    await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, viewer.profileId))
      .for("update");
    const actor = await currentActor(tx, viewer);
    if (!actor || actor.roleSlug !== "student")
      return { error: "Student sign-in required." };
    const [assignment] = await tx
      .select()
      .from(assignments)
      .where(
        and(eq(assignments.id, input.assignmentId), assignmentReadable(actor)),
      )
      .limit(1);
    if (!assignment)
      return { error: "This assignment is not available for your enrolment." };
    const [existing] = await tx
      .select()
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.assignmentId, assignment.id),
          eq(assignmentSubmissions.profileId, actor.profileId),
        ),
      )
      .for("update")
      .limit(1);
    if (existing?.status === "reviewed")
      return {
        error:
          "This response has been graded. Contact your mentor before submitting a revision.",
      };
    if (existing && existing.updatedAt.toISOString() !== input.version)
      return {
        error:
          "Your response changed in another window. Refresh before saving.",
      };
    if (input.attachmentId) {
      const [asset] = await tx
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.id, input.attachmentId),
            eq(mediaAssets.uploadedBy, actor.profileId),
            eq(mediaAssets.purpose, "submission"),
            eq(mediaAssets.state, "ready"),
          ),
        )
        .limit(1);
      if (!asset)
        return { error: "Choose a file uploaded by you for this response." };
    }
    const payload = {
      body,
      attachmentId: input.attachmentId || null,
      status: input.asDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: input.asDraft ? null : new Date(),
      updatedAt: new Date(
        Math.max(Date.now(), existing ? existing.updatedAt.getTime() + 1 : 0),
      ),
    };
    if (existing)
      await tx
        .update(assignmentSubmissions)
        .set(payload)
        .where(eq(assignmentSubmissions.id, existing.id));
    else
      await tx
        .insert(assignmentSubmissions)
        .values({
          ...payload,
          assignmentId: assignment.id,
          profileId: actor.profileId,
        });
    await tx
      .insert(activityLogs)
      .values({
        actorId: actor.profileId,
        action: input.asDraft ? "assignment.drafted" : "assignment.submitted",
        entityType: "assignment",
        entityId: String(assignment.id),
        description: input.asDraft
          ? "Saved a private assignment draft."
          : "Submitted work for mentor review.",
      });
    return {
      ok: true,
      message: input.asDraft
        ? "Private draft saved."
        : "Your assignment has been submitted for review.",
    };
  });
}

export async function gradeAssignment(
  input: {
    submissionId: number;
    feedback: string;
    score: number;
    version: string;
  },
  viewer: SessionUser | null,
) {
  const feedback = input.feedback.trim();
  if (
    !Number.isSafeInteger(input.submissionId) ||
    !Number.isInteger(input.score) ||
    input.score < 0 ||
    input.score > 100 ||
    feedback.length < 20 ||
    feedback.length > 10000
  )
    return {
      error:
        "Add 20–10,000 characters of feedback and a whole-number score from 0 to 100.",
    };
  return db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (
      !actor ||
      !(canOverseeLearners(actor) || can(actor, "mentorship.coach"))
    )
      return { error: "Mentor review access required." };
    const [record] = await tx
      .select()
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.id, input.submissionId),
          inArray(assignmentSubmissions.status, ["submitted", "reviewed"]),
          learnerReadable(assignmentSubmissions.profileId, actor),
        ),
      )
      .for("update")
      .limit(1);
    if (!record)
      return {
        error:
          "This submitted work is not available to you. Drafts are private.",
      };
    if (record.updatedAt.toISOString() !== input.version)
      return {
        error:
          "This response changed in another window. Refresh before grading.",
      };
    await tx
      .update(assignmentSubmissions)
      .set({
        status: "reviewed",
        feedback,
        score: input.score,
        reviewedById: actor.profileId,
        reviewedAt: new Date(),
        updatedAt: new Date(
          Math.max(Date.now(), record.updatedAt.getTime() + 1),
        ),
      })
      .where(eq(assignmentSubmissions.id, record.id));
    await tx
      .insert(notifications)
      .values({
        recipientId: record.profileId,
        type: "review",
        title: "Your assignment has been graded",
        body: `Score: ${input.score}/100. Your mentor's comments are ready.`,
        href: "/learn/assignments",
      });
    await tx
      .insert(activityLogs)
      .values({
        actorId: actor.profileId,
        action: "assignment.graded",
        entityType: "assignment_submission",
        entityId: String(record.id),
        description: `Recorded assignment feedback and score ${input.score}/100.`,
      });
    return { ok: true, message: "Comments and score shared with the student." };
  });
}
