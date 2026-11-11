import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, discussionPosts, discussionThreads } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  let payload: { threadId?: number; body?: string; authorName?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const threadId = Number(payload.threadId);
  const body = (payload.body ?? "").trim();
  if (!threadId || Number.isNaN(threadId)) {
    return NextResponse.json({ ok: false, error: "Missing discussion thread." }, { status: 422 });
  }
  if (body.length < 2) {
    return NextResponse.json({ ok: false, error: "Write a short response before posting." }, { status: 422 });
  }

  const threadRows = await db.select().from(discussionThreads).where(eq(discussionThreads.id, threadId)).limit(1);
  const thread = threadRows[0];
  if (!thread) return NextResponse.json({ ok: false, error: "Thread not found." }, { status: 404 });
  if (thread.isLocked) return NextResponse.json({ ok: false, error: "This thread is locked." }, { status: 423 });

  const user = await getSessionUser();
  const authorName = user?.fullName ?? ((payload.authorName ?? "").trim() || "Community member");

  await db.insert(discussionPosts).values({
    threadId,
    authorName,
    authorId: user?.profileId ?? null,
    body: body.slice(0, 1600),
  });

  await db
    .update(discussionThreads)
    .set({ replyCount: sql`${discussionThreads.replyCount} + 1`, lastActivityAt: new Date() })
    .where(eq(discussionThreads.id, threadId));

  await db.insert(activityLogs).values({
    action: "community.reply",
    entityType: "discussion_thread",
    entityId: String(threadId),
    description: `${authorName} replied to “${thread.title}”.`,
  });

  return NextResponse.json({ ok: true });
}
