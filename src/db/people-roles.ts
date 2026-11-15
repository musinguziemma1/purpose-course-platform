import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, authSessions, enrollments, notifications, orgMemberships, profiles, roles } from "@/db/schema";
import { currentActor } from "@/db/actor";
import { canAssignRole } from "@/lib/admin-access";
import { isUuid } from "@/lib/contact";
import { homePathForRole } from "@/lib/roles";
import { can } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";

/** Access changes never imply admission to a programme or placement in a cohort. */
export async function changeProfileRole(profileId: string, roleSlug: string, viewer: SessionUser | null) {
  if (!isUuid(profileId) || !roleSlug || roleSlug.length > 64) return { error: "Choose a valid person and role." };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(725104, 6)`);
    const actor = await currentActor(tx, viewer);
    if (!actor || !can(actor, "people.manage")) return { error: "Administrator access required." };
    if (profileId.toLowerCase() === actor.profileId.toLowerCase()) return { error: "You cannot change your own role. Ask another administrator." };
    const [role] = await tx.select().from(roles).where(eq(roles.slug, roleSlug)).limit(1);
    if (!role) return { error: "That role does not exist." };
    const [target] = await tx.select({ profile: profiles, roleSlug: roles.slug }).from(profiles)
      .innerJoin(roles, eq(profiles.roleId, roles.id)).where(eq(profiles.id, profileId))
      .for("update", { of: profiles }).limit(1);
    if (!target) return { error: "Profile not found." };
    if (!canAssignRole(actor, target.roleSlug, roleSlug)) return { error: "Only a Super Admin can grant or change Super Admin access." };
    if (target.roleSlug === roleSlug) return { ok: true as const, message: "This person already has that role." };
    if (target.roleSlug === "student" && roleSlug !== "student") {
      const [active] = await tx.select({ id: enrollments.id }).from(enrollments)
        .where(and(eq(enrollments.profileId, profileId), eq(enrollments.status, "enrolled"))).limit(1);
      if (active) return { error: "Pause or complete this student's active enrolments before changing their role. Learning progress will be preserved." };
    }
    await tx.update(profiles).set({ roleId: role.id, updatedAt: new Date() }).where(eq(profiles.id, profileId));
    await tx.update(orgMemberships).set({ roleSlug }).where(eq(orgMemberships.profileId, profileId));
    await tx.delete(authSessions).where(eq(authSessions.userId, target.profile.userId));
    await tx.insert(notifications).values({ recipientId: profileId, type: "system", title: "Your access level changed",
      body: `An administrator set your role to ${role.name}.${roleSlug === "student" ? " The programme team manages level enrolment and cohort placement separately." : ""}`,
      href: homePathForRole(roleSlug) });
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "people.role_updated", entityType: "profile", entityId: profileId,
      description: `Changed role from ${target.roleSlug} to ${roleSlug}. Existing learning records were preserved.` });
    return { ok: true as const, message: `${target.profile.fullName} is now a ${role.name}.${roleSlug === "student" ? " Use Enrolments to select their level and cohort." : ""}` };
  });
}
