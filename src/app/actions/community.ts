"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, discussionThreads } from "@/db/schema";
import { canModerateCommunity, getSessionUser } from "@/lib/auth";

export async function toggleThreadFlag(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canModerateCommunity(user)) return;
  const threadId = Number(formData.get("threadId"));
  const flag = String(formData.get("flag"));
  if (!threadId || !["pin", "lock"].includes(flag)) return;

  const rows = await db.select().from(discussionThreads).where(eq(discussionThreads.id, threadId)).limit(1);
  const thread = rows[0];
  if (!thread) return;

  if (flag === "pin") {
    await db.update(discussionThreads).set({ isPinned: !thread.isPinned }).where(eq(discussionThreads.id, threadId));
  } else {
    await db.update(discussionThreads).set({ isLocked: !thread.isLocked }).where(eq(discussionThreads.id, threadId));
  }

  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: `community.${flag}`,
    entityType: "discussion_thread",
    entityId: String(threadId),
    description: `${flag === "pin" ? "Toggled pin" : "Toggled lock"} on “${thread.title}”.`,
  });

  revalidatePath("/admin/community");
  revalidatePath("/community");
}

export async function deleteThread(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !canModerateCommunity(user)) return;
  const threadId = Number(formData.get("threadId"));
  if (!threadId) return;
  await db.update(discussionThreads).set({ isRemoved: true }).where(eq(discussionThreads.id, threadId));
  await db.insert(activityLogs).values({
    actorId: user.profileId,
    action: "community.delete_thread",
    entityType: "discussion_thread",
    entityId: String(threadId),
    description: `Removed discussion thread #${threadId}.`,
  });
  revalidatePath("/admin/community");
  revalidatePath("/community");
}
