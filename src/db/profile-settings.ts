import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, profiles, mediaAssets } from "@/db/schema";
import { currentActor } from "@/db/actor";
import type { SessionUser } from "@/lib/auth";
import { profileError, type ProfileInput } from "@/lib/profile";
import { canUseMediaLibrary } from "@/lib/media-files";

export async function saveOwnProfile(
  input: ProfileInput,
  viewer: SessionUser | null,
) {
  const fields = [
    "fullName",
    "title",
    "bio",
    "phone",
    "location",
    "timezone",
    "avatarUrl",
  ] as const;
  const clean = Object.fromEntries(
    fields.map((key) => [key, String(input[key] ?? "").trim()]),
  ) as ProfileInput;
  const error = profileError(clean);
  if (error) return { error };
  return db.transaction(async (tx) => {
    if (viewer)
      await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, viewer.profileId))
        .for("update");
    const actor = await currentActor(tx, viewer);
    if (!actor)
      return {
        error: "Sign in with an active account to update your profile.",
      };
    if (clean.avatarUrl.startsWith("/api/media/")) {
      const [image] = await tx
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.id, clean.avatarUrl.slice(11)),
            eq(mediaAssets.kind, "image"),
            eq(mediaAssets.purpose, "library"),
            eq(mediaAssets.state, "ready"),
          ),
        )
        .limit(1);
      if (!canUseMediaLibrary(actor) || !image)
        return {
          error:
            "Choose a photo you can access from the staff library, or use an HTTPS image URL.",
        };
    }
    await tx
      .update(profiles)
      .set({
        ...clean,
        avatarUrl: clean.avatarUrl || null,
        title: clean.title || null,
        profileCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, actor.profileId));
    await tx
      .insert(activityLogs)
      .values({
        actorId: actor.profileId,
        action: "profile.updated",
        entityType: "profile",
        entityId: actor.profileId,
        description:
          "Updated own profile and completed required contact details.",
      });
    return {
      ok: true,
      message: "Your profile is complete. Your changes have been saved.",
    };
  });
}
