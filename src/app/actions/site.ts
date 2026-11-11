"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  courseLevels,
  enrollments,
  notifications,
  profiles,
  roles,
  siteSettings,
  subscribers,
} from "@/db/schema";
import { getSessionUser, roleAtLeast } from "@/lib/auth";

export type EnrollState = { ok?: boolean; error?: string; message?: string };

export async function enrollAction(_prev: EnrollState, formData: FormData): Promise<EnrollState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const levelSlug = String(formData.get("level") ?? "");

  if (!fullName) return { error: "Please share your name so we can prepare your place." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right." };

  const levelRows = levelSlug
    ? await db.select().from(courseLevels).where(eq(courseLevels.slug, levelSlug)).limit(1)
    : [];

  try {
    await db
      .insert(enrollments)
      .values({
        email,
        fullName,
        levelId: levelRows[0]?.id ?? null,
        cohort: "Cohort 04 · 2026",
        status: "waitlist",
        notes: String(formData.get("notes") ?? "").slice(0, 400) || null,
      })
      .onConflictDoNothing();

    await db
      .insert(subscribers)
      .values({ email, fullName, source: "course-waitlist", principle: "Purpose" })
      .onConflictDoNothing();
  } catch {
    return { error: "We could not save your request. Please try again." };
  }

  const staff = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(inArray(roles.slug, ["admin", "editor"]));

  if (staff.length) {
    await db.insert(notifications).values(
      staff.map((member) => ({
        recipientId: member.id,
        type: "system" as const,
        title: "New Academy waitlist request",
        body: `${fullName} (${email}) asked to join ${levelRows[0]?.name ?? "the next cohort"}.`,
        href: "/admin/students",
      })),
    );
  }

  await db.insert(activityLogs).values({
    action: "enrollment.waitlist",
    entityType: "enrollment",
    description: `${fullName} joined the Academy waitlist for ${levelRows[0]?.name ?? "the next cohort"}.`,
  });

  revalidatePath("/course");
  return {
    ok: true,
    message: `Thank you, ${fullName.split(" ")[0]}. You are on the Cohort 04 interest list — we will write to ${email} with dates and next steps.`,
  };
}

export async function updateSettings(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user, "admin")) return;

  const updates: { key: string; value: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (!key.startsWith("setting.")) continue;
    updates.push({ key: key.replace("setting.", ""), value });
  }

  for (const update of updates) {
    await db
      .insert(siteSettings)
      .values({ key: update.key, value: update.value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: update.value, updatedAt: new Date() },
      });
  }

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "settings.updated",
    entityType: "site_settings",
    description: `Updated ${updates.length} site settings.`,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/about");
}
