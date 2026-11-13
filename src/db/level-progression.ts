import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  certificates,
  courseLevels,
  courses,
  enrollments,
  notifications,
  profiles,
} from "@/db/schema";
import { currentActor, type Transaction } from "@/db/actor";
import { awardEarnedCertificates } from "@/db/certificate-awards";
import type { SessionUser } from "@/lib/auth";

async function progression(tx: Transaction, profileId: string) {
  const levels = await tx
    .select()
    .from(courseLevels)
    .orderBy(asc(courseLevels.levelNumber), asc(courseLevels.id));
  const earned = await tx
    .select({ levelId: certificates.levelId })
    .from(certificates)
    .where(
      and(
        eq(certificates.profileId, profileId),
        eq(certificates.kind, "level"),
        isNull(certificates.revokedAt),
      ),
    );
  const existing = await tx
    .select()
    .from(enrollments)
    .where(eq(enrollments.profileId, profileId));
  const published = await tx
    .select({ levelId: courses.levelId })
    .from(courses)
    .where(eq(courses.status, "published"));
  return levels.map((level, index) => {
    const enrollment = existing.find((row) => row.levelId === level.id);
    const completed = earned.some((row) => row.levelId === level.id);
    const prerequisiteMet =
      index === 0 || earned.some((row) => row.levelId === levels[index - 1].id);
    const available = published.some((row) => row.levelId === level.id);
    return {
      ...level,
      completed,
      prerequisiteMet,
      available,
      enrollmentStatus: enrollment?.status ?? null,
      canEnroll:
        index > 0 &&
        prerequisiteMet &&
        available &&
        !completed &&
        (!enrollment || enrollment.status === "waitlist"),
    };
  });
}

export async function getLevelProgression(viewer: SessionUser) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, viewer.profileId))
      .for("update");
    // Reconcile learners who passed before next-level enrolment was implemented.
    await awardEarnedCertificates(tx, viewer.profileId);
    return progression(tx, viewer.profileId);
  });
}

export async function enrollInNextLevel(
  levelId: number,
  viewer: SessionUser | null,
) {
  if (!Number.isSafeInteger(levelId) || levelId < 1)
    return { error: "Choose a valid level." };
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
    await awardEarnedCertificates(tx, actor.profileId);
    const target = (await progression(tx, actor.profileId)).find(
      (row) => row.id === levelId,
    );
    if (target?.enrollmentStatus === "enrolled" && target.prerequisiteMet)
      return { ok: true, message: "You are already enrolled in this level." };
    if (!target?.canEnroll)
      return {
        error:
          target?.enrollmentStatus === "paused"
            ? "Your enrolment is paused. Contact your programme team."
            : "Pass the previous level examination and complete its required learning before enrolling in this level.",
      };
    const existing = await tx
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.email, actor.email),
          eq(enrollments.levelId, levelId),
        ),
      )
      .limit(1);
    if (existing[0] && existing[0].profileId !== actor.profileId)
      return {
        error: "Contact your programme team to resolve this enrolment.",
      };
    if (existing[0])
      await tx
        .update(enrollments)
        .set({ status: "enrolled" })
        .where(eq(enrollments.id, existing[0].id));
    else
      await tx
        .insert(enrollments)
        .values({
          profileId: actor.profileId,
          email: actor.email,
          fullName: actor.fullName,
          levelId,
          status: "enrolled",
        });
    await tx
      .insert(activityLogs)
      .values({
        actorId: actor.profileId,
        action: "learning.level_enrolled",
        entityType: "level",
        entityId: String(levelId),
        description:
          "Enrolled in the next level after verified previous-level completion.",
      });
    await tx
      .insert(notifications)
      .values({
        recipientId: actor.profileId,
        type: "system",
        title: `${target.name} is ready`,
        body: "You are enrolled. Open your courses to continue learning.",
        href: "/learn/courses",
      });
    return {
      ok: true,
      message: `You are now enrolled in ${target.name}. Your lessons are available.`,
    };
  });
}
