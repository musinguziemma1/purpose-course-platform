import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  activityLogs,
  certificates,
  cohortMembers,
  cohorts,
  cohortWeeks,
  courseLevels,
  courses,
  enrollments,
  liveSessions,
  notifications,
  profiles,
  roles,
  users,
} from "@/db/schema";
import { currentActor, type Transaction } from "@/db/actor";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isUuid } from "@/lib/contact";
import { slugify } from "@/lib/utils";
export type CohortInput = {
  id?: number;
  version?: string;
  name: string;
  description: string;
  levelId: number;
  courseId: number | null;
  capacity: number;
  startsAt: string;
  endsAt: string;
  cadence: string;
  status: string;
  weeks: string;
};
async function audit(
  tx: Transaction,
  actor: SessionUser,
  action: string,
  entityId: string,
) {
  await tx
    .insert(activityLogs)
    .values({
      actorId: actor.profileId,
      action,
      entityType: "cohort_enrolment",
      entityId,
      description: "Updated cohort or enrolment controls.",
    });
}
async function allowed(tx: Transaction, viewer: SessionUser | null) {
  const actor = await currentActor(tx, viewer);
  return actor && can(actor, "cohort.manage") ? actor : null;
}
export async function saveCohortSetup(
  input: CohortInput,
  viewer: SessionUser | null,
) {
  const startsAt = new Date(input.startsAt),
    endsAt = new Date(input.endsAt);
  if (
    input.name.trim().length < 6 ||
    input.name.trim().length > 180 ||
    input.description.trim().length < 30 ||
    input.description.length > 10000 ||
    input.cadence.length > 120
  )
    return {
      error:
        "Use a name of 6–180 characters and a description of at least 30 characters.",
    };
  if (
    !Number.isInteger(input.capacity) ||
    input.capacity < 1 ||
    input.capacity > 10000 ||
    !Number.isSafeInteger(input.levelId) ||
    input.levelId < 1 ||
    !["draft", "active", "completed", "cancelled"].includes(input.status)
  )
    return {
      error: "Choose a level, valid status and capacity between 1 and 10,000.",
    };
  if (
    !Number.isFinite(startsAt.getTime()) ||
    !Number.isFinite(endsAt.getTime()) ||
    endsAt <= startsAt
  )
    return { error: "The cohort end date must follow its start date." };
  const weekTitles = input.weeks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (weekTitles.length > 104 || weekTitles.some((line) => line.length > 250))
    return { error: "Use at most 104 weeks with short titles." };
  if (
    weekTitles.length >
    Math.ceil((endsAt.getTime() - startsAt.getTime()) / (7 * 86400000))
  )
    return {
      error:
        "The week plan must fit within the cohort dates. Extend the dates or shorten the plan.",
    };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104, 5)`);
    await tx.execute(sql`select pg_advisory_xact_lock(725104, 6)`);
    const actor = await allowed(tx, viewer);
    if (!actor) return { error: "Cohort management permission required." };
    const [level] = await tx
      .select()
      .from(courseLevels)
      .where(eq(courseLevels.id, input.levelId))
      .limit(1);
    if (!level) return { error: "Choose an existing level." };
    if (input.courseId) {
      const [course] = await tx
        .select()
        .from(courses)
        .where(
          and(
            eq(courses.id, input.courseId),
            eq(courses.levelId, input.levelId),
          ),
        )
        .limit(1);
      if (!course)
        return { error: "The course must belong to the selected level." };
    }
    const [old] = input.id
      ? await tx
          .select()
          .from(cohorts)
          .where(eq(cohorts.id, input.id))
          .for("update")
          .limit(1)
      : [];
    if (input.id && (!old || old.updatedAt.toISOString() !== input.version))
      return { error: "This cohort changed. Refresh before saving." };
    if (
      old &&
      ["completed", "cancelled"].includes(old.status) &&
      input.status !== old.status
    )
      return {
        error:
          "Completed or cancelled cohorts cannot be reopened. Create the next cohort instead.",
      };
    if (old) {
      const [size] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(cohortMembers)
        .where(
          and(
            eq(cohortMembers.cohortId, old.id),
            eq(cohortMembers.role, "learner"),
            eq(cohortMembers.status, "active"),
          ),
        );
      if (input.capacity < size.count)
        return {
          error:
            "Capacity cannot be lower than the current active learner count.",
        };
      const [members] = await tx
        .select({ id: cohortMembers.id })
        .from(cohortMembers)
        .where(eq(cohortMembers.cohortId, old.id))
        .limit(1);
      if (
        members &&
        (old.levelId !== input.levelId || old.courseId !== input.courseId)
      )
        return {
          error:
            "A cohort with members must retain its level and course. Transfer learners to another cohort instead.",
        };
      const [conflict] = await tx
        .select({ id: liveSessions.id })
        .from(liveSessions)
        .where(
          and(
            eq(liveSessions.cohortId, old.id),
            inArray(liveSessions.status, ["scheduled", "live"]),
            sql`(${liveSessions.startsAt}<${startsAt} or ${liveSessions.startsAt}+make_interval(mins => ${liveSessions.durationMinutes})>${endsAt})`,
          ),
        )
        .limit(1);
      if (conflict && input.status !== "cancelled")
        return {
          error:
            "These dates would exclude a scheduled session. Reschedule the session first.",
        };
      if (input.status === "completed") {
        const [pending] = await tx
          .select({ id: liveSessions.id })
          .from(liveSessions)
          .where(
            and(
              eq(liveSessions.cohortId, old.id),
              inArray(liveSessions.status, ["scheduled", "live"]),
            ),
          )
          .limit(1);
        if (pending)
          return {
            error:
              "End or cancel the cohort's remaining live sessions before completing it.",
          };
      }
    }
    const data = {
      name: input.name.trim(),
      description: input.description.trim(),
      levelId: input.levelId,
      courseId: input.courseId,
      startsAt,
      endsAt,
      capacity: input.capacity,
      cadence: input.cadence.trim() || "Weekly live class and reflection",
      status: input.status,
      updatedAt: new Date(
        Math.max(Date.now(), (old?.updatedAt.getTime() ?? 0) + 1),
      ),
    };
    const [saved] = old
      ? await tx
          .update(cohorts)
          .set(data)
          .where(eq(cohorts.id, old.id))
          .returning()
      : await tx
          .insert(cohorts)
          .values({
            ...data,
            slug: `${slugify(data.name).slice(0, 75)}-${randomUUID().slice(0, 8)}`,
          })
          .returning();
    if (!old && weekTitles.length)
      await tx.insert(cohortWeeks).values(
        weekTitles.map((line, i) => {
          const [title, theme] = line.split("|").map((value) => value.trim());
          return {
            cohortId: saved.id,
            weekNumber: i + 1,
            title: title.slice(0, 180),
            theme: (theme || title).slice(0, 120),
            focus: title,
            startsAt: new Date(startsAt.getTime() + i * 7 * 86400000),
            endsAt: new Date(
              Math.min(
                endsAt.getTime(),
                startsAt.getTime() + (i + 1) * 7 * 86400000 - 1,
              ),
            ),
          };
        }),
      );
    if (old && old.name !== saved.name)
      await tx
        .update(enrollments)
        .set({ cohort: saved.name.slice(0, 80), updatedAt: new Date() })
        .where(eq(enrollments.cohortId, saved.id));
    if (input.status === "cancelled" && old?.status !== "cancelled") {
      await tx
        .update(liveSessions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(liveSessions.cohortId, saved.id),
            inArray(liveSessions.status, ["scheduled", "live"]),
          ),
        );
      const recipients = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .innerJoin(users, eq(profiles.userId, users.id))
        .where(eq(users.isActive, true))
        .orderBy(profiles.id)
        .for("key share", { of: profiles });
      for (let i = 0; i < recipients.length; i += 200)
        await tx
          .insert(notifications)
          .values(
            recipients
              .slice(i, i + 200)
              .map((row) => ({
                recipientId: row.id,
                type: "system" as const,
                title: "Cohort sessions cancelled",
                body: `Live events for ${saved.name} have been cancelled.`,
                href: "/events",
              })),
          );
    }
    await audit(
      tx,
      actor,
      old ? "cohort.updated" : "cohort.created",
      String(saved.id),
    );
    return {
      ok: true as const,
      id: saved.id,
      message: old
        ? "Cohort settings saved."
        : "Cohort created. Add eligible learners and faculty below.",
    };
  });
}
async function learnerEligibility(
  tx: Transaction,
  profileId: string,
  levelId: number,
) {
  const [person] = await tx
    .select({
      id: profiles.id,
      email: users.email,
      name: profiles.fullName,
      role: roles.slug,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(eq(profiles.id, profileId), eq(users.isActive, true)))
    .limit(1);
  if (!person || person.role !== "student") return null;
  const [enrolment] = await tx
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.profileId, profileId),
        eq(enrollments.levelId, levelId),
      ),
    )
    .limit(1);
  return enrolment ? { person, enrolment } : null;
}
async function placeLearner(
  tx: Transaction,
  cohort: typeof cohorts.$inferSelect,
  profileId: string,
  enrolmentId: string,
) {
  const [existing] = await tx
    .select()
    .from(cohortMembers)
    .where(
      and(
        eq(cohortMembers.cohortId, cohort.id),
        eq(cohortMembers.profileId, profileId),
      ),
    )
    .limit(1);
  const [size] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(cohortMembers)
    .where(
      and(
        eq(cohortMembers.cohortId, cohort.id),
        eq(cohortMembers.role, "learner"),
        eq(cohortMembers.status, "active"),
        ne(cohortMembers.profileId, profileId),
      ),
    );
  if (size.count >= cohort.capacity)
    return "This cohort is full. Increase capacity or choose another cohort.";
  await tx
    .update(cohortMembers)
    .set({ status: "removed" })
    .where(
      and(
        eq(cohortMembers.profileId, profileId),
        eq(cohortMembers.role, "learner"),
        ne(cohortMembers.cohortId, cohort.id),
        sql`exists(select 1 from ${cohorts} c where c.id=${cohortMembers.cohortId} and c.level_id=${cohort.levelId})`,
      ),
    );
  if (existing)
    await tx
      .update(cohortMembers)
      .set({ role: "learner", status: "active" })
      .where(eq(cohortMembers.id, existing.id));
  else
    await tx
      .insert(cohortMembers)
      .values({
        cohortId: cohort.id,
        profileId,
        role: "learner",
        status: "active",
      });
  await tx
    .update(enrollments)
    .set({
      cohortId: cohort.id,
      cohort: cohort.name.slice(0, 80),
      updatedAt: new Date(),
    })
    .where(eq(enrollments.id, enrolmentId));
  return null;
}
export async function changeCohortMember(
  input: { cohortId: number; profileId: string; role: string; status: string },
  viewer: SessionUser | null,
) {
  if (
    !Number.isSafeInteger(input.cohortId) ||
    input.cohortId < 1 ||
    !isUuid(input.profileId) ||
    !["learner", "mentor", "facilitator"].includes(input.role) ||
    !["active", "removed"].includes(input.status)
  )
    return {
      error: "Choose a valid person, cohort role and membership state.",
    };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104,6)`);
    const actor = await allowed(tx, viewer);
    if (!actor) return { error: "Cohort management permission required." };
    await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, input.profileId))
      .for("update");
    const [cohort] = await tx
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, input.cohortId))
      .for("update")
      .limit(1);
    if (!cohort || !["draft", "active"].includes(cohort.status))
      return { error: "Choose a draft or active cohort." };
    const [person] = await tx
      .select({
        id: profiles.id,
        roleSlug: roles.slug,
        permissions: roles.permissions,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(and(eq(profiles.id, input.profileId), eq(users.isActive, true)))
      .limit(1);
    if (!person) return { error: "Choose an active account." };
    if (input.status === "removed") {
      await tx
        .update(cohortMembers)
        .set({ status: "removed" })
        .where(
          and(
            eq(cohortMembers.cohortId, cohort.id),
            eq(cohortMembers.profileId, input.profileId),
          ),
        );
      await tx
        .update(enrollments)
        .set({ cohortId: null, cohort: null, updatedAt: new Date() })
        .where(
          and(
            eq(enrollments.profileId, input.profileId),
            eq(enrollments.cohortId, cohort.id),
          ),
        );
    } else if (input.role === "learner") {
      if (!cohort.levelId)
        return { error: "Set a cohort level before adding learners." };
      const eligible = await learnerEligibility(
        tx,
        input.profileId,
        cohort.levelId,
      );
      if (!eligible || eligible.enrolment.status !== "enrolled")
        return {
          error:
            "Approve this student's enrolment in the cohort's level first. Paused and waitlisted accounts are not eligible.",
        };
      const error = await placeLearner(
        tx,
        cohort,
        input.profileId,
        eligible.enrolment.id,
      );
      if (error) return { error };
    } else {
      if (
        !(
          can(person, "mentorship.coach") ||
          can(person, "academy.author") ||
          can(person, "academy.oversee")
        )
      )
        return {
          error:
            "Faculty membership requires a mentor, instructor or programme administrator.",
        };
      await tx
        .insert(cohortMembers)
        .values({
          cohortId: cohort.id,
          profileId: input.profileId,
          role: input.role,
          status: "active",
        })
        .onConflictDoUpdate({
          target: [cohortMembers.cohortId, cohortMembers.profileId],
          set: { role: input.role, status: "active" },
        });
    }
    await tx
      .insert(notifications)
      .values({
        recipientId: input.profileId,
        type: "system",
        title:
          input.status === "removed"
            ? "Cohort membership updated"
            : "Cohort placement confirmed",
        body: `${cohort.name}: ${input.status === "removed" ? "membership removed" : input.role + " membership active"}. Your learning progress is preserved.`,
        href: person.roleSlug === "student" ? "/learn/cohort" : "/mentor/live",
      });
    await audit(tx, actor, "cohort.membership_changed", String(cohort.id));
    return {
      ok: true as const,
      message:
        input.status === "removed"
          ? "Membership removed. Learning progress is preserved."
          : "Membership and enrolment are synchronized.",
    };
  });
}
export async function manageEnrolment(
  input: {
    id: string;
    version: string;
    status: string;
    cohortId: number | null;
    notes: string;
  },
  viewer: SessionUser | null,
) {
  if (
    !isUuid(input.id) ||
    !["waitlist", "enrolled", "paused", "completed"].includes(input.status) ||
    input.notes.length > 4000 ||
    (input.cohortId !== null &&
      (!Number.isSafeInteger(input.cohortId) || input.cohortId < 1))
  )
    return { error: "Choose a valid enrolment, status and cohort." };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104,6)`);
    const actor = await allowed(tx, viewer);
    if (!actor) return { error: "Enrolment management permission required." };
    const [initial] = await tx
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, input.id))
      .limit(1);
    if (!initial) return { error: "Enrolment not found." };
    if (initial.profileId)
      await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, initial.profileId))
        .for("update");
    const [record] = await tx
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, input.id))
      .for("update")
      .limit(1);
    if (record.updatedAt.toISOString() !== input.version)
      return { error: "This enrolment changed. Refresh before saving." };
    if (record.status === "completed" && input.status !== "completed")
      return {
        error:
          "Completed learning is retained. Enrol the learner in the next level instead.",
      };
    if (!record.levelId)
      return {
        error:
          "This legacy request has no level. Review the student's application and create the correct level admission.",
      };
    let profileId = record.profileId;
    if (!profileId) {
      const [person] = await tx
        .select({ id: profiles.id, role: roles.slug })
        .from(users)
        .innerJoin(profiles, eq(profiles.userId, users.id))
        .innerJoin(roles, eq(profiles.roleId, roles.id))
        .where(and(eq(users.email, record.email), eq(users.isActive, true)))
        .limit(1);
      if (person?.role === "student") profileId = person.id;
    }
    if (!profileId)
      return {
        error:
          "Approve the student's application or invite a Student account first. An interest-list entry is not an approved account.",
      };
    const eligible = await learnerEligibility(tx, profileId, record.levelId);
    const [identity] = await tx
      .select({ email: users.email, role: roles.slug })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(and(eq(profiles.id, profileId), eq(users.isActive, true)))
      .limit(1);
    if (
      !identity ||
      identity.role !== "student" ||
      identity.email !== record.email
    )
      return { error: "The active Student account must match this enrolment." };
    if (input.status === "enrolled" && record.status !== "enrolled") {
      const levels = await tx
        .select()
        .from(courseLevels)
        .orderBy(asc(courseLevels.levelNumber), asc(courseLevels.id));
      const index = levels.findIndex((level) => level.id === record.levelId);
      if (index > 0) {
        const [award] = await tx
          .select({ id: certificates.id })
          .from(certificates)
          .where(
            and(
              eq(certificates.profileId, profileId),
              eq(certificates.levelId, levels[index - 1].id),
              eq(certificates.kind, "level"),
              isNull(certificates.revokedAt),
            ),
          )
          .limit(1);
        if (!award)
          return {
            error:
              "The learner must complete the previous level before this admission can be activated.",
          };
      }
    }
    if (input.status === "completed" && record.status !== "completed") {
      const [award] = await tx
        .select({ id: certificates.id })
        .from(certificates)
        .where(
          and(
            eq(certificates.profileId, profileId),
            eq(certificates.levelId, record.levelId),
            eq(certificates.kind, "level"),
            isNull(certificates.revokedAt),
          ),
        )
        .limit(1);
      if (!award)
        return {
          error:
            "Completion is awarded through the required learning and level examination, not a manual status change.",
        };
    }
    const [cohort] = input.cohortId
      ? await tx
          .select()
          .from(cohorts)
          .where(eq(cohorts.id, input.cohortId))
          .for("update")
          .limit(1)
      : [];
    if (
      input.cohortId &&
      (!cohort ||
        cohort.levelId !== record.levelId ||
        !["draft", "active"].includes(cohort.status))
    )
      return {
        error: "Choose a draft or active cohort in this enrolment's level.",
      };
    if (cohort && input.status === "enrolled") {
      const error = await placeLearner(tx, cohort, profileId, record.id);
      if (error) return { error };
    } else if (input.status !== "completed")
      await tx
        .update(cohortMembers)
        .set({ status: input.status === "paused" ? "paused" : "removed" })
        .where(
          and(
            eq(cohortMembers.profileId, profileId),
            eq(cohortMembers.role, "learner"),
            sql`exists(select 1 from ${cohorts} c where c.id=${cohortMembers.cohortId} and c.level_id=${record.levelId})`,
          ),
        );
    // Keep paused placement for later resumption, but do not activate membership.
    const retained =
      cohort?.id ?? (input.status === "paused" ? record.cohortId : null);
    await tx
      .update(enrollments)
      .set({
        profileId,
        status: input.status as
          | "waitlist"
          | "enrolled"
          | "paused"
          | "completed",
        cohortId: retained,
        cohort: cohort?.name.slice(0, 80) ?? (retained ? record.cohort : null),
        notes: input.notes.trim() || null,
        updatedAt: new Date(
          Math.max(Date.now(), record.updatedAt.getTime() + 1),
        ),
      })
      .where(eq(enrollments.id, record.id));
    await tx
      .insert(notifications)
      .values({
        recipientId: profileId,
        type: "system",
        title: "Enrolment updated",
        body: `Your enrolment is ${input.status}. Learning progress has been retained.`,
        href: "/learn/courses",
      });
    await audit(tx, actor, "enrolment.updated", record.id);
    void eligible;
    return {
      ok: true as const,
      message:
        "Enrolment saved. Course and cohort access now reflect this status.",
    };
  });
}
