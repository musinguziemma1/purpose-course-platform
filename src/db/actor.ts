import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, roles, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Recheck active identity and current permissions inside the write transaction. */
export async function currentActor(
  tx: Transaction,
  viewer: SessionUser | null,
) {
  if (!viewer || viewer.isDemo) return null;
  const [row] = await tx
    .select({
      profileId: profiles.id,
      userId: users.id,
      email: users.email,
      fullName: profiles.fullName,
      roleSlug: roles.slug,
      permissions: roles.permissions,
      isDemoAccount: users.isDemoAccount,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(eq(profiles.id, viewer.profileId), eq(users.isActive, true)))
    .for("share", { of: profiles })
    .limit(1);
  return row ? { ...viewer, ...row } : null;
}
