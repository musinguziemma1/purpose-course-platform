import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { liveMessages, liveSessions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { liveReadable } from "@/db/learning-access";
import { canOverseeLearners } from "@/db/learner-access";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) return NextResponse.json({ error: "Bad session" }, { status: 400 });

  const sessionRows = await db.select().from(liveSessions).where(and(eq(liveSessions.id, sessionId), liveReadable(user))).limit(1);
  if (!sessionRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await db.select().from(liveMessages).where(eq(liveMessages.liveSessionId, sessionId)).orderBy(asc(liveMessages.createdAt)).limit(200);
  return NextResponse.json({
    status: sessionRows[0].status,
    recordingUrl: sessionRows[0].recordingUrl,
    messages,
    serverTime: new Date().toISOString(),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) return NextResponse.json({ error: "Bad session" }, { status: 400 });

  let payload: { body?: string; kind?: string; authorName?: string };
  try {
    payload = await request.json();
    if (!payload || typeof payload !== "object" || typeof payload.body !== "string") throw new Error("Invalid body");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const body = (payload.body ?? "").trim();
  if (body.length < 2) return NextResponse.json({ error: "Write a message first." }, { status: 422 });

  const sessionRows = await db.select().from(liveSessions).where(and(eq(liveSessions.id, sessionId), liveReadable(user))).limit(1);
  if (!sessionRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["scheduled", "live"].includes(sessionRows[0].status)) {
    return NextResponse.json({ error: "This session is closed." }, { status: 409 });
  }

  const inserted = await db
    .insert(liveMessages)
    .values({
      liveSessionId: sessionId,
      authorId: user.profileId,
      authorName: user.fullName,
      authorRole: sessionRows[0].hostId === user.profileId || canOverseeLearners(user) ? "host" : "student",
      kind: payload.kind === "question" ? "question" : "chat",
      body: body.slice(0, 1200),
    })
    .returning();

  return NextResponse.json({ ok: true, message: inserted[0] });
}
