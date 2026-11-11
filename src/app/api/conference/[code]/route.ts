import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRoomByCode, heartbeatRoom, hostControl, joinRoom, leaveRoom, sendSignal } from "@/db/conference";

export const dynamic = "force-dynamic";
const peerPattern = /^[a-zA-Z0-9_-]{1,64}$/;
type Context = { params: Promise<{ code: string }> };
const denied = () => NextResponse.json({ error: "Room or participant access denied." }, { status: 403 });

export async function GET(_request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { code } = await params;
  const room = await getRoomByCode(code, user);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  return NextResponse.json({ room: { code, sessionId: room.session.id, title: room.session.title, type: room.session.type, status: room.session.status, hostName: room.hostName },
    viewer: { profileId: user.profileId, fullName: user.fullName, roleSlug: user.roleSlug } });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { code } = await params;
  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 65536) return NextResponse.json({ error: "Body too large." }, { status: 413 });
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid body");
  } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }
  const action = payload.action;
  const peerId = typeof payload.peerId === "string" ? payload.peerId : "";
  if (!peerPattern.test(peerId)) return NextResponse.json({ error: "Invalid peer id." }, { status: 422 });
  if (action === "join") {
    const result = await joinRoom({ code, peerId, viewer: user });
    if (!result?.room) return denied();
    const { session, hostName, courseTitle } = result.room;
    return NextResponse.json({ ok: true, self: result.self, peers: result.peers, hostPeerId: result.hostPeerId, iceServers: result.iceServers, capacity: result.capacity,
      room: { code, sessionId: session.id, title: session.title, type: session.type, status: session.status, hostName, courseTitle } });
  }
  if (action === "poll") {
    const result = await heartbeatRoom({ code, peerId, viewer: user, audioEnabled: payload.audioEnabled === true,
      videoEnabled: payload.videoEnabled === true, sharingScreen: payload.sharingScreen === true, handRaised: payload.handRaised === true });
    return result ? NextResponse.json({ ok: true, ...result }) : denied();
  }
  if (action === "signal") {
    const toPeer = typeof payload.toPeer === "string" ? payload.toPeer : "";
    const data = payload.payload;
    if (!peerPattern.test(toPeer) || !data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "Invalid signal." }, { status: 422 });
    const sent = await sendSignal({ code, fromPeer: peerId, toPeer, viewer: user, kind: String(payload.kind ?? ""), payload: data as Record<string, unknown> });
    return sent ? NextResponse.json({ ok: true }) : denied();
  }
  if (action === "host") {
    const ok = await hostControl({ code, actorPeerId: peerId, viewer: user, action: String(payload.control ?? ""), targetPeerId: typeof payload.targetPeerId === "string" ? payload.targetPeerId : undefined });
    return ok ? NextResponse.json({ ok: true }) : denied();
  }
  if (action === "leave") return await leaveRoom(code, peerId, user) ? NextResponse.json({ ok: true }) : denied();
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
