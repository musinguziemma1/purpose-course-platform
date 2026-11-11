"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, enrollments, notifications, profiles, roles } from "@/db/schema";
import { canManagePeople, getSessionUser } from "@/lib/auth";

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

  await db.update(profiles).set({ roleId: role.id, updatedAt: new Date() }).where(eq(profiles.id, profileId));

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

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleSlug = String(formData.get("roleSlug") ?? "student");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };

  await db.insert(notifications).values({
    recipientId: user.profileId,
    type: "system",
    title: "Invitation queued",
    body: `An invitation for ${email} (${roleSlug}) is ready to send. Sign-in credentials are provisioned by the administrator.`,
    href: "/admin/people",
  });

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "people.invite_queued",
    entityType: "profile",
    description: `Queued a ${roleSlug} invitation for ${email}.`,
  });

  revalidatePath("/admin/people");
  return { ok: true, message: `Invitation for ${email} queued. The demo workspaces already include one account per role.` };
}
