import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getParticipant,
  getRoomByCode,
  heartbeatRoom,
  hostControl,
  joinRoom,
  leaveRoom,
  sendSignal,
} from "@/db/conference";
import { ensureDemoAccounts } from "@/db/accounts";

export const dynamic = "force-dynamic";

async function identity() {
  let user = await getSessionUser();
  if (!user) {
    await ensureDemoAccounts().catch(() => undefined);
    user = await getSessionUser();
  }
  return user;
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await getRoomByCode(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const user = await identity();
  return NextResponse.json({
    room: {
      code,
      sessionId: room.session.id,
      title: room.session.title,
      type: room.session.type,
      status: room.session.status,
      hostName: room.hostName,
    },
    viewer: user ? { profileId: user.profileId, fullName: user.fullName, roleSlug: user.roleSlug } : null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = String(payload.action ?? "");
  const peerId = String(payload.peerId ?? "").slice(0, 64);
  if (!peerId) return NextResponse.json({ error: "Missing peer id" }, { status: 422 });

  const room = await getRoomByCode(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  if (action === "join") {
    const user = await identity();
    const result = await joinRoom({
      code,
      peerId,
      profileId: user?.profileId ?? null,
      displayName: user?.fullName ?? (String(payload.displayName ?? "Guest").slice(0, 60) || "Guest"),
      role: user?.roleSlug ?? "student",
    });
    if (!result) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      self: result.self,
      peers: result.peers,
      hostPeerId: result.hostPeerId,
      iceServers: result.iceServers,
      capacity: result.capacity,
      room: {
        code,
        sessionId: room.session.id,
        title: room.session.title,
        type: room.session.type,
        status: room.session.status,
        hostName: room.hostName,
        courseTitle: room.courseTitle,
      },
    });
  }

  const participant = await getParticipant(code, peerId);
  if (!participant) return NextResponse.json({ error: "You are not in this room" }, { status: 403 });

  if (action === "poll") {
    const result = await heartbeatRoom({
      code,
      peerId,
      audioEnabled: Boolean(payload.audioEnabled),
      videoEnabled: Boolean(payload.videoEnabled),
      sharingScreen: Boolean(payload.sharingScreen),
      handRaised: Boolean(payload.handRaised),
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "signal") {
    const toPeer = String(payload.toPeer ?? "");
    const kind = String(payload.kind ?? "");
    const data = (payload.payload ?? {}) as Record<string, unknown>;
    if (!toPeer) return NextResponse.json({ error: "Missing target peer" }, { status: 422 });
    const sent = await sendSignal({ code, fromPeer: peerId, toPeer, kind, payload: data });
    return NextResponse.json({ ok: sent });
  }

  if (action === "host") {
    const ok = await hostControl({
      code,
      actorPeerId: peerId,
      action: String(payload.control ?? "") as "mute-all" | "grant-seat" | "remove" | "lower-hands",
      targetPeerId: payload.targetPeerId ? String(payload.targetPeerId) : undefined,
    });
    return NextResponse.json({ ok });
  }

  if (action === "leave") {
    await leaveRoom(code, peerId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
