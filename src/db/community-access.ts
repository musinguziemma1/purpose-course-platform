import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { communities, communityMembers, discussionGroups, discussionPosts, discussionThreads } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

export function communityReadable(viewer: SessionUser | null) {
  return and(eq(communities.isArchived, false), or(
    eq(communities.visibility, "public"),
    viewer ? sql`exists (select 1 from ${communityMembers} where ${communityMembers.communityId} = ${communities.id} and ${communityMembers.profileId} = ${viewer.profileId})` : sql`false`,
    can(viewer, "community.moderate") ? sql`true` : sql`false`,
  ))!;
}

export function groupReadable(viewer: SessionUser | null) {
  return or(eq(discussionGroups.isMembersOnly, false), viewer && (can(viewer, "learning.access") || can(viewer, "community.moderate")) ? sql`true` : sql`false`)!;
}

export function threadReadable(viewer: SessionUser | null) {
  return and(eq(discussionThreads.isRemoved, false),
    or(isNull(discussionThreads.communityId), sql`exists (select 1 from ${communities} where ${communities.id} = ${discussionThreads.communityId} and ${communityReadable(viewer)})`),
    or(isNull(discussionThreads.groupId), sql`exists (select 1 from ${discussionGroups} where ${discussionGroups.id} = ${discussionThreads.groupId} and ${groupReadable(viewer)})`),
  )!;
}

export async function findReadableThread(id: number, viewer: SessionUser | null) {
  const [thread] = await db.select().from(discussionThreads).where(and(eq(discussionThreads.id, id), threadReadable(viewer))).limit(1);
  return thread ?? null;
}

export async function findReadableTarget(type: string, id: number, viewer: SessionUser | null) {
  if (type === "thread") return findReadableThread(id, viewer);
  if (type !== "post") return null;
  const [post] = await db.select().from(discussionPosts).where(and(eq(discussionPosts.id, id), eq(discussionPosts.isRemoved, false))).limit(1);
  return post ? findReadableThread(post.threadId, viewer) : null;
}

/** Lock the thread so removal/locking and replies cannot interleave. */
export async function addThreadReply(threadId: number, body: string, viewer: SessionUser) {
  if (!can(viewer, "community.post")) return null;
  return db.transaction(async (tx) => {
    const [thread] = await tx.select().from(discussionThreads).where(and(eq(discussionThreads.id, threadId), threadReadable(viewer))).for("update").limit(1);
    if (!thread || thread.isLocked) return null;
    await tx.insert(discussionPosts).values({ threadId, authorId: viewer.profileId, authorName: viewer.fullName, body: body.slice(0, 2000) });
    await tx.update(discussionThreads).set({ replyCount: sql`${discussionThreads.replyCount} + 1`, lastActivityAt: new Date() }).where(eq(discussionThreads.id, threadId));
    return thread;
  });
}
