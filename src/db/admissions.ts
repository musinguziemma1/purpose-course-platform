import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  admissionRequests,
  courseLevels,
  enrollments,
  notifications,
  organizations,
  orgMemberships,
  profiles,
  roles,
  users,
} from "@/db/schema";
import { currentActor } from "@/db/actor";
import { can } from "@/lib/rbac";
import { canUseMediaLibrary } from "@/lib/media-files";
import { isUuid, validContactEmail } from "@/lib/contact";
import {
  hashPassword,
  passwordError,
} from "../../scripts/password-security.mjs";
import type { SessionUser } from "@/lib/auth";

export function canReviewAdmissions(
  viewer: { roleSlug: string; permissions?: string[] } | null,
) {
  return (
    canUseMediaLibrary(viewer) &&
    (can(viewer, "people.manage") || can(viewer, "cohort.manage"))
  );
}

export async function requestAdmission(
  input: {
    email: string;
    fullName: string;
    password: string;
    notes: string;
    consent: boolean;
    website: string;
  },
  rateKey: string,
) {
  const ok = {
    ok: true,
    message:
      "Your application has been received. Staff must approve access before you can sign in. Use the password you chose after approval.",
  };
  if (input.website) return ok;
  const email = input.email.trim().toLowerCase(),
    fullName = input.fullName.trim(),
    notes = input.notes.trim();
  if (
    !validContactEmail(email) ||
    fullName.length < 2 ||
    fullName.length > 160 ||
    notes.length > 2000 ||
    !/^[a-f0-9]{64}$/.test(rateKey)
  )
    return {
      error:
        "Enter a valid name and email address; keep your introduction within 2,000 characters.",
    };
  if (!input.consent)
    return { error: "Confirm that you have read the privacy notice." };
  const invalid = passwordError(input.password);
  if (invalid) return { error: invalid };
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${rateKey}, 8540))`,
    );
    const recent = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(admissionRequests)
      .where(
        and(
          eq(admissionRequests.rateKey, rateKey),
          sql`${admissionRequests.createdAt} > clock_timestamp() - interval '1 hour'`,
        ),
      );
    if (recent[0].count >= 5)
      return {
        error:
          "Too many applications from this connection. Please try again later.",
      };
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${email}, 8512))`,
    );
    const [account] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const [existing] = await tx
      .select({ id: admissionRequests.id })
      .from(admissionRequests)
      .where(eq(admissionRequests.email, email))
      .limit(1);
    if (account || existing) return ok; // Do not disclose existing accounts or replace another applicant's password.
    const [request] = await tx
      .insert(admissionRequests)
      .values({
        email,
        fullName,
        notes: notes || null,
        passwordHash: hashPassword(input.password),
        rateKey,
      })
      .returning({ id: admissionRequests.id });
    const staff = await tx
      .select({
        id: profiles.id,
        roleSlug: roles.slug,
        permissions: roles.permissions,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(and(eq(users.isActive, true), eq(users.isDemoAccount, false)))
      .for("key share", { of: profiles });
    const recipients = staff.filter(canReviewAdmissions);
    if (recipients.length)
      await tx
        .insert(notifications)
        .values(
          recipients.map((person) => ({
            recipientId: person.id,
            type: "system" as const,
            title: "Student application awaiting review",
            body: "A new application is ready for staff approval.",
            href: `/admin/admissions?application=${request.id}`,
          })),
        );
    await tx
      .insert(activityLogs)
      .values({
        action: "admission.requested",
        entityType: "admission_request",
        entityId: request.id,
        description: "Received an application for staff review.",
      });
    return ok;
  });
}

export async function reviewAdmission(
  id: string,
  decision: "approve" | "decline",
  viewer: SessionUser | null,
) {
  if (!isUuid(id) || !["approve", "decline"].includes(decision))
    return { error: "Choose a valid application and decision." };
  return db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (!actor || !canReviewAdmissions(actor))
      return { error: "Admission review permission required." };
    const [lookup] = await tx
      .select({ email: admissionRequests.email })
      .from(admissionRequests)
      .where(eq(admissionRequests.id, id))
      .limit(1);
    if (!lookup) return { error: "Application not found." };
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${lookup.email}, 8512))`,
    );
    const [request] = await tx
      .select()
      .from(admissionRequests)
      .where(eq(admissionRequests.id, id))
      .for("update")
      .limit(1);
    if (request.status !== "pending")
      return {
        error: "This application has already been reviewed. Refresh the list.",
      };
    if (decision === "approve") {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, request.email))
        .limit(1);
      if (existing || !request.passwordHash)
        return {
          error:
            "An account already exists or this application needs recovery. Use People & access.",
        };
      const [role] = await tx
        .select()
        .from(roles)
        .where(eq(roles.slug, "student"))
        .limit(1);
      const [organization] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.status, "active"))
        .orderBy(asc(organizations.id))
        .limit(1);
      const [level] = await tx
        .select()
        .from(courseLevels)
        .orderBy(asc(courseLevels.levelNumber), asc(courseLevels.id))
        .limit(1);
      if (!role || !organization || !level)
        return {
          error:
            "Configure the launch organization and first course level before approving students.",
        };
      const [account] = await tx
        .insert(users)
        .values({ email: request.email, passwordHash: request.passwordHash })
        .returning({ id: users.id });
      const [profile] = await tx
        .insert(profiles)
        .values({
          userId: account.id,
          roleId: role.id,
          fullName: request.fullName,
          slug: `member-${randomUUID()}`,
          organizationId: organization.id,
        })
        .returning({ id: profiles.id });
      await tx
        .insert(orgMemberships)
        .values({
          organizationId: organization.id,
          profileId: profile.id,
          roleSlug: "student",
        });
      const [interest] = await tx
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.email, request.email),
            eq(enrollments.levelId, level.id),
          ),
        )
        .limit(1);
      if (interest && interest.profileId)
        throw new Error(
          "Existing enrolment ownership requires staff recovery.",
        );
      if (interest)
        await tx
          .update(enrollments)
          .set({
            profileId: profile.id,
            fullName: request.fullName,
            status: "enrolled",
          })
          .where(eq(enrollments.id, interest.id));
      else
        await tx
          .insert(enrollments)
          .values({
            profileId: profile.id,
            fullName: request.fullName,
            email: request.email,
            levelId: level.id,
            status: "enrolled",
          });
      await tx
        .insert(notifications)
        .values({
          recipientId: profile.id,
          type: "system",
          title: "Your application is approved",
          body: "Complete your profile to begin your first level.",
          href: "/account",
        });
    }
    await tx
      .update(admissionRequests)
      .set({
        status: decision === "approve" ? "approved" : "declined",
        passwordHash: null,
        reviewedById: actor.profileId,
        reviewedAt: new Date(),
      })
      .where(eq(admissionRequests.id, id));
    await tx
      .insert(activityLogs)
      .values({
        actorId: actor.profileId,
        action: `admission.${decision === "approve" ? "approved" : "declined"}`,
        entityType: "admission_request",
        entityId: id,
        description:
          "Reviewed a student application; role and first-level admission were set by the server.",
      });
    return {
      ok: true,
      message:
        decision === "approve"
          ? "Student account approved and enrolled in the first level. The student can now sign in with their chosen password."
          : "Application declined. No account was created.",
    };
  });
}
