"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, authSessions, users } from "@/db/schema";
import { destroySession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { passwordError } from "../../../scripts/password-security.mjs";
import { revalidatePath } from "next/cache";
import { saveOwnProfile } from "@/db/profile-settings";
import type { ProfileInput } from "@/lib/profile";

export type ProfileState = { ok?: boolean; error?: string; message?: string };

export async function updateOwnProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const keys = ["fullName", "title", "bio", "phone", "location", "timezone", "avatarUrl"] as const;
  const input = Object.fromEntries(keys.map(key => [key, String(formData.get(key) ?? "")])) as ProfileInput;
  const result = await saveOwnProfile(input, await getSessionUser());
  if ("ok" in result && result.ok) revalidatePath("/", "layout");
  return result;
}

export type PasswordState = { error?: string };

export async function changePassword(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  const viewer = await getSessionUser();
  if (!viewer || viewer.isDemo) return { error: "Sign in to change your password." };
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const error = passwordError(next);
  if (error) return { error };
  if (next !== String(formData.get("confirmPassword") ?? "")) return { error: "The new passwords do not match." };
  if (current === next) return { error: "Choose a different password." };
  const changed = await db.transaction(async (tx) => {
    const [account] = await tx.select().from(users).where(eq(users.id, viewer.userId)).for("update").limit(1);
    if (!account?.isActive || !verifyPassword(current, account.passwordHash)) return false;
    await tx.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, viewer.userId));
    await tx.delete(authSessions).where(eq(authSessions.userId, viewer.userId));
    await tx.insert(activityLogs).values({ actorId: viewer.profileId, action: "security.password_changed", entityType: "user", entityId: viewer.userId, description: "Changed account password and revoked existing sessions." });
    return true;
  });
  if (!changed) return { error: "The current password is incorrect." };
  await destroySession();
  redirect("/login?password=changed");
}
