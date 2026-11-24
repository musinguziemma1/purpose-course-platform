import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRoomByCode, heartbeatRoom, hostControl, joinRoom, leaveRoom, participantStatus, roomPresence, sendSignal, type ParticipantStatus } from "@/db/conference";
import { nativeConferenceAvailable } from "@/lib/conference-config";
import { sessionStillOpen } from "@/db/live-lifecycle";

export const dynamic = "force-dynamic";
const peerPattern = /^[a-zA-Z0-9_-]{1,64}$/;
type Context = { params: Promise<{ code: string }> };
const noStore = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });
const denied = () => json({ error: "Room or participant access denied." }, 403);

/** Tells the browser whether to rejoin silently, stop, or explain a removal. */
function statusResponse(status: ParticipantStatus) {
  if (status === "missing") return json({ error: "Your connection to the room lapsed. Rejoining…", rejoin: true }, 409);
  if (status === "removed") return json({ error: "The host removed you from this session.", removed: true }, 410);
  if (status === "closed") return json({ error: "This session has ended or you no longer have access.", ended: true }, 404);
  return denied();
}

export async function GET(_request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) return json({ error: "Sign in required." }, 401);
  const { code } = await params;
  const room = await getRoomByCode(code, user);
  if (!room) return json({ error: "Room not found." }, 404);
  const open = nativeConferenceAvailable() && sessionStillOpen(room.session);
  return json({ room: { code, sessionId: room.session.id, title: room.session.title, type: room.session.type, status: room.session.status, hostName: room.hostName, open },
    presence: open ? await roomPresence(code) : null,
    viewer: { profileId: user.profileId, fullName: user.fullName, roleSlug: user.roleSlug } });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) return json({ error: "Sign in required." }, 401);
  const { code } = await params;
  let payload: Record<string, unknown>;
  try {
    // Leave beacons arrive as text/plain; every action is parsed from the raw body.
    const raw = await request.text();
    if (raw.length > 65536) return json({ error: "Body too large." }, 413);
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid body");
  } catch { return json({ error: "Invalid body." }, 400); }
  const action = payload.action;
  if (action !== "leave" && !nativeConferenceAvailable()) return json({ error: "The platform conference relay is not configured." }, 503);
  const peerId = typeof payload.peerId === "string" ? payload.peerId : "";
  if (!peerPattern.test(peerId)) return json({ error: "Invalid peer id." }, 422);
  if (action === "join") {
    const result = await joinRoom({ code, peerId, viewer: user });
    if (result && "removed" in result) return statusResponse("removed");
    if (!result?.room) return denied();
    const { session, hostName, courseTitle } = result.room;
    return json({ ok: true, self: result.self, peers: result.peers, hostPeerId: result.hostPeerId, iceServers: result.iceServers, capacity: result.capacity,
      room: { code, sessionId: session.id, title: session.title, type: session.type, status: session.status, hostName, courseTitle } });
  }
  if (action === "poll") {
    const result = await heartbeatRoom({ code, peerId, viewer: user, audioEnabled: payload.audioEnabled === true,
      videoEnabled: payload.videoEnabled === true, sharingScreen: payload.sharingScreen === true, handRaised: payload.handRaised === true });
    return result ? json({ ok: true, ...result }) : statusResponse(await participantStatus(code, peerId, user));
  }
  if (action === "signal") {
    const toPeer = typeof payload.toPeer === "string" ? payload.toPeer : "";
    const data = payload.payload;
    if (!peerPattern.test(toPeer) || !data || typeof data !== "object" || Array.isArray(data)) return json({ error: "Invalid signal." }, 422);
    const sent = await sendSignal({ code, fromPeer: peerId, toPeer, viewer: user, kind: String(payload.kind ?? ""), payload: data as Record<string, unknown> });
    return sent ? json({ ok: true }) : denied();
  }
  if (action === "host") {
    const ok = await hostControl({ code, actorPeerId: peerId, viewer: user, action: String(payload.control ?? ""), targetPeerId: typeof payload.targetPeerId === "string" ? payload.targetPeerId : undefined });
    return ok ? json({ ok: true }) : denied();
  }
  if (action === "leave") return await leaveRoom(code, peerId, user) ? json({ ok: true }) : denied();
  return json({ error: "Unknown action." }, 400);
}
