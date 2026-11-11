import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { addThreadReply } from "@/db/community-access";
import { can } from "@/lib/rbac";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !can(user, "community.post")) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
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

  const thread = await addThreadReply(threadId, body, user);
  if (!thread) return NextResponse.json({ ok: false, error: "Thread not found." }, { status: 404 });
  const authorName = user.fullName;

  await db.insert(activityLogs).values({
    action: "community.reply",
    entityType: "discussion_thread",
    entityId: String(threadId),
    description: `${authorName} replied to “${thread.title}”.`,
  });

  return NextResponse.json({ ok: true });
}
