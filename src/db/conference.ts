import { and, eq, ne, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { conferenceParticipants, conferenceSignals, courseLevels, courses, liveSessions, profiles } from "@/db/schema";
import { liveReadable } from "@/db/learning-access";
import { canOverseeLearners } from "@/db/learner-access";
import { can } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { nativeConferenceAvailable, participantIceServers, type ClientIceServer } from "@/lib/conference-config";
import { sessionOpen } from "@/db/live-lifecycle";

const configuredSeats = Number(process.env.CONFERENCE_MAX_SEATS ?? 8);
export const MESH_SEAT_LIMIT = Number.isInteger(configuredSeats) && configuredSeats >= 2 && configuredSeats <= 12 ? configuredSeats : 8;
export const PRESENCE_TIMEOUT_SECONDS = 30;
/** Bounds an inbox so one participant cannot flood another between polls. */
export const MAX_PENDING_SIGNALS_PER_PEER = 200;
export const MAX_SIGNAL_PAYLOAD_CHARS = 32_000;
/** A participant the host removed keeps this marker until the session closes, so they cannot rejoin. */
export const REMOVED_MODE = "removed";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Database = typeof db | Transaction;

export type ParticipantStatus = "closed" | "removed" | "forbidden" | "missing";

export function makeRoomCode() { return `pc-${randomBytes(6).toString("hex")}`; }

export function iceServers(viewer: Pick<SessionUser, "profileId">): ClientIceServer[] {
  return participantIceServers(viewer.profileId);
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

const activeParticipant = () => ne(conferenceParticipants.mode, REMOVED_MODE);

async function prune(code: string, database: Database) {
  await database.delete(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, code), activeParticipant(), sql`${conferenceParticipants.lastSeenAt} < now() - make_interval(secs => ${PRESENCE_TIMEOUT_SECONDS})`));
  await database.delete(conferenceSignals).where(and(eq(conferenceSignals.roomCode, code), sql`${conferenceSignals.createdAt} < now() - interval '2 minutes'`));
}

function ownsPeer(code: string, peerId: string, viewer: SessionUser) {
  return and(eq(conferenceParticipants.roomCode, code), eq(conferenceParticipants.peerId, peerId), eq(conferenceParticipants.profileId, viewer.profileId))!;
}

async function lockOpenRoom(code: string, viewer: SessionUser, tx: Transaction, mode: "update" | "share" = "update") {
  const [room] = await tx.select().from(liveSessions).where(and(eq(liveSessions.roomCode, code), liveReadable(viewer), sessionOpen())).for(mode).limit(1);
  return room;
}

async function removedFromRoom(code: string, viewer: SessionUser, database: Database) {
  const [row] = await database.select({ peerId: conferenceParticipants.peerId }).from(conferenceParticipants)
    .where(and(eq(conferenceParticipants.roomCode, code), eq(conferenceParticipants.profileId, viewer.profileId), eq(conferenceParticipants.mode, REMOVED_MODE))).limit(1);
  return Boolean(row);
}

export async function joinRoom(input: { code: string; peerId: string; viewer: SessionUser }) {
  if (!nativeConferenceAvailable()) return null;
  return db.transaction(async (tx) => {
    const session = await lockOpenRoom(input.code, input.viewer, tx);
    if (!session) return null;
    await prune(input.code, tx);
    if (await removedFromRoom(input.code, input.viewer, tx)) return { removed: true as const };
    const [existing] = await tx.select().from(conferenceParticipants).where(eq(conferenceParticipants.peerId, input.peerId)).limit(1);
    if (existing && (existing.profileId !== input.viewer.profileId || existing.roomCode !== input.code)) return null;
    const peers = await listPeers(input.code, input.peerId, tx);
    const isHost = isRoomHost(session.hostId, input.viewer);
    const activeMesh = peers.filter((peer) => peer.mode === "mesh").length;
    const seatLimit = isHost || peers.some((peer) => peer.role === "host") ? MESH_SEAT_LIMIT : MESH_SEAT_LIMIT - 1;
    const mode = existing?.mode ?? (isHost || activeMesh < seatLimit ? "mesh" : "viewer");
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
      iceServers: iceServers(input.viewer), capacity: { meshSeats: MESH_SEAT_LIMIT, meshUsed: activeMesh + (self.mode === "mesh" ? 1 : 0) } };
  });
}

async function listPeers(code: string, selfPeerId: string, database: Database) {
  return database.select({
    peerId: conferenceParticipants.peerId, displayName: conferenceParticipants.displayName,
    role: conferenceParticipants.role, mode: conferenceParticipants.mode,
    audioEnabled: conferenceParticipants.audioEnabled, videoEnabled: conferenceParticipants.videoEnabled,
    sharingScreen: conferenceParticipants.sharingScreen, handRaised: conferenceParticipants.handRaised,
  }).from(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, code), ne(conferenceParticipants.peerId, selfPeerId), activeParticipant(), sql`${conferenceParticipants.lastSeenAt} >= now() - make_interval(secs => ${PRESENCE_TIMEOUT_SECONDS})`))
    .orderBy(conferenceParticipants.joinedAt);
}

export async function heartbeatRoom(input: { code: string; peerId: string; viewer: SessionUser; audioEnabled: boolean; videoEnabled: boolean; sharingScreen: boolean; handRaised: boolean }) {
  return db.transaction(async (tx) => {
    const room = await lockOpenRoom(input.code, input.viewer, tx, "share");
    if (!room) return null;
    const [self] = await tx.update(conferenceParticipants).set({ lastSeenAt: new Date(), audioEnabled: input.audioEnabled, videoEnabled: input.videoEnabled,
      sharingScreen: input.sharingScreen, handRaised: input.handRaised, role: isRoomHost(room.hostId, input.viewer) ? "host" : "student",
    }).where(and(ownsPeer(input.code, input.peerId, input.viewer), activeParticipant())).returning({ mode: conferenceParticipants.mode, role: conferenceParticipants.role });
    if (!self) return null;
    const consumed = await tx.update(conferenceSignals).set({ consumed: true }).where(and(eq(conferenceSignals.roomCode, input.code), eq(conferenceSignals.toPeer, input.peerId), eq(conferenceSignals.consumed, false)))
      .returning({ id: conferenceSignals.id, fromPeer: conferenceSignals.fromPeer, kind: conferenceSignals.kind, payload: conferenceSignals.payload });
    // UPDATE ... RETURNING has no defined order; offers must be applied before their ICE candidates.
    const signals = consumed.sort((first, second) => first.id - second.id);
    const peers = await listPeers(input.code, input.peerId, tx);
    return { self, peers, signals, hostPeerId: peers.find((peer) => peer.role === "host")?.peerId ?? null,
      capacity: { meshSeats: MESH_SEAT_LIMIT, meshUsed: peers.filter((peer) => peer.mode === "mesh").length + (self.mode === "mesh" ? 1 : 0) } };
  });
}

/** Explains a failed heartbeat so the browser can rejoin, stop, or report removal accurately. */
export async function participantStatus(code: string, peerId: string, viewer: SessionUser): Promise<ParticipantStatus> {
  const [room] = await db.select({ id: liveSessions.id }).from(liveSessions).where(and(eq(liveSessions.roomCode, code), liveReadable(viewer), sessionOpen())).limit(1);
  if (!room) return "closed";
  if (await removedFromRoom(code, viewer, db)) return "removed";
  const [claimed] = await db.select({ profileId: conferenceParticipants.profileId }).from(conferenceParticipants).where(eq(conferenceParticipants.peerId, peerId)).limit(1);
  if (claimed && claimed.profileId !== viewer.profileId) return "forbidden";
  return "missing";
}

/** Counts for the lobby. Call only after the viewer passed the room access check. */
export async function roomPresence(code: string) {
  const [row] = await db.select({
    count: sql<number>`count(*)::int`,
    hostPresent: sql<boolean>`coalesce(bool_or(${conferenceParticipants.role} = 'host'), false)`,
  }).from(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, code), activeParticipant(), sql`${conferenceParticipants.lastSeenAt} >= now() - make_interval(secs => ${PRESENCE_TIMEOUT_SECONDS})`));
  return { count: row?.count ?? 0, hostPresent: Boolean(row?.hostPresent), meshSeats: MESH_SEAT_LIMIT };
}

export async function sendSignal(input: { code: string; fromPeer: string; toPeer: string; viewer: SessionUser; kind: string; payload: Record<string, unknown> }) {
  if (!["offer", "answer", "ice", "bye"].includes(input.kind) || input.fromPeer === input.toPeer) return false;
  if (JSON.stringify(input.payload).length > MAX_SIGNAL_PAYLOAD_CHARS) return false;
  return db.transaction(async (tx) => {
    if (!(await lockOpenRoom(input.code, input.viewer, tx, "share"))) return false;
    const [sender] = await tx.select({ id: conferenceParticipants.peerId }).from(conferenceParticipants).where(and(ownsPeer(input.code, input.fromPeer, input.viewer), activeParticipant())).limit(1);
    const [target] = await tx.select({ id: conferenceParticipants.peerId }).from(conferenceParticipants).where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, input.toPeer), activeParticipant())).limit(1);
    if (!sender || !target) return false;
    const [pending] = await tx.select({ count: sql<number>`count(*)::int` }).from(conferenceSignals)
      .where(and(eq(conferenceSignals.roomCode, input.code), eq(conferenceSignals.fromPeer, input.fromPeer), eq(conferenceSignals.toPeer, input.toPeer), eq(conferenceSignals.consumed, false)));
    if ((pending?.count ?? 0) >= MAX_PENDING_SIGNALS_PER_PEER) return false;
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
    if (peer.mode === REMOVED_MODE) return true; // keep the removal marker
    await removePeer(code, peerId, tx);
    return true;
  });
}

export async function hostControl(input: { code: string; actorPeerId: string; viewer: SessionUser; action: string; targetPeerId?: string }) {
  return db.transaction(async (tx) => {
    const room = await lockOpenRoom(input.code, input.viewer, tx);
    if (!room || !isRoomHost(room.hostId, input.viewer)) return false;
    await prune(input.code, tx);
    const [actor] = await tx.select().from(conferenceParticipants).where(and(ownsPeer(input.code, input.actorPeerId, input.viewer), activeParticipant())).limit(1);
    if (!actor) return false;
    const peers = await listPeers(input.code, input.actorPeerId, tx);
    if (input.action === "mute-all" || input.action === "lower-hands") {
      if (peers.length) await tx.insert(conferenceSignals).values(peers.map((peer) => ({ roomCode: input.code, fromPeer: input.actorPeerId, toPeer: peer.peerId, kind: "control", payload: { action: input.action } })));
      await tx.update(conferenceParticipants).set(input.action === "mute-all" ? { audioEnabled: false } : { handRaised: false })
        .where(and(eq(conferenceParticipants.roomCode, input.code), ne(conferenceParticipants.peerId, input.actorPeerId), activeParticipant()));
      return true;
    }
    const target = peers.find((peer) => peer.peerId === input.targetPeerId);
    if (!target || target.role === "host") return false;
    if (input.action === "mute") {
      await tx.insert(conferenceSignals).values({ roomCode: input.code, fromPeer: input.actorPeerId, toPeer: target.peerId, kind: "control", payload: { action: "mute" } });
      await tx.update(conferenceParticipants).set({ audioEnabled: false }).where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, target.peerId)));
      return true;
    }
    if (input.action === "grant-seat") {
      const used = peers.filter((peer) => peer.mode === "mesh").length + (actor.mode === "mesh" ? 1 : 0);
      if (target.mode !== "mesh" && used >= MESH_SEAT_LIMIT) return false;
      await tx.update(conferenceParticipants).set({ mode: "mesh" }).where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, target.peerId)));
      return true;
    }
    if (input.action === "remove") {
      await tx.update(conferenceParticipants).set({ mode: REMOVED_MODE, audioEnabled: false, videoEnabled: false, sharingScreen: false, handRaised: false })
        .where(and(eq(conferenceParticipants.roomCode, input.code), eq(conferenceParticipants.peerId, target.peerId)));
      await tx.delete(conferenceSignals).where(and(eq(conferenceSignals.roomCode, input.code), or(eq(conferenceSignals.fromPeer, target.peerId), eq(conferenceSignals.toPeer, target.peerId))));
      return true;
    }
    return false;
  });
}
