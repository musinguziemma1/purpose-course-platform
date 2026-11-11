"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, authSessions, enrollments, notifications, profiles, roles } from "@/db/schema";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { canAssignRole } from "@/lib/admin-access";
import { createInvitation, revokeInvitation } from "@/db/invitations";
import { emailConfigurationError } from "@/lib/email";

export type PeopleState = { ok?: boolean; error?: string; message?: string };

export async function updateProfileRole(_prev: PeopleState, formData: FormData): Promise<PeopleState> {
  const user = await getSessionUser();
  if (!user || !canManagePeople(user)) return { error: "Administrator access required." };

  const profileId = String(formData.get("profileId") ?? "");
  const roleSlug = String(formData.get("roleSlug") ?? "");
  if (!profileId || !roleSlug) return { error: "Choose a role first." };
  if (profileId === user.profileId) return { error: "You cannot change your own role. Ask another administrator." };

  const roleRows = await db.select().from(roles).where(eq(roles.slug, roleSlug)).limit(1);
  const role = roleRows[0];
  if (!role) return { error: "That role does not exist." };

  const profileRows = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  const profile = profileRows[0];
  if (!profile) return { error: "Profile not found." };
  const [currentRole] = await db.select({ slug: roles.slug }).from(roles).where(eq(roles.id, profile.roleId)).limit(1);
  if (!canAssignRole(user, currentRole?.slug ?? "guest", roleSlug)) return { error: "Only a Super Admin can grant or change Super Admin access." };

  const changed = await db.transaction(async (tx) => {
    const [locked] = await tx.select({ role: roles.slug }).from(profiles).innerJoin(roles, eq(profiles.roleId, roles.id)).where(eq(profiles.id, profileId)).for("update", { of: profiles }).limit(1);
    if (!locked || !canAssignRole(user, locked.role, roleSlug)) return false;
    await tx.update(profiles).set({ roleId: role.id, updatedAt: new Date() }).where(eq(profiles.id, profileId));
    await tx.delete(authSessions).where(eq(authSessions.userId, profile.userId));
    return true;
  });
  if (!changed) return { error: "The account role changed. Refresh before updating it." };

  if (roleSlug === "student") {
    const existing = await db.select().from(enrollments).where(eq(enrollments.profileId, profileId)).limit(1);
    if (!existing[0]) {
      await db.insert(enrollments).values({
        profileId,
        email: `${profile.slug}@purposecourse.org`,
        fullName: profile.fullName,
        cohort: "Cohort 04 · 2026",
        status: "enrolled",
      });
    }
  }

  await db.insert(notifications).values({
    recipientId: profileId,
    type: "system",
    title: "Your access level changed",
    body: `An administrator set your role to ${role.name}. Your workspace is now ${roleSlug === "student" ? "/learn" : roleSlug === "mentor" ? "/mentor" : "/admin"}.`,
    href: roleSlug === "student" ? "/learn" : roleSlug === "mentor" ? "/mentor" : "/admin",
  });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "people.role_updated",
    entityType: "profile",
    entityId: profileId,
    description: `Changed ${profile.fullName}'s role to ${role.name}.`,
  });

  revalidatePath("/admin/people");
  revalidatePath("/admin");
  return { ok: true, message: `${profile.fullName} is now a ${role.name}.` };
}

export async function inviteAccount(_prev: PeopleState, formData: FormData): Promise<PeopleState> {
  const user = await getSessionUser();
  if (!user || !canManagePeople(user)) return { error: "Administrator access required." };

  const configurationError = emailConfigurationError();
  if (configurationError) return { error: configurationError };
  const result = await createInvitation({ email: String(formData.get("email") ?? ""), fullName: String(formData.get("fullName") ?? ""), roleSlug: String(formData.get("roleSlug") ?? "student") }, user);
  revalidatePath("/admin/people");
  revalidatePath("/admin/notifications");
  return result;
}

export async function revokeAccountInvitation(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canManagePeople(user)) return;
  await revokeInvitation(String(formData.get("invitationId") ?? ""), user);
  revalidatePath("/admin/people");
  revalidatePath("/admin/notifications");
}
