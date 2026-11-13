import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  activityLogs,
  cohorts,
  cohortMembers,
  courses,
  liveMessages,
  liveRsvps,
  liveSessionRequests,
  liveSessions,
  notifications,
  profiles,
  roles,
  users,
} from "@/db/schema";
import { currentActor, type Transaction } from "@/db/actor";
import { liveReadable } from "@/db/learning-access";
import { makeRoomCode } from "@/db/conference";
import { can } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { validTimeZone } from "@/lib/event-time";
import { isUuid } from "@/lib/contact";
import { safeContentUrl } from "@/lib/content-media";

export type LiveInput = {
  id?: number;
  version?: string;
  scheduleKey: string;
  title: string;
  description: string;
  agenda: string;
  type: string;
  startsAt: string;
  timezone: string;
  durationMinutes: number;
  hostId: string;
  courseId: number | null;
  cohortId: number | null;
  meetingUrl: string;
  isPublic: boolean;
  groupSize?: number | null;
};
export function canScheduleEvents(
  actor: Pick<SessionUser, "roleSlug" | "permissions"> | null,
) {
  return can(actor, "academy.author") || can(actor, "cohort.manage");
}
function validated(input: LiveInput) {
  const start = new Date(input.startsAt);
  if (
    input.title.trim().length < 4 ||
    input.title.trim().length > 220 ||
    input.description.trim().length < 20 ||
    input.description.length > 10000 ||
    input.agenda.length > 10000
  )
    return "Use a title of 4–220 characters and a description of 20–10,000 characters.";
  if (
    !isUuid(input.scheduleKey) ||
    !isUuid(input.hostId) ||
    !["class", "group_work", "discussion", "office_hours"].includes(input.type)
  )
    return "Choose a valid session type and host.";
  if (
    !validTimeZone(input.timezone) ||
    !/T.+(?:Z|[+-]\d{2}:\d{2})$/.test(input.startsAt) ||
    !Number.isFinite(start.getTime()) ||
    start.getTime() <= Date.now()
  )
    return "Choose a future date and time in a valid time zone.";
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 15 ||
    input.durationMinutes > 480 ||
    (input.groupSize != null &&
      (!Number.isInteger(input.groupSize) ||
        input.groupSize < 2 ||
        input.groupSize > 12))
  )
    return "Use 15–480 minutes and, if needed, a group size of 2–12.";
  if (
    [input.courseId, input.cohortId].some(
      (id) => id !== null && (!Number.isSafeInteger(id) || id < 1),
    )
  )
    return "Choose a valid course and cohort.";
  if (
    input.meetingUrl &&
    (!safeContentUrl(input.meetingUrl, true) ||
      !input.meetingUrl.startsWith("https://"))
  )
    return "Use an HTTPS meeting link, or leave it empty for the built-in room.";
  return null;
}
async function notify(
  tx: Transaction,
  title: string,
  body: string,
  href: string,
  recipientId?: string,
) {
  const recipients = await tx
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(
      and(
        eq(users.isActive, true),
        recipientId ? eq(profiles.id, recipientId) : undefined,
      ),
    )
    .orderBy(profiles.id)
    .for("key share", { of: profiles });
  for (let i = 0; i < recipients.length; i += 200)
    await tx.insert(notifications).values(
      recipients.slice(i, i + 200).map((row) => ({
        recipientId: row.id,
        type: "system" as const,
        title,
        body,
        href,
      })),
    );
}
async function contextError(tx: Transaction, input: LiveInput) {
  const [host] = await tx
    .select({
      id: profiles.id,
      roleSlug: roles.slug,
      permissions: roles.permissions,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(eq(profiles.id, input.hostId), eq(users.isActive, true)))
    .limit(1);
  if (
    !host ||
    !(
      can(host, "mentorship.coach") ||
      can(host, "academy.author") ||
      can(host, "academy.oversee")
    )
  )
    return "Choose an active mentor, instructor or programme administrator as host.";
  const [course] = input.courseId
    ? await tx
        .select()
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1)
    : [];
  const [cohort] = input.cohortId
    ? await tx
        .select()
        .from(cohorts)
        .where(eq(cohorts.id, input.cohortId))
        .limit(1)
    : [];
  if (input.courseId && (!course || course.status !== "published"))
    return "Publish the course before scheduling a class for it.";
  if (input.cohortId && (!cohort || cohort.status !== "active"))
    return "Choose an active cohort.";
  const starts = new Date(input.startsAt).getTime(),
    ends = starts + input.durationMinutes * 60000;
  if (
    cohort &&
    (starts < cohort.startsAt.getTime() || ends > cohort.endsAt.getTime())
  )
    return "The entire session must fall within the cohort dates.";
  if (
    cohort &&
    course &&
    (cohort.levelId !== course.levelId ||
      (cohort.courseId && cohort.courseId !== course.id))
  )
    return "The selected course must belong to the cohort's level and course scope.";
  if (cohort) {
    const [faculty] = await tx
      .select({ id: cohortMembers.id })
      .from(cohortMembers)
      .where(
        and(
          eq(cohortMembers.cohortId, cohort.id),
          eq(cohortMembers.profileId, input.hostId),
          eq(cohortMembers.status, "active"),
          inArray(cohortMembers.role, ["mentor", "facilitator"]),
        ),
      )
      .limit(1);
    if (!faculty && !can(host, "academy.oversee"))
      return "Add this host to the cohort as a mentor or facilitator first.";
  }
  const [conflict] = await tx
    .select({ id: liveSessions.id })
    .from(liveSessions)
    .where(
      and(
        inArray(liveSessions.status, ["scheduled", "live"]),
        input.id ? ne(liveSessions.id, input.id) : undefined,
        or(
          eq(liveSessions.hostId, input.hostId),
          input.cohortId
            ? eq(liveSessions.cohortId, input.cohortId)
            : undefined,
        ),
        sql`${liveSessions.startsAt} < ${new Date(ends)} and ${liveSessions.startsAt} + make_interval(mins => ${liveSessions.durationMinutes}) > ${new Date(starts)}`,
      ),
    )
    .limit(1);
  return conflict
    ? "This host or cohort already has a session at that time. Choose another time."
    : null;
}
async function persistSchedule(
  tx: Transaction,
  input: LiveInput,
  actor: SessionUser,
) {
  const error = validated(input);
  if (error) return { error };
  let old: typeof liveSessions.$inferSelect | undefined;
  if (input.id) {
    [old] = await tx
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.id, input.id))
      .for("update")
      .limit(1);
    if (
      !old ||
      old.status !== "scheduled" ||
      old.updatedAt.toISOString() !== input.version
    )
      return {
        error:
          "This session changed or is no longer scheduled. Refresh before editing.",
      };
  } else {
    const [existing] = await tx
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.scheduleKey, input.scheduleKey))
      .limit(1);
    if (existing)
      return existing.createdById === actor.profileId
        ? {
            ok: true as const,
            id: existing.id,
            message: "This session is already scheduled.",
          }
        : { error: "This scheduling request is unavailable." };
  }
  const context = await contextError(tx, input);
  if (context) return { error: context };
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    agenda: input.agenda.trim() || null,
    type: input.type as "class" | "group_work" | "discussion" | "office_hours",
    startsAt: new Date(input.startsAt),
    timezone: input.timezone,
    durationMinutes: input.durationMinutes,
    hostId: input.hostId,
    courseId: input.courseId,
    cohortId: input.cohortId,
    meetingUrl: input.meetingUrl || null,
    isPublic: input.isPublic,
    groupSize: input.groupSize || null,
    updatedAt: new Date(
      Math.max(Date.now(), (old?.updatedAt.getTime() ?? 0) + 1),
    ),
  };
  const [saved] = old
    ? await tx
        .update(liveSessions)
        .set(payload)
        .where(eq(liveSessions.id, old.id))
        .returning()
    : await tx
        .insert(liveSessions)
        .values({
          ...payload,
          createdById: actor.profileId,
          scheduleKey: input.scheduleKey,
          roomCode: makeRoomCode(),
        })
        .returning();
  await tx.insert(activityLogs).values({
    actorId: actor.profileId,
    action: old ? "live.rescheduled" : "live.scheduled",
    entityType: "live_session",
    entityId: String(saved.id),
    description: `${old ? "Updated" : "Scheduled"} a live event.`,
  });
  await notify(
    tx,
    old ? "Live event updated" : "New live event",
    saved.title,
    `/events/${saved.id}`,
  );
  return {
    ok: true as const,
    id: saved.id,
    message: old
      ? "Session updated. Account calendars and notifications are updated."
      : "Session scheduled. It now appears in account calendars and event notifications.",
  };
}
export async function scheduleLiveEvent(
  input: LiveInput,
  viewer: SessionUser | null,
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104, 5)`);
    const actor = await currentActor(tx, viewer);
    if (!actor || !canScheduleEvents(actor))
      return {
        error:
          "Programme scheduling permission required. Mentors can submit a session request.",
      };
    return persistSchedule(tx, input, actor);
  });
}
export async function changeLiveEventStatus(
  input: { id: number; version: string; status: string },
  viewer: SessionUser | null,
) {
  if (!Number.isSafeInteger(input.id) || input.id < 1 || !input.version)
    return { error: "Choose a valid session and refresh its current state." };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104, 5)`);
    const actor = await currentActor(tx, viewer);
    if (!actor) return { error: "Sign in required." };
    const [session] = await tx
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.id, input.id))
      .for("update")
      .limit(1);
    if (
      !session ||
      !(
        canScheduleEvents(actor) ||
        (session.hostId === actor.profileId && can(actor, "mentorship.coach"))
      )
    )
      return {
        error: "Only the host or programme scheduler can manage this session.",
      };
    if (session.updatedAt.toISOString() !== input.version)
      return { error: "This session changed. Refresh before continuing." };
    const transitions: Record<string, string[]> = {
      scheduled: ["live", "cancelled"],
      live: ["ended", "cancelled"],
      ended: [],
      cancelled: [],
    };
    if (!transitions[session.status]?.includes(input.status))
      return { error: "That session status change is unavailable." };
    await tx
      .update(liveSessions)
      .set({
        status: input.status as "live" | "ended" | "cancelled",
        updatedAt: new Date(
          Math.max(Date.now(), session.updatedAt.getTime() + 1),
        ),
      })
      .where(eq(liveSessions.id, session.id));
    if (input.status === "live")
      await tx.insert(liveMessages).values({
        liveSessionId: session.id,
        authorId: actor.profileId,
        authorName: actor.fullName,
        authorRole: "host",
        kind: "system",
        body: "The host opened the live session.",
      });
    await tx.insert(activityLogs).values({
      actorId: actor.profileId,
      action: `live.${input.status}`,
      entityType: "live_session",
      entityId: String(session.id),
      description: `Live event marked ${input.status}.`,
    });
    await notify(
      tx,
      input.status === "live"
        ? "Live session has started"
        : input.status === "cancelled"
          ? "Live session cancelled"
          : "Live session ended",
      session.title,
      `/events/${session.id}`,
    );
    return { ok: true as const, message: `Session ${input.status}.` };
  });
}
export async function requestLiveEvent(
  input: LiveInput,
  viewer: SessionUser | null,
) {
  const error = validated(input);
  if (error) return { error };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104, 5)`);
    const actor = await currentActor(tx, viewer);
    if (!actor || !can(actor, "mentorship.coach"))
      return { error: "Mentor or instructor access required." };
    if (input.hostId !== actor.profileId)
      return { error: "You can request a session only for yourself." };
    const [existing] = await tx
      .select()
      .from(liveSessionRequests)
      .where(eq(liveSessionRequests.requestKey, input.scheduleKey))
      .limit(1);
    if (existing)
      return existing.requestedById === actor.profileId
        ? {
            ok: true as const,
            message: "Your request is already with the programme team.",
          }
        : { error: "This request is unavailable." };
    const pending = await tx
      .select({ id: liveSessionRequests.id })
      .from(liveSessionRequests)
      .where(
        and(
          eq(liveSessionRequests.requestedById, actor.profileId),
          eq(liveSessionRequests.status, "pending"),
        ),
      );
    if (pending.length >= 5)
      return {
        error:
          "You already have five pending requests. Wait for a decision or withdraw one.",
      };
    const context = await contextError(tx, input);
    if (context) return { error: context };
    const [request] = await tx
      .insert(liveSessionRequests)
      .values({
        requestedById: actor.profileId,
        requestKey: input.scheduleKey,
        title: input.title.trim(),
        description: input.description.trim(),
        agenda: input.agenda.trim() || null,
        type: input.type as "class",
        courseId: input.courseId,
        cohortId: input.cohortId,
        startsAt: new Date(input.startsAt),
        timezone: input.timezone,
        durationMinutes: input.durationMinutes,
      })
      .returning();
    const schedulers = await tx
      .select({
        id: profiles.id,
        roleSlug: roles.slug,
        permissions: roles.permissions,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(eq(users.isActive, true))
      .orderBy(profiles.id)
      .for("key share", { of: profiles });
    const recipients = schedulers.filter(canScheduleEvents);
    if (recipients.length)
      await tx.insert(notifications).values(
        recipients.map((row) => ({
          recipientId: row.id,
          type: "system" as const,
          title: "Live session requested",
          body: `${actor.fullName} requested: ${request.title}`,
          href: "/admin/academy/live#requests",
        })),
      );
    await tx.insert(activityLogs).values({
      actorId: actor.profileId,
      action: "live.requested",
      entityType: "live_session_request",
      entityId: request.id,
      description: "Requested a live teaching session.",
    });
    return {
      ok: true as const,
      message:
        "Request sent to the programme team. You will receive an in-app decision.",
    };
  });
}
export async function reviewLiveEventRequest(
  input: { id: string; version: string; decision: string; note: string },
  viewer: SessionUser | null,
) {
  if (
    !isUuid(input.id) ||
    !["approve", "decline", "withdraw"].includes(input.decision) ||
    input.note.length > 2000
  )
    return { error: "Choose a valid request and decision." };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104, 5)`);
    const actor = await currentActor(tx, viewer);
    if (!actor) return { error: "Sign in required." };
    const [request] = await tx
      .select()
      .from(liveSessionRequests)
      .where(eq(liveSessionRequests.id, input.id))
      .for("update")
      .limit(1);
    if (
      !request ||
      request.status !== "pending" ||
      request.updatedAt.toISOString() !== input.version
    )
      return {
        error: "This request changed. Refresh to see the current decision.",
      };
    const withdraw = input.decision === "withdraw";
    if (
      withdraw
        ? request.requestedById !== actor.profileId
        : !canScheduleEvents(actor)
    )
      return { error: "You do not have permission to review this request." };
    if (input.decision === "decline" && input.note.trim().length < 10)
      return { error: "Explain the decision in at least 10 characters." };
    let scheduledId: number | null = null;
    if (input.decision === "approve") {
      const result = await persistSchedule(
        tx,
        {
          scheduleKey: randomUUID(),
          title: request.title,
          description: request.description,
          agenda: request.agenda ?? "",
          type: request.type,
          startsAt: request.startsAt.toISOString(),
          timezone: request.timezone,
          durationMinutes: request.durationMinutes,
          hostId: request.requestedById,
          courseId: request.courseId,
          cohortId: request.cohortId,
          meetingUrl: "",
          isPublic: true,
        },
        actor,
      );
      if (!("ok" in result) || !result.ok || result.id === undefined)
        return result;
      scheduledId = result.id;
    }
    await tx
      .update(liveSessionRequests)
      .set({
        status: withdraw
          ? "withdrawn"
          : input.decision === "approve"
            ? "approved"
            : "declined",
        scheduledSessionId: scheduledId,
        reviewedById: withdraw ? null : actor.profileId,
        reviewNote: input.note.trim() || null,
        reviewedAt: new Date(),
        updatedAt: new Date(
          Math.max(Date.now(), request.updatedAt.getTime() + 1),
        ),
      })
      .where(eq(liveSessionRequests.id, request.id));
    await tx.insert(activityLogs).values({
      actorId: actor.profileId,
      action: `live.request_${input.decision}`,
      entityType: "live_session_request",
      entityId: request.id,
      description: "Updated a live-session request decision.",
    });
    if (!withdraw)
      await notify(
        tx,
        input.decision === "approve"
          ? "Your live session is approved"
          : "Live-session request declined",
        input.note.trim() || request.title,
        scheduledId ? `/events/${scheduledId}` : "/mentor/live",
        request.requestedById,
      );
    return {
      ok: true as const,
      message: withdraw
        ? "Request withdrawn."
        : input.decision === "approve"
          ? "Request approved and session published."
          : "Decision shared with the mentor.",
    };
  });
}
export async function setEventRsvp(
  id: number,
  going: boolean,
  viewer: SessionUser | null,
) {
  if (!Number.isSafeInteger(id) || id < 1)
    return { error: "Choose a valid session and refresh its current state." };
  return db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (!actor) return { error: "Sign in required." };
    const [session] = await tx
      .select({ id: liveSessions.id })
      .from(liveSessions)
      .where(
        and(
          eq(liveSessions.id, id),
          inArray(liveSessions.status, ["scheduled", "live"]),
          liveReadable(actor),
        ),
      )
      .for("share")
      .limit(1);
    if (!session)
      return {
        error:
          "Your enrolment or cohort membership does not allow joining this session.",
      };
    if (going)
      await tx
        .insert(liveRsvps)
        .values({ liveSessionId: id, profileId: actor.profileId })
        .onConflictDoNothing();
    else
      await tx
        .delete(liveRsvps)
        .where(
          and(
            eq(liveRsvps.liveSessionId, id),
            eq(liveRsvps.profileId, actor.profileId),
          ),
        );
    return {
      ok: true as const,
      message: going ? "You are on the attendance list." : "RSVP cancelled.",
    };
  });
}

/** Calendar discovery is separate from access to room links, agendas and recordings. */
export async function getEventCalendar(
  viewer: SessionUser | null,
  options: { past?: boolean; limit?: number; id?: number } = {},
) {
  return db
    .select({
      id: liveSessions.id,
      title: liveSessions.title,
      description: liveSessions.description,
      type: liveSessions.type,
      status: liveSessions.status,
      startsAt: liveSessions.startsAt,
      durationMinutes: liveSessions.durationMinutes,
      timezone: liveSessions.timezone,
      isPublic: liveSessions.isPublic,
      hostName: profiles.fullName,
      courseTitle: courses.title,
      cohortName: cohorts.name,
      canJoin: sql<boolean>`coalesce((${liveReadable(viewer)}),false)`,
      hostId: liveSessions.hostId,
      updatedAt: liveSessions.updatedAt,
      myRsvp: viewer
        ? sql<boolean>`exists(select 1 from ${liveRsvps} where ${liveRsvps.liveSessionId}=${liveSessions.id} and ${liveRsvps.profileId}=${viewer.profileId})`
        : sql<boolean>`false`,
    })
    .from(liveSessions)
    .leftJoin(profiles, eq(liveSessions.hostId, profiles.id))
    .leftJoin(courses, eq(liveSessions.courseId, courses.id))
    .leftJoin(cohorts, eq(liveSessions.cohortId, cohorts.id))
    .where(
      and(
        !viewer ? eq(liveSessions.isPublic, true) : undefined,
        options.id
          ? eq(liveSessions.id, options.id)
          : options.past
            ? or(
                inArray(liveSessions.status, ["ended", "cancelled"]),
                and(
                  eq(liveSessions.status, "scheduled"),
                  sql.raw(
                    "live_sessions.starts_at + make_interval(mins => live_sessions.duration_minutes) < now()",
                  ),
                ),
              )
            : and(
                inArray(liveSessions.status, ["scheduled", "live"]),
                sql`(${liveSessions.status}='live' or ${liveSessions.startsAt}+make_interval(mins => ${liveSessions.durationMinutes}) >= now())`,
              ),
      ),
    )
    .orderBy(
      sql`case when ${liveSessions.status}='live' then 0 else 1 end`,
      options.past
        ? sql`${liveSessions.startsAt} desc`
        : asc(liveSessions.startsAt),
    )
    .limit(Math.min(options.limit ?? 40, 100));
}
export async function getSessionRequests(viewer: SessionUser) {
  return db
    .select({ request: liveSessionRequests, mentorName: profiles.fullName })
    .from(liveSessionRequests)
    .innerJoin(profiles, eq(liveSessionRequests.requestedById, profiles.id))
    .where(
      canScheduleEvents(viewer)
        ? undefined
        : eq(liveSessionRequests.requestedById, viewer.profileId),
    )
    .orderBy(
      sql`case when ${liveSessionRequests.status}='pending' then 0 else 1 end`,
      sql`${liveSessionRequests.createdAt} desc`,
    )
    .limit(50);
}
export async function getEventOptions(viewer: SessionUser) {
  const [courseRows, cohortRows, hostRows] = await Promise.all([
    db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(eq(courses.status, "published"))
      .orderBy(courses.title),
    db
      .select({ id: cohorts.id, name: cohorts.name, levelId: cohorts.levelId })
      .from(cohorts)
      .where(
        and(
          eq(cohorts.status, "active"),
          canScheduleEvents(viewer)
            ? undefined
            : sql`exists(select 1 from ${cohortMembers} where ${cohortMembers.cohortId}=${cohorts.id} and ${cohortMembers.profileId}=${viewer.profileId} and ${cohortMembers.status}='active' and ${cohortMembers.role} in ('mentor','facilitator'))`,
        ),
      )
      .orderBy(cohorts.name),
    db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        roleSlug: roles.slug,
        permissions: roles.permissions,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(eq(users.isActive, true))
      .orderBy(profiles.fullName),
  ]);
  return {
    courses: courseRows,
    cohorts: cohortRows,
    hosts: hostRows
      .filter(
        (actor) =>
          can(actor, "mentorship.coach") ||
          can(actor, "academy.author") ||
          can(actor, "academy.oversee"),
      )
      .map(({ id, fullName }) => ({ id, fullName })),
  };
}

export async function attachEventRecording(
  input: { id: number; version: string; url: string },
  viewer: SessionUser | null,
) {
  if (!Number.isSafeInteger(input.id) || input.id < 1 || !input.version)
    return { error: "Choose a valid session and refresh its current state." };
  if (!safeContentUrl(input.url, true))
    return { error: "Choose a valid recording link." };
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw("select pg_advisory_xact_lock(725104,5)"));
    const actor = await currentActor(tx, viewer);
    if (!actor) return { error: "Sign in required." };
    const [session] = await tx
      .select()
      .from(liveSessions)
      .where(eq(liveSessions.id, input.id))
      .for("update")
      .limit(1);
    if (
      !session ||
      !(
        canScheduleEvents(actor) ||
        (session.hostId === actor.profileId && can(actor, "mentorship.coach"))
      )
    )
      return { error: "Host access required." };
    if (
      session.updatedAt.toISOString() !== input.version ||
      !["live", "ended"].includes(session.status)
    )
      return {
        error:
          "End or open the session first, then refresh before attaching its recording.",
      };
    await tx
      .update(liveSessions)
      .set({
        recordingUrl: input.url,
        status: "ended",
        updatedAt: new Date(
          Math.max(Date.now(), session.updatedAt.getTime() + 1),
        ),
      })
      .where(eq(liveSessions.id, session.id));
    await tx.insert(activityLogs).values({
      actorId: actor.profileId,
      action: "live.recording_added",
      entityType: "live_session",
      entityId: String(session.id),
      description: "Published a protected session recording.",
    });
    await notify(
      tx,
      "Session recording available",
      session.title,
      "/events/" + session.id,
    );
    return {
      ok: true as const,
      message: "Recording attached and shared with eligible participants.",
    };
  });
}
