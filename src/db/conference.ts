import { and, eq, ne, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { conferenceParticipants, conferenceSignals, courseLevels, courses, liveSessions, profiles } from "@/db/schema";
import { liveReadable } from "@/db/learning-access";
import { canOverseeLearners } from "@/db/learner-access";
import { can } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";

const configuredSeats = Number(process.env.CONFERENCE_MAX_SEATS ?? 8);
export const MESH_SEAT_LIMIT = Number.isInteger(configuredSeats) && configuredSeats >= 2 && configuredSeats <= 12 ? configuredSeats : 8;
export const PRESENCE_TIMEOUT_SECONDS = 30;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Database = typeof db | Transaction;

export function makeRoomCode() { return `pc-${randomBytes(6).toString("hex")}`; }

export function iceServers(): { urls: string | string[]; username?: string; credential?: string }[] {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  if (process.env.TURN_URL) servers.push({ urls: process.env.TURN_URL, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  return servers;
}

export async function ensureRoomCode(sessionId: number) {
  const [session] = await db.update(liveSessions).set({ roomCode: sql`coalesce(${liveSessions.roomCode}, ${makeRoomCode()})` }).where(eq(liveSessions.id, sessionId)).returning({ code: liveSessions.roomCode });
  return session?.code ?? null;
}

export async function getRoomByCode(code: string, viewer: SessionUser | null, database: Database = db) {
  const [room] = await database.select({
    session: liveSessions, hostName: profiles.fullName, hostProfileId: liveSessions.hostId,
    courseTitle: courses.title, courseSlug: courses.slug, levelName: courseLevels.name,
  }).from(liveSessions).leftJoin(profiles, eq(liveSessions.hostId, profiles.id))
    .leftJoin(courses, eq(liveSessions.courseId, courses.id)).leftJoin(courseLevels, eq(courses.levelId, courseLevels.id))
    .where(and(eq(liveSessions.roomCode, code), liveReadable(viewer))).limit(1);
  return room ?? null;
}

export function isRoomHost(hostId: string | null, viewer: SessionUser) {
  return canOverseeLearners(viewer) || (viewer.profileId === hostId && (can(viewer,"mentorship.coach") || can(viewer,"academy.author")));
}

async function prune(code: string, database: Database) {
  await database.delete(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, code), sql`${conferenceParticipants.lastSeenAt} < now() - make_interval(secs => ${PRESENCE_TIMEOUT_SECONDS})`));
  await database.delete(conferenceSignals).where(and(eq(conferenceSignals.roomCode, code), sql`${conferenceSignals.createdAt} < now() - interval '2 minutes'`));
}

function ownsPeer(code: string, peerId: string, viewer: SessionUser) {
  return and(eq(conferenceParticipants.roomCode, code), eq(conferenceParticipants.peerId, peerId), eq(conferenceParticipants.profileId, viewer.profileId))!;
}

async function lockOpenRoom(code: string, viewer: SessionUser, tx: Transaction) {
  const [room] = await tx.select().from(liveSessions).where(and(eq(liveSessions.roomCode, code), liveReadable(viewer), sql`${liveSessions.status} in ('scheduled', 'live')`)).for("update").limit(1);
  return room;
}

export async function joinRoom(input: { code: string; peerId: string; viewer: SessionUser }) {
  return db.transaction(async (tx) => {
    const session = await lockOpenRoom(input.code, input.viewer, tx);
    if (!session) return null;
    await prune(input.code, tx);
    const [existing] = await tx.select().from(conferenceParticipants).where(eq(conferenceParticipants.peerId, input.peerId)).limit(1);
    if (existing && (existing.profileId !== input.viewer.profileId || existing.roomCode !== input.code)) return null;
    const peers = await listPeers(input.code, input.peerId, tx);
    const isHost = isRoomHost(session.hostId, input.viewer);
    const activeMesh = peers.filter((peer) => peer.mode === "mesh").length;
    const seatLimit = isHost || peers.some((peer) => peer.role === "host") ? MESH_SEAT_LIMIT : MESH_SEAT_LIMIT - 1;
    const mode = existing?.mode ?? (activeMesh < seatLimit ? "mesh" : "viewer");
    const role = isHost ? "host" : "student";
    const [self] = await tx.insert(conferenceParticipants).values({
      peerId: input.peerId, roomCode: input.code, liveSessionId: session.id,
      profileId: input.viewer.profileId, displayName: input.viewer.fullName.slice(0, 140), role, mode,
    }).onConflictDoUpdate({
      target: conferenceParticipants.peerId,
      set: { displayName: input.viewer.fullName.slice(0, 140), role, lastSeenAt: new Date() },
      setWhere: ownsPeer(input.code, input.peerId, input.viewer),
    }).returning({ peerId: conferenceParticipants.peerId, mode: conferenceParticipants.mode, role: conferenceParticipants.role });
    if (!self) return null;
    const room = await getRoomByCode(input.code, input.viewer, tx);
    return { room, self: { ...self, isHost }, peers, hostPeerId: peers.find((peer) => peer.role === "host")?.peerId ?? null,
      iceServers: iceServers(), capacity: { meshSeats: MESH_SEAT_LIMIT, meshUsed: activeMesh + (mode === "mesh" ? 1 : 0) } };
  });
}

async function listPeers(code: string, selfPeerId: string, database: Database) {
  return database.select({
    peerId: conferenceParticipants.peerId, displayName: conferenceParticipants.displayName,
    role: conferenceParticipants.role, mode: conferenceParticipants.mode,
    audioEnabled: conferenceParticipants.audioEnabled, videoEnabled: conferenceParticipants.videoEnabled,
    sharingScreen: conferenceParticipants.sharingScreen, handRaised: conferenceParticipants.handRaised,
  }).from(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, code), ne(conferenceParticipants.peerId, selfPeerId)));
}

export async function heartbeatRoom(input: { code: string; peerId: string; viewer: SessionUser; audioEnabled: boolean; videoEnabled: boolean; sharingScreen: boolean; handRaised: boolean }) {
  return db.transaction(async (tx) => {
    const room = await lockOpenRoom(input.code, input.viewer, tx);
    if (!room) return null;
    await prune(input.code, tx);
    const [self] = await tx.update(conferenceParticipants).set({ lastSeenAt: new Date(), audioEnabled: input.audioEnabled, videoEnabled: input.videoEnabled,
      sharingScreen: input.sharingScreen, handRaised: input.handRaised, role: isRoomHost(room.hostId, input.viewer) ? "host" : "student",
    }).where(ownsPeer(input.code, input.peerId, input.viewer)).returning({ mode: conferenceParticipants.mode, role: conferenceParticipants.role });
    if (!self) return null;
    const signals = await tx.update(conferenceSignals).set({ consumed: true }).where(and(eq(conferenceSignals.roomCode, input.code), eq(conferenceSignals.toPeer, input.peerId), eq(conferenceSignals.consumed, false)))
      .returning({ id: conferenceSignals.id, fromPeer: conferenceSignals.fromPeer, kind: conferenceSignals.kind, payload: conferenceSignals.payload });
    const peers = await listPeers(input.code, input.peerId, tx);
    return { self, peers, signals, capacity: { meshSeats: MESH_SEAT_LIMIT, meshUsed: peers.filter((peer) => peer.mode === "mesh").length + (self.mode === "mesh" ? 1 : 0) } };
  });
}

export async function sendSignal(input: { code: string; fromPeer: string; toPeer: string; viewer: SessionUser; kind: string; payload: Record<string, unknown> }) {
  if (!["offer", "answer", "ice", "bye"].includes(input.kind) || input.fromPeer === input.toPeer) return false;
  return db.transaction(async (tx) => {
    if (!(await lockOpenRoom(input.code, input.viewer, tx))) return false;
    await prune(input.code, tx);
    const [sender] = await tx.select({ id: conferenceParticipants.peerId }).from(conferenceParticipants).where(ownsPeer(input.code, input.fromPeer, input.viewer)).limit(1);
    const [target] = await tx.select({ id: conferenceParticipants.peerId }).from(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, input.toPeer))).limit(1);
    if (!sender || !target) return false;
    await tx.insert(conferenceSignals).values({ roomCode: input.code, fromPeer: input.fromPeer, toPeer: input.toPeer, kind: input.kind, payload: input.payload });
    return true;
  });
}

async function removePeer(code: string, peerId: string, database: Database) {
  await database.delete(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, code), eq(conferenceParticipants.peerId, peerId)));
  await database.delete(conferenceSignals).where(and(eq(conferenceSignals.roomCode, code), or(eq(conferenceSignals.fromPeer, peerId), eq(conferenceSignals.toPeer, peerId))));
}

export async function leaveRoom(code: string, peerId: string, viewer: SessionUser) {
  return db.transaction(async (tx) => {
    const [peer] = await tx.select().from(conferenceParticipants).where(ownsPeer(code, peerId, viewer)).for("update").limit(1);
    if (!peer) return false;
    await removePeer(code, peerId, tx);
    return true;
  });
}

export async function hostControl(input: { code: string; actorPeerId: string; viewer: SessionUser; action: string; targetPeerId?: string }) {
  return db.transaction(async (tx) => {
    const room = await lockOpenRoom(input.code, input.viewer, tx);
    if (!room || !isRoomHost(room.hostId, input.viewer)) return false;
    await prune(input.code, tx);
    const [actor] = await tx.select().from(conferenceParticipants).where(ownsPeer(input.code, input.actorPeerId, input.viewer)).limit(1);
    if (!actor) return false;
    const peers = await listPeers(input.code, input.actorPeerId, tx);
    if (input.action === "mute-all" || input.action === "lower-hands") {
      if (peers.length) await tx.insert(conferenceSignals).values(peers.map((peer) => ({ roomCode: input.code, fromPeer: input.actorPeerId, toPeer: peer.peerId, kind: "control", payload: { action: input.action } })));
      await tx.update(conferenceParticipants).set(input.action === "mute-all" ? { audioEnabled: false } : { handRaised: false })
        .where(and(eq(conferenceParticipants.roomCode, input.code), ne(conferenceParticipants.peerId, input.actorPeerId)));
      return true;
    }
    const target = peers.find((peer) => peer.peerId === input.targetPeerId);
    if (!target || target.role === "host") return false;
    if (input.action === "grant-seat") {
      const used = peers.filter((peer) => peer.mode === "mesh").length + (actor.mode === "mesh" ? 1 : 0);
      if (target.mode !== "mesh" && used >= MESH_SEAT_LIMIT) return false;
      await tx.update(conferenceParticipants).set({ mode: "mesh" }).where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, target.peerId)));
      return true;
    }
    if (input.action === "remove") { await removePeer(input.code, target.peerId, tx); return true; }
    return false;
  });
}
