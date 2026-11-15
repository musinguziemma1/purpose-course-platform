"use server";

import { revalidatePath } from "next/cache";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { changeProfileRole } from "@/db/people-roles";
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

  const result = await changeProfileRole(profileId, roleSlug, user);
  revalidatePath("/admin/people");
  revalidatePath("/admin");
  revalidatePath("/admin/enrollments");
  return result;
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
