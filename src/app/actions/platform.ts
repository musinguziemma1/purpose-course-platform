"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  authSessions,
  cohortMembers,
  cohortWeeks,
  cohorts,
  communities,
  communityMembers,
  contentReports,
  discussionPosts,
  discussionThreads,
  learnerFlags,
  learnerGoals,
  liveSessions,
  mentorAssignments,
  mentoringNotes,
  notificationOutbox,
  orgMemberships,
  organizations,
  profiles,
  reactions,
  roles,
  sessionAttendance,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { can, normalizeRole, type Permission } from "@/lib/rbac";
import { notify, savePreference } from "@/lib/notifications";
import { addThreadReply, communityReadable, findReadableTarget } from "@/db/community-access";
import { canAssignRole } from "@/lib/admin-access";

export type PlatformState = { ok?: boolean; error?: string; message?: string };

async function log(actorId: string | null, action: string, description: string, entityType = "platform") {
  await db.insert(activityLogs).values({ actorId, action, entityType, description });
}

async function guard(permission: Permission) {
  const user = await getSessionUser();
  if (!user || !can(user, permission)) return null;
  return user;
}

function refresh(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

/* ------------------------------------------------------------------ *
 * Mentorship
 * ------------------------------------------------------------------ */

export async function assignMentor(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("people.manage");
  if (!user) return { error: "Administrator access required to assign mentors." };
  const studentId = String(formData.get("studentId") ?? "");
  const mentorId = String(formData.get("mentorId") ?? "");
  const focus = String(formData.get("focus") ?? "").trim() || null;
  if (!studentId || !mentorId) return { error: "Choose a learner and a mentor." };

  await db
    .insert(mentorAssignments)
    .values({ studentId, mentorId, assignedById: user.profileId, focus, status: "active" })
    .onConflictDoUpdate({
      target: [mentorAssignments.mentorId, mentorAssignments.studentId],
      set: { status: "active", focus },
    });

  const mentorRows = await db.select({ name: profiles.fullName }).from(profiles).where(eq(profiles.id, mentorId)).limit(1);
  await notify({
    recipientIds: [studentId, mentorId],
    templateKey: "mentor.goal_set",
    vars: { mentorName: mentorRows[0]?.name ?? "A mentor", title: focus ?? "Mentorship assignment" },
    dedupeKey: `mentor-assign-${studentId}-${mentorId}`,
  });
  await log(user.profileId, "mentorship.assigned", `Assigned a mentor to learner ${studentId}.`);
  refresh(["/mentor/learners", "/admin/people", "/learn/goals"]);
  return { ok: true, message: "Mentorship assigned and both parties notified." };
}

export async function createGoal(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("mentorship.coach");
  if (!user) return { error: "Mentor access required to set goals." };
  const studentId = String(formData.get("studentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueRaw = String(formData.get("dueAt") ?? "");
  if (!studentId || title.length < 6) return { error: "Choose a learner and write a specific goal." };

  await db.insert(learnerGoals).values({
    studentId,
    mentorId: user.profileId,
    title,
    description,
    dueAt: dueRaw ? new Date(dueRaw) : null,
    status: "active",
  });

  await notify({
    recipientIds: [studentId],
    templateKey: "mentor.goal_set",
    vars: { mentorName: user.fullName, title },
  });
  await log(user.profileId, "mentorship.goal_created", `Set the goal “${title}”.`);
  refresh(["/mentor/learners", "/learn/goals"]);
  return { ok: true, message: "Goal set and the learner notified." };
}

export async function updateGoalProgress(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("mentorship.coach");
  if (!user) return { error: "Mentor access required." };
  const goalId = Number(formData.get("goalId"));
  const progress = Math.min(100, Math.max(0, Number(formData.get("progress") ?? 0)));
  const status = String(formData.get("status") ?? "active");
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim() || null;
  if (!goalId) return { error: "Missing goal." };

  await db
    .update(learnerGoals)
    .set({
      progress,
      status: ["active", "achieved", "deferred"].includes(status) ? status : "active",
      reviewNotes,
      updatedAt: new Date(),
    })
    .where(eq(learnerGoals.id, goalId));

  await log(user.profileId, "mentorship.goal_reviewed", `Updated goal #${goalId} to ${progress}% (${status}).`);
  refresh(["/mentor/learners", "/learn/goals"]);
  return { ok: true, message: "Goal progress recorded." };
}

export async function addMentoringNote(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("mentorship.coach");
  if (!user) return { error: "Mentor access required." };
  const studentId = String(formData.get("studentId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!studentId || body.length < 20) return { error: "Write at least a sentence of session notes." };

  await db.insert(mentoringNotes).values({ studentId, mentorId: user.profileId, body, visibility: "shared" });
  await notify({
    recipientIds: [studentId],
    templateKey: "mentor.reviewed_reflection",
    vars: { mentorName: user.fullName, title: "session notes" },
  });
  await log(user.profileId, "mentorship.note_added", "Recorded mentoring notes.");
  refresh(["/mentor/learners", "/learn/goals"]);
  return { ok: true, message: "Mentoring note saved and shared with the learner." };
}

export async function raiseLearnerFlag(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("mentorship.coach");
  if (!user) return { error: "Mentor access required." };
  const studentId = String(formData.get("studentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const severity = String(formData.get("severity") ?? "attention");
  if (!studentId || reason.length < 10) return { error: "Give a short reason for the follow-up." };

  await db.insert(learnerFlags).values({ studentId, mentorId: user.profileId, reason, severity });
  await notify({ recipientIds: [studentId], templateKey: "mentor.flagged", vars: { reason } });
  await log(user.profileId, "mentorship.flagged", `Flagged learner ${studentId}: ${reason.slice(0, 80)}`);
  refresh(["/mentor/learners", "/learn/goals", "/admin/people"]);
  return { ok: true, message: "Learner flagged and invited to check in." };
}

export async function resolveLearnerFlag(formData: FormData) {
  const user = await guard("mentorship.coach");
  if (!user) return;
  const flagId = Number(formData.get("flagId"));
  if (!flagId) return;
  await db
    .update(learnerFlags)
    .set({ status: "resolved", resolvedAt: new Date(), resolutionNote: String(formData.get("resolutionNote") ?? "Resolved") })
    .where(eq(learnerFlags.id, flagId));
  await log(user.profileId, "mentorship.flag_resolved", `Resolved learner flag #${flagId}.`);
  refresh(["/mentor/learners", "/learn/goals"]);
}

/* ------------------------------------------------------------------ *
 * Communities
 * ------------------------------------------------------------------ */

export async function toggleCommunityMembership(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const communityId = Number(formData.get("communityId"));
  if (!communityId) return;
  const [community] = await db.select().from(communities).where(and(eq(communities.id, communityId), communityReadable(user))).limit(1);
  if (!community) return;
  const existing = await db
    .select()
    .from(communityMembers)
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.profileId, user.profileId)))
    .limit(1);
  if (existing[0]) await db.delete(communityMembers).where(eq(communityMembers.id, existing[0].id));
  else if (community.visibility === "public") await db.insert(communityMembers).values({ communityId, profileId: user.profileId }).onConflictDoNothing();
  revalidatePath("/community");
}

export async function postThread(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("community.post");
  if (!user) return { error: "Join the community to start a discussion." };
  const communityId = Number(formData.get("communityId"));
  const title = String(formData.get("title") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();
  const threadType = String(formData.get("threadType") ?? "discussion");
  if (!communityId || title.length < 8) return { error: "Give the discussion a clear title." };
  if (prompt.length < 12) return { error: "Add context so others can respond well." };
  const [allowedCommunity] = await db.select().from(communities).where(and(eq(communities.id, communityId), communityReadable(user))).limit(1);
  if (!allowedCommunity) return { error: "Community not found or membership required." };

  await db.insert(discussionThreads).values({
    communityId,
    title: title.slice(0, 200),
    prompt: prompt.slice(0, 1600),
    threadType: ["discussion", "question"].includes(threadType) ? threadType : "discussion",
    authorName: user.fullName,
    authorId: user.profileId,
  });

  const community = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1);
  await log(user.profileId, "community.thread_created", `Opened “${title}” in ${community[0]?.name ?? "a community"}.`);
  refresh([`/community/${community[0]?.slug ?? ""}`, "/community"]);
  return { ok: true, message: `Discussion opened in ${community[0]?.name ?? "the community"}.` };
}

export async function replyToThread(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("community.post");
  if (!user) return { error: "Sign in to reply." };
  const threadId = Number(formData.get("threadId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!threadId || body.length < 2) return { error: "Write a reply first." };

  const thread = await addThreadReply(threadId, body, user);
  if (!thread) return { error: "Discussion unavailable, locked, or membership required." };
  if (thread?.authorId && thread.authorId !== user.profileId) {
    await notify({
      recipientIds: [thread.authorId],
      templateKey: "community.reply",
      vars: { author: user.fullName, title: thread.title, href: `/community/thread/${threadId}` },
    });
  }

  await log(user.profileId, "community.reply", `Replied to “${thread?.title ?? "a thread"}”.`);
  revalidatePath(`/community/thread/${threadId}`);
  revalidatePath("/community");
  return { ok: true, message: "Reply posted." };
}

export async function toggleReaction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const targetType = String(formData.get("targetType") ?? "thread");
  const targetId = Number(formData.get("targetId"));
  const emoji = String(formData.get("emoji") ?? "amen");
  const path = String(formData.get("path") ?? "/community");
  if (!targetId) return;
  if (!(await findReadableTarget(targetType, targetId, user))) return;

  const existing = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.profileId, user.profileId),
        eq(reactions.emoji, emoji),
      ),
    )
    .limit(1);

  if (existing[0]) await db.delete(reactions).where(eq(reactions.id, existing[0].id));
  else await db.insert(reactions).values({ targetType, targetId, profileId: user.profileId, emoji });
  revalidatePath(path);
}

export async function reportContent(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to report content." };
  const targetType = String(formData.get("targetType") ?? "thread");
  const targetId = Number(formData.get("targetId"));
  const reason = String(formData.get("reason") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim() || null;
  if (!targetId || reason.length < 3) return { error: "Choose a reason for the report." };
  if (!(await findReadableTarget(targetType, targetId, user))) return { error: "Content not available." };

  await db.insert(contentReports).values({ targetType, targetId, reporterId: user.profileId, reason, detail });
  await log(user.profileId, "community.reported", `Reported ${targetType} #${targetId} (${reason}).`);
  refresh(["/admin/community", "/admin"]);
  return { ok: true, message: "Report sent to the moderation team. Thank you for protecting the room." };
}

export async function moderateThread(formData: FormData) {
  const user = await guard("community.moderate");
  if (!user) return;
  const threadId = Number(formData.get("threadId"));
  const action = String(formData.get("action"));
  if (!threadId) return;

  if (action === "remove") await db.update(discussionThreads).set({ isRemoved: true }).where(eq(discussionThreads.id, threadId));
  if (action === "restore") await db.update(discussionThreads).set({ isRemoved: false }).where(eq(discussionThreads.id, threadId));
  if (action === "pin")
    await db
      .update(discussionThreads)
      .set({ isPinned: sql`not ${discussionThreads.isPinned}` })
      .where(eq(discussionThreads.id, threadId));
  if (action === "answer") await db.update(discussionThreads).set({ isAnswered: true }).where(eq(discussionThreads.id, threadId));

  await log(user.profileId, `community.moderate_${action}`, `Moderation action ${action} on thread #${threadId}.`);
  revalidatePath("/admin/community");
  revalidatePath("/community");
}

export async function resolveReport(formData: FormData) {
  const user = await guard("community.moderate");
  if (!user) return;
  const reportId = Number(formData.get("reportId"));
  const note = String(formData.get("moderatorNote") ?? "Reviewed and actioned").trim();
  if (!reportId) return;
  await db
    .update(contentReports)
    .set({ status: "resolved", moderatorNote: note, resolvedAt: new Date() })
    .where(eq(contentReports.id, reportId));
  await log(user.profileId, "community.report_resolved", `Resolved report #${reportId}.`);
  revalidatePath("/admin/community");
}

/* ------------------------------------------------------------------ *
 * Cohorts & attendance
 * ------------------------------------------------------------------ */

export async function createCohort(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("cohort.manage");
  if (!user) return { error: "Cohort management permission required." };
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsRaw = String(formData.get("startsAt") ?? "");
  const endsRaw = String(formData.get("endsAt") ?? "");
  const levelId = Number(formData.get("levelId") ?? 0) || null;
  if (name.length < 6) return { error: "Give the cohort a name." };
  if (description.length < 30) return { error: "Describe what the cohort will do." };
  const startsAt = new Date(startsRaw);
  const endsAt = new Date(endsRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { error: "Choose valid start and end dates." };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `cohort-${Date.now()}`;
  const [cohort] = await db
    .insert(cohorts)
    .values({
      slug,
      name,
      description,
      levelId,
      status: "draft",
      capacity: Number(formData.get("capacity") ?? 50) || 50,
      startsAt,
      endsAt,
      cadence: String(formData.get("cadence") ?? "Weekly live class + group work"),
      coverImageUrl: String(formData.get("coverImageUrl") ?? "") || "/images/community.jpg",
    })
    .returning({ id: cohorts.id });

  const weekTitles = String(formData.get("weeks") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (weekTitles.length) {
    await db.insert(cohortWeeks).values(
      weekTitles.map((line, index) => {
        const [title, theme] = line.split("|").map((part) => part.trim());
        return {
          cohortId: cohort.id,
          weekNumber: index + 1,
          title: title || `Week ${index + 1}`,
          theme: theme || "Formation",
          focus: `${title || `Week ${index + 1}`} — live class, group work and reflection.`,
          assignmentBrief: "See the cohort workspace for this week's collaborative brief.",
        };
      }),
    );
  }

  await log(user.profileId, "cohort.created", `Created cohort “${name}”.`);
  refresh(["/admin/cohorts", "/learn/cohort"]);
  return { ok: true, message: `Cohort “${name}” created with ${weekTitles.length} weeks.` };
}

export async function addCohortMember(formData: FormData) {
  const user = await guard("cohort.manage");
  if (!user) return;
  const cohortId = Number(formData.get("cohortId"));
  const profileId = String(formData.get("profileId") ?? "");
  const role = String(formData.get("role") ?? "learner");
  if (!cohortId || !profileId) return;
  await db
    .insert(cohortMembers)
    .values({ cohortId, profileId, role: ["learner", "mentor", "facilitator"].includes(role) ? role : "learner" })
    .onConflictDoNothing();
  await log(user.profileId, "cohort.member_added", `Added ${profileId} to cohort #${cohortId} as ${role}.`);
  refresh(["/admin/cohorts", "/learn/cohort"]);
}

export async function setCohortStatus(formData: FormData) {
  const user = await guard("cohort.manage");
  if (!user) return;
  const cohortId = Number(formData.get("cohortId"));
  const status = String(formData.get("status") ?? "draft");
  if (!cohortId) return;
  await db
    .update(cohorts)
    .set({ status: ["draft", "active", "completed", "cancelled"].includes(status) ? status : "draft" })
    .where(eq(cohorts.id, cohortId));
  await log(user.profileId, "cohort.status", `Cohort #${cohortId} set to ${status}.`);
  refresh(["/admin/cohorts", "/learn/cohort"]);
}

export async function markAttendance(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("mentorship.coach");
  if (!user) return { error: "Mentor or instructor access required." };
  const sessionId = Number(formData.get("sessionId"));
  const status = String(formData.get("status") ?? "present");
  const minutes = Number(formData.get("minutes") ?? 0);
  const studentIds = formData.getAll("studentIds").map((value) => String(value));
  if (!sessionId) return { error: "Choose a session." };
  if (studentIds.length === 0) return { error: "Select at least one participant." };

  for (const profileId of studentIds) {
    await db
      .insert(sessionAttendance)
      .values({
        liveSessionId: sessionId,
        profileId,
        status: ["present", "late", "absent", "excused"].includes(status) ? status : "present",
        minutesAttended: minutes,
        markedById: user.profileId,
      })
      .onConflictDoUpdate({
        target: [sessionAttendance.liveSessionId, sessionAttendance.profileId],
        set: { status, minutesAttended: minutes, markedById: user.profileId, markedAt: new Date() },
      });
  }

  const sessionRows = await db.select({ title: liveSessions.title }).from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1);
  await notify({
    recipientIds: studentIds,
    templateKey: "session.attendance_marked",
    vars: { status, title: sessionRows[0]?.title ?? "the session" },
  });
  await log(user.profileId, "session.attendance", `Marked ${studentIds.length} participants ${status} for “${sessionRows[0]?.title ?? "session"}”.`);
  refresh(["/mentor/attendance", "/learn/cohort", "/admin/cohorts"]);
  return { ok: true, message: `Attendance saved for ${studentIds.length} participants.` };
}

/* ------------------------------------------------------------------ *
 * Notifications & RBAC
 * ------------------------------------------------------------------ */

export async function updateNotificationPreference(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const category = String(formData.get("category") ?? "");
  if (!category) return;
  await savePreference({
    profileId: user.profileId,
    category,
    inApp: formData.get("inApp") === "on",
    email: formData.get("email") === "on",
    push: formData.get("push") === "on",
  });
  revalidatePath("/learn/notifications");
  revalidatePath("/admin/notifications");
}

export async function markOutboxDelivered(formData: FormData) {
  const user = await guard("notifications.manage");
  if (!user) return;
  const id = Number(formData.get("outboxId"));
  if (!id) return;
  await db.update(notificationOutbox).set({ status: "sent", sentAt: new Date() }).where(eq(notificationOutbox.id, id));
  await log(user.profileId, "notifications.dispatched", `Marked outbox #${id} as sent.`);
  revalidatePath("/admin/notifications");
}

export async function changeRole(formData: FormData) {
  const user = await guard("people.manage");
  if (!user) return;
  const profileId = String(formData.get("profileId") ?? "");
  const roleSlug = normalizeRole(String(formData.get("roleSlug") ?? "student"));
  if (!profileId || profileId === user.profileId) return;
  const roleRows = await db.select().from(roles).where(eq(roles.slug, roleSlug)).limit(1);
  if (!roleRows[0]) return;
  const [target] = await db.select({ userId: profiles.userId, role: roles.slug }).from(profiles).innerJoin(roles, eq(profiles.roleId, roles.id)).where(eq(profiles.id, profileId)).limit(1);
  if (!target || !canAssignRole(user, target.role, roleSlug)) return;
  const changed = await db.transaction(async (tx) => {
    const [locked] = await tx.select({ role: roles.slug }).from(profiles).innerJoin(roles, eq(profiles.roleId, roles.id)).where(eq(profiles.id, profileId)).for("update", { of: profiles }).limit(1);
    if (!locked || !canAssignRole(user, locked.role, roleSlug)) return false;
    await tx.update(profiles).set({ roleId: roleRows[0].id, updatedAt: new Date() }).where(eq(profiles.id, profileId));
    await tx.delete(authSessions).where(eq(authSessions.userId, target.userId));
    return true;
  });
  if (!changed) return;
  await notify({
    recipientIds: [profileId],
    templateKey: "account.role_changed",
    vars: { roleName: roleRows[0].name, href: "/learn" },
    dedupeKey: `role-${profileId}-${roleSlug}-${Date.now()}`,
  });
  await log(user.profileId, "rbac.role_changed", `Changed role to ${roleRows[0].name} for ${profileId}.`);
  refresh(["/admin/people", "/admin"]);
}

export async function createOrganization(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const user = await guard("org.manage");
  if (!user) return { error: "Organisation management permission required." };
  return { error: "This launch supports one organisation. Additional organisations are not enabled." };
}

