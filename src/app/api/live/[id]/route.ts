import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { liveMessages, liveSessions } from "@/db/schema";
import { getSessionUser, isMentor, isStudent } from "@/lib/auth";
import { ensureDemoAccounts } from "@/db/accounts";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!sessionId) return NextResponse.json({ error: "Bad session" }, { status: 400 });

  const [sessionRows, messages] = await Promise.all([
    db.select().from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1),
    db.select().from(liveMessages).where(eq(liveMessages.liveSessionId, sessionId)).orderBy(asc(liveMessages.createdAt)).limit(200),
  ]);

  if (!sessionRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    status: sessionRows[0].status,
    recordingUrl: sessionRows[0].recordingUrl,
    messages,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!sessionId) return NextResponse.json({ error: "Bad session" }, { status: 400 });

  let payload: { body?: string; kind?: string; authorName?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const body = (payload.body ?? "").trim();
  if (body.length < 2) return NextResponse.json({ error: "Write a message first." }, { status: 422 });

  let user = await getSessionUser();
  if (!user) {
    await ensureDemoAccounts().catch(() => undefined);
    user = await getSessionUser();
  }

  const sessionRows = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1);
  if (!sessionRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sessionRows[0].status === "cancelled") {
    return NextResponse.json({ error: "This session was cancelled." }, { status: 409 });
  }

  const inserted = await db
    .insert(liveMessages)
    .values({
      liveSessionId: sessionId,
      authorId: user?.profileId ?? null,
      authorName: user?.fullName ?? ((payload.authorName ?? "").trim() || "Guest"),
      authorRole: isStudent(user) ? "student" : isMentor(user) ? "mentor" : "host",
      kind: payload.kind === "question" ? "question" : "chat",
      body: body.slice(0, 1200),
    })
    .returning();

  return NextResponse.json({ ok: true, message: inserted[0] });
}
