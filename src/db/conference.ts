import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { conferenceParticipants, conferenceSignals, courseLevels, courses, liveSessions, profiles } from "@/db/schema";

export const MESH_SEAT_LIMIT = Number(process.env.CONFERENCE_MAX_SEATS ?? 8);
export const PRESENCE_TIMEOUT_SECONDS = 30;

export function makeRoomCode() {
  return `pc-${randomBytes(6).toString("hex")}`;
}

export function iceServers(): { urls: string | string[]; username?: string; credential?: string }[] {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turnUrl = process.env.TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  return servers;
}

export async function ensureRoomCode(sessionId: number) {
  const rows = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1);
  const session = rows[0];
  if (!session) return null;
  if (session.roomCode) return session.roomCode;
  const code = makeRoomCode();
  await db.update(liveSessions).set({ roomCode: code }).where(eq(liveSessions.id, sessionId));
  return code;
}

export async function getRoomByCode(code: string) {
  const rows = await db
    .select({
      session: liveSessions,
      hostName: profiles.fullName,
      hostProfileId: liveSessions.hostId,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      levelName: courseLevels.name,
    })
    .from(liveSessions)
    .leftJoin(profiles, eq(liveSessions.hostId, profiles.id))
    .leftJoin(courses, eq(liveSessions.courseId, courses.id))
    .leftJoin(courseLevels, eq(courses.levelId, courseLevels.id))
    .where(eq(liveSessions.roomCode, code))
    .limit(1);
  return rows[0] ?? null;
}

async function prune(code: string) {
  await db.execute(sql`
    delete from ${conferenceParticipants}
    where ${conferenceParticipants.roomCode} = ${code}
      and ${conferenceParticipants.lastSeenAt} < now() - (${PRESENCE_TIMEOUT_SECONDS} || ' seconds')::interval
  `);
  await db.execute(sql`
    delete from ${conferenceSignals}
    where ${conferenceSignals.roomCode} = ${code}
      and ${conferenceSignals.createdAt} < now() - interval '2 minutes'
  `);
}

export type JoinInput = {
  code: string;
  peerId: string;
  profileId: string | null;
  displayName: string;
  role: string;
};

export async function joinRoom(input: JoinInput) {
  const room = await getRoomByCode(input.code);
  if (!room) return null;
  await prune(input.code);

  const existing = await db
    .select()
    .from(conferenceParticipants)
    .where(eq(conferenceParticipants.roomCode, input.code));

  const isHost =
    input.role === "admin" || input.role === "mentor" || (room.hostProfileId !== null && room.hostProfileId === input.profileId);

  const activeMesh = existing.filter((peer) => peer.mode === "mesh" && peer.peerId !== input.peerId);
  const mode: "mesh" | "viewer" = isHost || activeMesh.length < MESH_SEAT_LIMIT ? "mesh" : "viewer";

  await db
    .insert(conferenceParticipants)
    .values({
      peerId: input.peerId,
      roomCode: input.code,
      liveSessionId: room.session.id,
      profileId: input.profileId,
      displayName: input.displayName.slice(0, 140),
      role: isHost ? "host" : input.role === "mentor" ? "mentor" : "student",
      mode,
    })
    .onConflictDoUpdate({
      target: conferenceParticipants.peerId,
      set: {
        roomCode: input.code,
        liveSessionId: room.session.id,
        displayName: input.displayName.slice(0, 140),
        role: isHost ? "host" : input.role === "mentor" ? "mentor" : "student",
        mode,
        lastSeenAt: new Date(),
      },
    });

  const peers = await listPeers(input.code, input.peerId);

  return {
    room,
    self: { peerId: input.peerId, mode, role: isHost ? "host" : input.role, isHost },
    peers,
    hostPeerId: peers.find((peer) => peer.role === "host")?.peerId ?? null,
    iceServers: iceServers(),
    capacity: { meshSeats: MESH_SEAT_LIMIT, meshUsed: activeMesh.length + (mode === "mesh" ? 1 : 0) },
  };
}

async function listPeers(code: string, selfPeerId: string) {
  return db
    .select({
      peerId: conferenceParticipants.peerId,
      displayName: conferenceParticipants.displayName,
      role: conferenceParticipants.role,
      mode: conferenceParticipants.mode,
      audioEnabled: conferenceParticipants.audioEnabled,
      videoEnabled: conferenceParticipants.videoEnabled,
      sharingScreen: conferenceParticipants.sharingScreen,
      handRaised: conferenceParticipants.handRaised,
    })
    .from(conferenceParticipants)
    .where(and(eq(conferenceParticipants.roomCode, code), ne(conferenceParticipants.peerId, selfPeerId)));
}

export async function heartbeatRoom(input: {
  code: string;
  peerId: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  sharingScreen: boolean;
  handRaised: boolean;
}) {
  await db
    .update(conferenceParticipants)
    .set({
      lastSeenAt: new Date(),
      audioEnabled: input.audioEnabled,
      videoEnabled: input.videoEnabled,
      sharingScreen: input.sharingScreen,
      handRaised: input.handRaised,
    })
    .where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, input.peerId)));

  await prune(input.code);

  const signals = await db.execute(sql`
    update ${conferenceSignals}
    set consumed = true
    where ${conferenceSignals.toPeer} = ${input.peerId}
      and ${conferenceSignals.consumed} = false
    returning id, from_peer as "fromPeer", kind, payload
  `);

  const [selfRows, peers] = await Promise.all([
    db
      .select({ mode: conferenceParticipants.mode, role: conferenceParticipants.role })
      .from(conferenceParticipants)
      .where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, input.peerId)))
      .limit(1),
    listPeers(input.code, input.peerId),
  ]);

  return {
    self: selfRows[0] ?? null,
    peers,
    signals: (signals.rows ?? []) as { id: number; fromPeer: string; kind: string; payload: Record<string, unknown> }[],
    capacity: { meshSeats: MESH_SEAT_LIMIT, meshUsed: peers.filter((peer) => peer.mode === "mesh").length + 1 },
  };
}

export async function sendSignal(input: {
  code: string;
  fromPeer: string;
  toPeer: string;
  kind: string;
  payload: Record<string, unknown>;
}) {
  if (!["offer", "answer", "ice", "bye"].includes(input.kind)) return false;
  const [sender] = await db
    .select({ peerId: conferenceParticipants.peerId })
    .from(conferenceParticipants)
    .where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, input.fromPeer)))
    .limit(1);
  if (!sender) return false;

  await db.insert(conferenceSignals).values({
    roomCode: input.code,
    fromPeer: input.fromPeer,
    toPeer: input.toPeer,
    kind: input.kind,
    payload: input.payload,
  });
  return true;
}

export async function leaveRoom(code: string, peerId: string) {
  await db.delete(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, code), eq(conferenceParticipants.peerId, peerId)));
  await db.delete(conferenceSignals).where(
    and(eq(conferenceSignals.roomCode, code), inArray(conferenceSignals.fromPeer, [peerId])),
  );
  await db.delete(conferenceSignals).where(
    and(eq(conferenceSignals.roomCode, code), inArray(conferenceSignals.toPeer, [peerId])),
  );
}

export async function hostControl(input: {
  code: string;
  actorPeerId: string;
  action: "mute-all" | "grant-seat" | "remove" | "lower-hands";
  targetPeerId?: string;
}) {
  const [actor] = await db
    .select()
    .from(conferenceParticipants)
    .where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, input.actorPeerId)))
    .limit(1);
  if (!actor || actor.role !== "host") return false;

  if (input.action === "mute-all") {
    await db
      .update(conferenceParticipants)
      .set({ audioEnabled: false })
      .where(and(eq(conferenceParticipants.roomCode, input.code), ne(conferenceParticipants.peerId, input.actorPeerId)));
    return true;
  }
  if (input.action === "lower-hands") {
    await db.update(conferenceParticipants).set({ handRaised: false }).where(eq(conferenceParticipants.roomCode, input.code));
    return true;
  }
  if (!input.targetPeerId) return false;
  if (input.action === "grant-seat") {
    await db
      .update(conferenceParticipants)
      .set({ mode: "mesh" })
      .where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, input.targetPeerId)));
    return true;
  }
  if (input.action === "remove") {
    await leaveRoom(input.code, input.targetPeerId);
    return true;
  }
  return false;
}

export async function getParticipant(code: string, peerId: string) {
  const rows = await db
    .select()
    .from(conferenceParticipants)
    .where(and(eq(conferenceParticipants.roomCode, code), eq(conferenceParticipants.peerId, peerId)))
    .limit(1);
  return rows[0] ?? null;
}
