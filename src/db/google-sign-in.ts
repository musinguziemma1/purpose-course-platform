import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, profiles, roles, users } from "@/db/schema";
import { homePathForRole } from "@/lib/roles";
import { profileIsComplete } from "@/lib/profile";

export type GoogleAccountMatch = { status: "ok"; userId: string } | { status: "no-account" } | { status: "inactive" };

/** Google proves the email; only an existing, active Purpose Course account may sign in with it. */
export async function accountForGoogleEmail(email: string): Promise<GoogleAccountMatch> {
  const [row] = await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  if (!row) return { status: "no-account" };
  if (!row.isActive) return { status: "inactive" };
  return { status: "ok", userId: row.id };
}

export async function recordGoogleSignIn(userId: string) {
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  await db.insert(activityLogs).values({ actorId: profile?.id ?? null, action: "auth.google_sign_in", entityType: "user", entityId: userId, description: "Signed in with Google." });
}

/** Where a person lands after signing in: their workspace, or profile completion first. */
export async function workspaceHomeForUser(userId: string) {
  const [row] = await db
    .select({ roleSlug: roles.slug, fullName: profiles.fullName, phone: profiles.phone, location: profiles.location, bio: profiles.bio, profileCompletedAt: profiles.profileCompletedAt })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row && profileIsComplete(row) ? homePathForRole(row.roleSlug) : "/account?complete=1";
}
