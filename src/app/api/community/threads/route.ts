import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, discussionGroups, discussionThreads, notifications, profiles, roles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getThreadsWithPosts } from "@/db/queries";
import { can } from "@/lib/rbac";
import { groupReadable } from "@/db/community-access";
import { and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const threads = await getThreadsWithPosts(8);
  return NextResponse.json({ threads, serverTime: new Date().toISOString() });
}

export async function POST(request: Request) {
  let payload: { title?: string; prompt?: string; authorName?: string; groupId?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user || !can(user, "community.post")) return NextResponse.json({ error: "Sign in to post." }, { status: 401 });
  const title = (payload.title ?? "").trim();
  const prompt = (payload.prompt ?? "").trim();
  const authorName = user?.fullName ?? ((payload.authorName ?? "").trim() || "Community member");

  if (title.length < 8) {
    return NextResponse.json({ ok: false, error: "Give your discussion a title of at least 8 characters." }, { status: 422 });
  }
  if (prompt.length < 12) {
    return NextResponse.json({ ok: false, error: "Add a little more context so others can respond well." }, { status: 422 });
  }

  const groupRows = payload.groupId
    ? await db.select().from(discussionGroups).where(and(eq(discussionGroups.id, payload.groupId), groupReadable(user))).limit(1)
    : await db.select().from(discussionGroups).where(groupReadable(user)).limit(1);
  if (!groupRows[0]) return NextResponse.json({ error: "Discussion group not found." }, { status: 404 });

  const inserted = await db
    .insert(discussionThreads)
    .values({
      groupId: groupRows[0]?.id ?? null,
      title: title.slice(0, 200),
      prompt: prompt.slice(0, 1200),
      authorName,
      authorId: user?.profileId ?? null,
    })
    .returning({ id: discussionThreads.id });

  await db.insert(activityLogs).values({
    action: "community.thread_created",
    entityType: "discussion_thread",
    entityId: String(inserted[0].id),
    description: `${authorName} opened “${title}” in the community.`,
  });

  const moderators = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(roles.slug, "admin"));

  if (moderators.length) {
    await db.insert(notifications).values(
      moderators.map((member) => ({
        recipientId: member.id,
        type: "community" as const,
        title: "New community discussion",
        body: `${authorName}: ${title}`,
        href: "/community",
      })),
    );
  }

  return NextResponse.json({ ok: true, threadId: inserted[0].id });
}
