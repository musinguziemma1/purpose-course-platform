"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  candidatesFrom,
  connectionWanted,
  describeMediaError,
  descriptionFrom,
  nextPollDelay,
  orderSignals,
  shouldInitiate,
  videoBitrateFor,
  type ConferencePeer,
  type SelfState,
  type SignalEnvelope,
} from "@/lib/conference-client";

export type RoomPhase = "lobby" | "joining" | "joined" | "rejoining" | "ended" | "removed";
export type LinkQuality = { rttMs: number | null; relayed: boolean; level: "good" | "fair" | "poor" | "unknown" };
export type RemoteMedia = { stream: MediaStream; hasVideo: boolean; hasAudio: boolean };
export type Notice = { id: number; text: string };
export type Capacity = { meshSeats: number; meshUsed: number };
export type Presence = { count: number; hostPresent: boolean; meshSeats: number } | null;

type PeerLink = {
  peerId: string;
  pc: RTCPeerConnection;
  /** Shared id for one connection attempt; a new id means the caller rebuilt its side. */
  session: string;
  initiator: boolean;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingIce: RTCIceCandidateInit[];
  outgoingIce: RTCIceCandidateInit[];
  iceTimer: ReturnType<typeof setTimeout> | null;
  sendChain: Promise<unknown>;
  stream: MediaStream;
  createdAt: number;
  troubleSince: number | null;
  restarts: number;
};

type JoinResponse = {
  self: { peerId: string; mode: string; role: string; isHost: boolean };
  peers: ConferencePeer[];
  hostPeerId: string | null;
  iceServers: RTCIceServer[];
  capacity: Capacity;
};

type PollResponse = {
  self: { mode: string; role: string };
  peers: ConferencePeer[];
  signals: SignalEnvelope[];
  hostPeerId: string | null;
  capacity: Capacity;
};

class RoomRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const AUDIO_CONSTRAINTS: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
const VIDEO_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
const ICE_BATCH_MS = 120;
const ORPHAN_ICE_TTL_MS = 30_000;

const shortId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 16);

async function setLocal(pc: RTCPeerConnection) {
  try {
    await pc.setLocalDescription();
  } catch (error) {
    // Older engines require an explicit description.
    if (!(error instanceof TypeError)) throw error;
    const description = pc.signalingState === "have-remote-offer" ? await pc.createAnswer() : await pc.createOffer();
    await pc.setLocalDescription(description);
  }
}

function transceiversOf(pc: RTCPeerConnection, kind: "audio" | "video") {
  return pc.getTransceivers().filter((transceiver) => transceiver.currentDirection !== "stopped" && transceiver.receiver.track?.kind === kind);
}

export function useConference({ roomCode }: { roomCode: string }) {
  const endpoint = `/api/conference/${encodeURIComponent(roomCode)}`;

  /* ---------------------------------------------------------------- state */
  const [phase, setPhase] = useState<RoomPhase>("lobby");
  const [message, setMessage] = useState("");
  const [self, setSelf] = useState<SelfState & { role: string }>({ peerId: "", mode: "mesh", isHost: false, role: "student" });
  const [peers, setPeers] = useState<ConferencePeer[]>([]);
  const [remote, setRemote] = useState<Record<string, RemoteMedia>>({});
  const [linkStates, setLinkStates] = useState<Record<string, RTCPeerConnectionState>>({});
  const [quality, setQuality] = useState<Record<string, LinkQuality>>({});
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [capacity, setCapacity] = useState<Capacity>({ meshSeats: 8, meshUsed: 1 });
  const [presence, setPresence] = useState<Presence>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaReady, setMediaReady] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");

  /* ----------------------------------------------------------------- refs */
  const peerIdRef = useRef("");
  const selfRef = useRef<SelfState>({ peerId: "", mode: "mesh", isHost: false });
  const hostPeerIdRef = useRef<string | null>(null);
  const peersRef = useRef<ConferencePeer[]>([]);
  const links = useRef(new Map<string, PeerLink>());
  const orphanIce = useRef(new Map<string, { session: string; candidates: RTCIceCandidateInit[]; at: number }>());
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const micOnRef = useRef(true);
  const sharingRef = useRef(false);
  const handRef = useRef(false);
  const activeRef = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failures = useRef(0);
  const firstPeerSync = useRef(true);
  const lastBitrateKey = useRef("");
  const noticeId = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);
  const localAnalyser = useRef<{ analyser: AnalyserNode; source: MediaStreamAudioSourceNode; trackId: string } | null>(null);
  const speakingRef = useRef<Record<string, boolean>>({});
  const monitors = useRef<ReturnType<typeof setInterval>[]>([]);
  const unmounted = useRef(false);
  const pollInFlight = useRef(false);
  const pollAgain = useRef(false);
  const debugEnabled = useRef(false);

  /** Opt-in diagnostics: localStorage.setItem("purpose:room-debug", "1"). */
  const debugLog = useCallback((...details: unknown[]) => {
    if (debugEnabled.current) console.debug(`[room ${new Date().toISOString().slice(11, 23)}]`, ...details);
  }, []);

  const notify = useCallback((text: string) => {
    const id = ++noticeId.current;
    setNotices((current) => [...current.slice(-3), { id, text }]);
    setTimeout(() => setNotices((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);

  const currentVideoTrack = useCallback(() => screenTrackRef.current ?? cameraTrackRef.current, []);

  const refreshPreview = useCallback(() => {
    const tracks = [audioTrackRef.current, currentVideoTrack()].filter((track): track is MediaStreamTrack => Boolean(track && track.readyState === "live"));
    setPreviewStream(tracks.length ? new MediaStream(tracks) : null);
  }, [currentVideoTrack]);

  /* ------------------------------------------------------------- devices */
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    setDevices({ audio: list.filter((device) => device.kind === "audioinput"), video: list.filter((device) => device.kind === "videoinput") });
  }, []);

  /** Points every connection's senders at the current microphone and camera/screen. */
  const replaceOutgoingTracks = useCallback(() => {
    for (const link of links.current.values()) {
      for (const transceiver of transceiversOf(link.pc, "audio")) {
        if (transceiver.sender.track !== audioTrackRef.current) void transceiver.sender.replaceTrack(audioTrackRef.current).catch(() => undefined);
      }
      for (const transceiver of transceiversOf(link.pc, "video")) {
        const track = currentVideoTrack();
        if (transceiver.sender.track !== track) void transceiver.sender.replaceTrack(track).catch(() => undefined);
      }
    }
  }, [currentVideoTrack]);

  const startMicrophone = useCallback(async (deviceId?: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { ...AUDIO_CONSTRAINTS, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) } });
    const track = stream.getAudioTracks()[0];
    audioTrackRef.current?.stop();
    track.enabled = micOnRef.current;
    audioTrackRef.current = track;
    setHasMicrophone(true);
    setSelectedAudio(track.getSettings().deviceId ?? deviceId ?? "");
    return track;
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO_CONSTRAINTS, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) } });
    const track = stream.getVideoTracks()[0];
    cameraTrackRef.current?.stop();
    cameraTrackRef.current = track;
    setSelectedVideo(track.getSettings().deviceId ?? deviceId ?? "");
    return track;
  }, []);

  /** Requests camera and microphone together (one prompt), then falls back to audio only. */
  const acquireMedia = useCallback(async (isCancelled: () => boolean = () => false) => {
    setMediaError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("This browser cannot use a camera or microphone here. Use a current browser over HTTPS.");
      setMicOn(false); micOnRef.current = false; setCamOn(false);
      setMediaReady(true);
      return;
    }
    let firstError: unknown = null;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: VIDEO_CONSTRAINTS });
    } catch (error) {
      firstError = error;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
      } catch {
        stream = null;
      }
    }
    if (isCancelled()) {
      stream?.getTracks().forEach((track) => track.stop());
      return;
    }
    audioTrackRef.current?.stop();
    cameraTrackRef.current?.stop();
    audioTrackRef.current = stream?.getAudioTracks()[0] ?? null;
    cameraTrackRef.current = stream?.getVideoTracks()[0] ?? null;
    setHasMicrophone(Boolean(audioTrackRef.current));
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = micOnRef.current;
      setSelectedAudio(audioTrackRef.current.getSettings().deviceId ?? "");
    } else {
      micOnRef.current = false;
      setMicOn(false);
    }
    if (cameraTrackRef.current) setSelectedVideo(cameraTrackRef.current.getSettings().deviceId ?? "");
    setCamOn(Boolean(cameraTrackRef.current));
    if (firstError) {
      setMediaError(stream ? "Camera unavailable: you can join with audio only. " + describeMediaError(firstError) : describeMediaError(firstError));
    }
    setMediaReady(true);
    refreshPreview();
    await refreshDevices();
  }, [refreshDevices, refreshPreview]);

  /* ------------------------------------------------------------ requests */
  const post = useCallback(async <T,>(body: Record<string, unknown>): Promise<T> => {
    const started = performance.now();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, peerId: peerIdRef.current }),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new RoomRequestError(typeof data.error === "string" ? data.error : "The room did not respond.", response.status);
    setLatency(Math.round(performance.now() - started));
    return data as T;
  }, [endpoint]);

  /* --------------------------------------------------------------- links */
  const setLinkState = useCallback((peerId: string, state: RTCPeerConnectionState | null) => {
    setLinkStates((current) => {
      if (state === null) {
        if (!(peerId in current)) return current;
        const next = { ...current };
        delete next[peerId];
        return next;
      }
      return current[peerId] === state ? current : { ...current, [peerId]: state };
    });
  }, []);

  const enqueueSignal = useCallback((link: PeerLink, kind: "offer" | "answer" | "ice", payload: Record<string, unknown>) => {
    // One chain per peer keeps an offer ahead of its candidates on the server.
    link.sendChain = link.sendChain
      .then(() => post({ action: "signal", toPeer: link.peerId, kind, payload: { ...payload, session: link.session } }))
      .catch(() => undefined);
    return link.sendChain;
  }, [post]);

  const flushIce = useCallback((link: PeerLink) => {
    if (link.iceTimer) clearTimeout(link.iceTimer);
    link.iceTimer = null;
    while (link.outgoingIce.length) enqueueSignal(link, "ice", { candidates: link.outgoingIce.splice(0, 30) });
  }, [enqueueSignal]);

  const publishRemote = useCallback((link: PeerLink) => {
    if (links.current.get(link.peerId) !== link) return;
    const video = link.stream.getVideoTracks().find((track) => track.readyState === "live");
    const audio = link.stream.getAudioTracks().find((track) => track.readyState === "live");
    setRemote((current) => ({ ...current, [link.peerId]: { stream: link.stream, hasVideo: Boolean(video && !video.muted), hasAudio: Boolean(audio) } }));
  }, []);

  const applyBitrate = useCallback((link: PeerLink) => {
    const cap = videoBitrateFor(links.current.size, sharingRef.current);
    for (const transceiver of transceiversOf(link.pc, "video")) {
      const parameters = transceiver.sender.getParameters();
      if (!parameters.encodings?.length) continue; // not negotiated yet; retried once connected
      if (parameters.encodings[0].maxBitrate === cap) continue;
      parameters.encodings[0].maxBitrate = cap;
      void transceiver.sender.setParameters(parameters).catch(() => undefined);
    }
  }, []);

  const applyBitrates = useCallback(() => {
    const key = `${links.current.size}:${sharingRef.current}`;
    if (key === lastBitrateKey.current) return;
    lastBitrateKey.current = key;
    for (const link of links.current.values()) if (link.pc.connectionState === "connected") applyBitrate(link);
  }, [applyBitrate]);

  const closeLink = useCallback((peerId: string) => {
    const link = links.current.get(peerId);
    if (!link) return;
    links.current.delete(peerId);
    if (link.iceTimer) clearTimeout(link.iceTimer);
    link.pc.onicecandidate = null;
    link.pc.ontrack = null;
    link.pc.onconnectionstatechange = null;
    link.pc.onnegotiationneeded = null;
    link.pc.close();
    setRemote((current) => {
      if (!(peerId in current)) return current;
      const next = { ...current };
      delete next[peerId];
      return next;
    });
    setLinkState(peerId, null);
    setQuality((current) => {
      if (!(peerId in current)) return current;
      const next = { ...current };
      delete next[peerId];
      return next;
    });
  }, [setLinkState]);

  const negotiate = useCallback(async (link: PeerLink) => {
    if (links.current.get(link.peerId) !== link) return;
    try {
      link.makingOffer = true;
      await setLocal(link.pc);
      const description = link.pc.localDescription;
      if (description && description.type === "offer") await enqueueSignal(link, "offer", { type: description.type, sdp: description.sdp });
    } catch {
      /* a collision is resolved by the polite side */
    } finally {
      link.makingOffer = false;
    }
  }, [enqueueSignal]);

  const createLink = useCallback((peerId: string, initiator: boolean, session = shortId()) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, bundlePolicy: "max-bundle", rtcpMuxPolicy: "require" });
    const link: PeerLink = {
      peerId, pc, session, initiator, polite: !initiator, makingOffer: false, ignoreOffer: false,
      pendingIce: [], outgoingIce: [], iceTimer: null, sendChain: Promise.resolve(), stream: new MediaStream(),
      createdAt: Date.now(), troubleSince: null, restarts: 0,
    };
    links.current.set(peerId, link);
    setLinkState(peerId, "new");
    debugLog("link", initiator ? "calling" : "answering", peerId.slice(0, 6), "session", session);

    pc.onicecandidate = ({ candidate }) => {
      if (links.current.get(peerId) !== link) return;
      if (!candidate) {
        flushIce(link);
        return;
      }
      link.outgoingIce.push(candidate.toJSON());
      if (!link.iceTimer) link.iceTimer = setTimeout(() => flushIce(link), ICE_BATCH_MS);
    };
    pc.ontrack = ({ track }) => {
      const tracks = link.stream.getTracks().filter((existing) => existing.kind !== track.kind || existing.id === track.id);
      if (!tracks.includes(track)) tracks.push(track);
      link.stream = new MediaStream(tracks);
      track.onmute = () => publishRemote(link);
      track.onunmute = () => publishRemote(link);
      track.onended = () => publishRemote(link);
      publishRemote(link);
    };
    pc.onconnectionstatechange = () => {
      if (links.current.get(peerId) !== link) return;
      const state = pc.connectionState;
      debugLog("connection", peerId.slice(0, 6), state, `${Date.now() - link.createdAt} ms`);
      setLinkState(peerId, state);
      if (state === "connected") {
        link.troubleSince = null;
        link.restarts = 0;
        applyBitrate(link);
      } else if (state === "failed" || state === "disconnected") {
        link.troubleSince ??= Date.now();
      }
    };
    pc.onnegotiationneeded = () => void negotiate(link);

    if (initiator) {
      // Fixed audio + video transceivers: tracks can later be swapped (camera, screen,
      // device change) with replaceTrack, without renegotiating, even if absent today.
      pc.addTransceiver(audioTrackRef.current ?? "audio", { direction: "sendrecv" });
      pc.addTransceiver(currentVideoTrack() ?? "video", { direction: "sendrecv" });
    }
    return link;
  }, [applyBitrate, currentVideoTrack, debugLog, flushIce, negotiate, publishRemote, setLinkState]);

  const drainIce = useCallback(async (link: PeerLink) => {
    const orphan = orphanIce.current.get(link.peerId);
    if (orphan && orphan.session === link.session) {
      link.pendingIce.push(...orphan.candidates);
      orphanIce.current.delete(link.peerId);
    }
    const queued = link.pendingIce.splice(0);
    for (const candidate of queued) await link.pc.addIceCandidate(candidate).catch(() => undefined);
  }, []);

  /** Sends our current tracks on transceivers that a remote offer created. */
  const attachLocalTracks = useCallback((link: PeerLink) => {
    for (const transceiver of link.pc.getTransceivers()) {
      if (transceiver.currentDirection === "stopped") continue;
      const kind = transceiver.receiver.track?.kind;
      if (kind !== "audio" && kind !== "video") continue;
      if (transceiver.direction === "recvonly" || transceiver.direction === "inactive") transceiver.direction = "sendrecv";
      const track = kind === "audio" ? audioTrackRef.current : currentVideoTrack();
      if (transceiver.sender.track !== track) void transceiver.sender.replaceTrack(track).catch(() => undefined);
    }
  }, [currentVideoTrack]);

  const handleDescription = useCallback(async (fromPeer: string, payload: Record<string, unknown>) => {
    const description = descriptionFrom(payload);
    if (!description) return;
    const session = typeof payload.session === "string" ? payload.session.slice(0, 64) : "";
    let link = links.current.get(fromPeer);
    if (description.type === "answer" && (!link || (session && link.session !== session))) return; // stale answer
    if (description.type === "offer" && link && session && link.session !== session) {
      const peer = peersRef.current.find((candidate) => candidate.peerId === fromPeer);
      const weCall = link.initiator && peer ? shouldInitiate(selfRef.current, peer, hostPeerIdRef.current) : false;
      if (weCall && link.pc.connectionState !== "failed") return; // they will answer our offer instead
      closeLink(fromPeer);
      link = undefined;
    }
    if (!link) {
      if (description.type !== "offer") return;
      link = createLink(fromPeer, false, session || shortId());
    }
    const pc = link.pc;
    const collision = description.type === "offer" && (link.makingOffer || pc.signalingState !== "stable");
    link.ignoreOffer = !link.polite && collision;
    if (link.ignoreOffer) return;
    if (collision) await pc.setLocalDescription({ type: "rollback" }).catch(() => undefined);
    if (description.type === "answer" && pc.signalingState !== "have-local-offer") return;
    await pc.setRemoteDescription(description);
    await drainIce(link);
    if (description.type === "offer") {
      attachLocalTracks(link);
      await setLocal(pc);
      const answer = pc.localDescription;
      // Queued behind earlier sends to this peer; the poll loop does not wait for delivery.
      if (answer) void enqueueSignal(link, "answer", { type: answer.type, sdp: answer.sdp });
    }
  }, [attachLocalTracks, closeLink, createLink, drainIce, enqueueSignal]);

  const handleIce = useCallback(async (fromPeer: string, payload: Record<string, unknown>) => {
    const candidates = candidatesFrom(payload);
    if (!candidates.length) return;
    const session = typeof payload.session === "string" ? payload.session.slice(0, 64) : "";
    const link = links.current.get(fromPeer);
    if (!link || (session && link.session !== session)) {
      const existing = orphanIce.current.get(fromPeer);
      const merged = existing && existing.session === session ? [...existing.candidates, ...candidates] : candidates;
      orphanIce.current.set(fromPeer, { session, candidates: merged.slice(-60), at: Date.now() });
      return;
    }
    if (!link.pc.remoteDescription) {
      link.pendingIce.push(...candidates);
      return;
    }
    // Candidates for an offer we deliberately ignored are expected to fail.
    for (const candidate of candidates) await link.pc.addIceCandidate(candidate).catch(() => undefined);
  }, []);

  const setMicrophoneEnabled = useCallback((enabled: boolean) => {
    micOnRef.current = enabled;
    if (audioTrackRef.current) audioTrackRef.current.enabled = enabled;
    setMicOn(enabled);
  }, []);

  const handleSignal = useCallback(async (signal: SignalEnvelope) => {
    if (signal.kind === "control") {
      const action = signal.payload.action;
      if (action === "mute-all" || action === "mute") {
        if (micOnRef.current) notify("The host muted your microphone.");
        setMicrophoneEnabled(false);
      } else if (action === "lower-hands") {
        if (handRef.current) notify("The host lowered raised hands.");
        handRef.current = false;
        setHandRaised(false);
      }
      return;
    }
    if (signal.kind === "offer" || signal.kind === "answer") return handleDescription(signal.fromPeer, signal.payload);
    if (signal.kind === "ice") return handleIce(signal.fromPeer, signal.payload);
    if (signal.kind === "bye") closeLink(signal.fromPeer);
  }, [closeLink, handleDescription, handleIce, notify, setMicrophoneEnabled]);

  /** Opens connections we are responsible for and closes ones no longer wanted. */
  const reconcile = useCallback((nextPeers: ConferencePeer[]) => {
    const host = hostPeerIdRef.current;
    const byId = new Map(nextPeers.map((peer) => [peer.peerId, peer]));
    for (const peerId of [...links.current.keys()]) {
      const peer = byId.get(peerId);
      if (!peer || !connectionWanted(selfRef.current, peer, host)) closeLink(peerId);
    }
    for (const peer of nextPeers) {
      if (!links.current.has(peer.peerId) && shouldInitiate(selfRef.current, peer, host)) createLink(peer.peerId, true);
    }
    const now = Date.now();
    for (const [peerId, orphan] of orphanIce.current) if (now - orphan.at > ORPHAN_ICE_TTL_MS || !byId.has(peerId)) orphanIce.current.delete(peerId);
  }, [closeLink, createLink]);

  /** ICE restart first; rebuild the connection if restarts do not recover it. */
  const checkHealth = useCallback(() => {
    const now = Date.now();
    for (const link of [...links.current.values()]) {
      const state = link.pc.connectionState;
      if (state === "connected") continue;
      const age = now - link.createdAt;
      const troubled = link.troubleSince ? now - link.troubleSince : 0;
      if (link.initiator) {
        const needsRestart = state === "failed" || (state === "disconnected" && troubled > 4000);
        if (needsRestart && link.restarts < 2 && link.pc.signalingState === "stable") {
          debugLog("ice restart", link.peerId.slice(0, 6), state);
          link.restarts += 1;
          link.troubleSince = now;
          if (typeof link.pc.restartIce === "function") link.pc.restartIce();
          else void link.pc.createOffer({ iceRestart: true }).then(async (offer) => {
            await link.pc.setLocalDescription(offer);
            await enqueueSignal(link, "offer", { type: offer.type, sdp: offer.sdp });
          }).catch(() => undefined);
        } else if ((needsRestart && link.restarts >= 2 && troubled > 6000) || ((state === "new" || state === "connecting") && age > 25_000)) {
          debugLog("rebuilding", link.peerId.slice(0, 6), state);
          closeLink(link.peerId); // reconcile() opens a fresh connection with a new session id
        }
      } else if ((state === "failed" && troubled > 15_000) || ((state === "new" || state === "connecting") && age > 40_000)) {
        debugLog("dropping stalled answer side", link.peerId.slice(0, 6), state);
        closeLink(link.peerId);
      }
    }
  }, [closeLink, debugLog, enqueueSignal]);

  /* -------------------------------------------------------------- polling */
  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  }, []);

  const teardown = useCallback((nextPhase: RoomPhase, text: string) => {
    activeRef.current = false;
    stopPolling();
    for (const peerId of [...links.current.keys()]) closeLink(peerId);
    // The room is over for this participant: release the camera, microphone and screen.
    for (const track of [audioTrackRef.current, cameraTrackRef.current, screenTrackRef.current]) track?.stop();
    audioTrackRef.current = null;
    cameraTrackRef.current = null;
    screenTrackRef.current = null;
    sharingRef.current = false;
    setSharing(false);
    setCamOn(false);
    setHasMicrophone(false);
    setPreviewStream(null);
    monitors.current.forEach(clearInterval);
    monitors.current = [];
    setPeers([]);
    peersRef.current = [];
    setMessage(text);
    setPhase(nextPhase);
  }, [closeLink, stopPolling]);

  const applySelf = useCallback((next: { mode: string; role: string; isHost?: boolean }) => {
    const isHost = next.isHost ?? next.role === "host";
    selfRef.current = { peerId: peerIdRef.current, mode: next.mode, isHost };
    setSelf({ peerId: peerIdRef.current, mode: next.mode, isHost, role: next.role });
  }, []);

  const syncPeers = useCallback((nextPeers: ConferencePeer[]) => {
    const previous = new Map(peersRef.current.map((peer) => [peer.peerId, peer]));
    if (!firstPeerSync.current) {
      for (const peer of nextPeers) {
        const before = previous.get(peer.peerId);
        if (!before) notify(`${peer.displayName} joined.`);
        else if (selfRef.current.isHost && peer.handRaised && !before.handRaised) notify(`${peer.displayName} raised a hand.`);
      }
      const current = new Set(nextPeers.map((peer) => peer.peerId));
      for (const peer of previous.values()) if (!current.has(peer.peerId)) notify(`${peer.displayName} left.`);
    }
    firstPeerSync.current = false;
    peersRef.current = nextPeers;
    setPeers(nextPeers);
    reconcile(nextPeers);
  }, [notify, reconcile]);

  const pollRef = useRef<() => Promise<void>>(async () => undefined);

  const schedulePoll = useCallback((delay: number) => {
    stopPolling();
    if (!activeRef.current) return;
    pollTimer.current = setTimeout(() => void pollRef.current(), delay);
  }, [stopPolling]);

  const enterRoom = useCallback((data: JoinResponse) => {
    iceServersRef.current = Array.isArray(data.iceServers) ? data.iceServers : [];
    hostPeerIdRef.current = data.hostPeerId;
    applySelf({ mode: data.self.mode, role: data.self.role, isHost: data.self.isHost });
    setCapacity(data.capacity);
    firstPeerSync.current = true;
    syncPeers(data.peers ?? []);
  }, [applySelf, syncPeers]);

  const rejoin = useCallback(async () => {
    setPhase("rejoining");
    for (const peerId of [...links.current.keys()]) closeLink(peerId);
    const data = await post<JoinResponse>({ action: "join" });
    enterRoom(data);
    setPhase("joined");
  }, [closeLink, enterRoom, post]);

  /** Returns false when the room is over for this participant. */
  const handleRoomError = useCallback(async (error: unknown): Promise<boolean> => {
    let failure = error;
    if (failure instanceof RoomRequestError && failure.status === 409) {
      try {
        await rejoin();
        return true;
      } catch (rejoinError) {
        failure = rejoinError;
      }
    }
    if (failure instanceof RoomRequestError) {
      if (failure.status === 410) {
        teardown("removed", failure.message);
        return false;
      }
      if ([401, 403, 404, 503].includes(failure.status)) {
        teardown("ended", failure.message);
        return false;
      }
    }
    failures.current += 1;
    if (failures.current >= 2) setConnectionIssue(true);
    return true;
  }, [rejoin, teardown]);

  useEffect(() => {
    pollRef.current = async () => {
      if (!activeRef.current) return;
      // One poll at a time: signals must be applied sequentially per connection.
      if (pollInFlight.current) {
        pollAgain.current = true;
        return;
      }
      pollInFlight.current = true;
      let signalsReceived = 0;
      try {
        const data = await post<PollResponse>({
          action: "poll",
          audioEnabled: micOnRef.current && Boolean(audioTrackRef.current),
          videoEnabled: Boolean(currentVideoTrack()),
          sharingScreen: sharingRef.current,
          handRaised: handRef.current,
        });
        if (!activeRef.current) return;
        failures.current = 0;
        setConnectionIssue(false);
        hostPeerIdRef.current = data.hostPeerId ?? null;
        if (selfRef.current.mode === "viewer" && data.self.mode === "mesh") notify("You now have an interactive seat.");
        applySelf({ mode: data.self.mode, role: data.self.role });
        setCapacity(data.capacity);
        syncPeers(data.peers ?? []);
        const signals = orderSignals(data.signals ?? []);
        signalsReceived = signals.length;
        for (const signal of signals) {
          await handleSignal(signal).catch((error: unknown) => debugLog("signal failed", signal.kind, signal.fromPeer, error));
        }
        checkHealth();
        applyBitrates();
      } catch (error) {
        debugLog("poll failed", error);
        const keepGoing = await handleRoomError(error);
        if (!keepGoing) {
          pollInFlight.current = false;
          return;
        }
      }
      pollInFlight.current = false;
      const now = Date.now();
      const negotiating = [...links.current.values()].some((link) => link.pc.connectionState !== "connected" && now - Math.max(link.createdAt, link.troubleSince ?? 0) < 30_000);
      const again = pollAgain.current;
      pollAgain.current = false;
      schedulePoll(again ? 0 : nextPollDelay({ signalsReceived, negotiating, hidden: document.visibilityState === "hidden", failures: failures.current }));
    };
  }, [applyBitrates, applySelf, checkHealth, currentVideoTrack, debugLog, handleRoomError, handleSignal, notify, post, schedulePoll, syncPeers]);

  /* ---------------------------------------------------- speaking + stats */
  const startMonitors = useCallback(() => {
    monitors.current.forEach(clearInterval);
    const levels = setInterval(() => {
      const next: Record<string, boolean> = {};
      for (const link of links.current.values()) {
        let level = 0;
        for (const receiver of link.pc.getReceivers()) {
          if (receiver.track?.kind !== "audio" || typeof receiver.getSynchronizationSources !== "function") continue;
          for (const source of receiver.getSynchronizationSources()) level = Math.max(level, source.audioLevel ?? 0);
        }
        if (level > 0.06) next[link.peerId] = true;
      }
      const track = audioTrackRef.current;
      if (track && micOnRef.current && audioContext.current) {
        if (!localAnalyser.current || localAnalyser.current.trackId !== track.id) {
          localAnalyser.current?.source.disconnect();
          const source = audioContext.current.createMediaStreamSource(new MediaStream([track]));
          const analyser = audioContext.current.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          localAnalyser.current = { analyser, source, trackId: track.id };
        }
        const samples = new Uint8Array(localAnalyser.current.analyser.fftSize);
        localAnalyser.current.analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
        if (Math.sqrt(sum / samples.length) > 0.04) next.self = true;
      }
      const previous = speakingRef.current;
      const changed = Object.keys(next).length !== Object.keys(previous).length || Object.keys(next).some((key) => !previous[key]);
      if (changed) {
        speakingRef.current = next;
        setSpeaking(next);
      }
    }, 400);
    const stats = setInterval(() => {
      for (const link of links.current.values()) {
        if (link.pc.connectionState !== "connected") continue;
        void link.pc.getStats().then((report) => {
          let pair: RTCIceCandidatePairStats | undefined;
          report.forEach((entry) => {
            if (entry.type === "transport" && entry.selectedCandidatePairId) pair = report.get(entry.selectedCandidatePairId) as RTCIceCandidatePairStats;
          });
          if (!pair) report.forEach((entry) => { if (entry.type === "candidate-pair" && entry.nominated && entry.state === "succeeded") pair = entry; });
          const local = pair?.localCandidateId ? report.get(pair.localCandidateId) : undefined;
          const rtt = typeof pair?.currentRoundTripTime === "number" ? Math.round(pair.currentRoundTripTime * 1000) : null;
          const level: LinkQuality["level"] = rtt === null ? "unknown" : rtt < 150 ? "good" : rtt < 400 ? "fair" : "poor";
          setQuality((current) => ({ ...current, [link.peerId]: { rttMs: rtt, relayed: local?.candidateType === "relay", level } }));
        }).catch(() => undefined);
      }
    }, 4000);
    monitors.current = [levels, stats];
  }, []);

  /* -------------------------------------------------------------- actions */
  const join = useCallback(async () => {
    if (activeRef.current) return;
    if (!peerIdRef.current) peerIdRef.current = shortId() + shortId();
    setPhase("joining");
    setMessage("");
    try {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Context && !audioContext.current) audioContext.current = new Context();
      void audioContext.current?.resume().catch(() => undefined);
    } catch {
      audioContext.current = null;
    }
    try {
      activeRef.current = true;
      const data = await post<JoinResponse>({ action: "join" });
      enterRoom(data);
      setPhase("joined");
      startMonitors();
      schedulePoll(300);
    } catch (error) {
      activeRef.current = false;
      if (error instanceof RoomRequestError && error.status === 410) {
        teardown("removed", error.message);
        return;
      }
      setPhase("lobby");
      setMessage(error instanceof Error ? error.message : "Could not join the room. Try again.");
    }
  }, [enterRoom, post, schedulePoll, startMonitors, teardown]);

  const sendLeave = useCallback((beacon: boolean) => {
    if (!peerIdRef.current) return;
    const body = JSON.stringify({ action: "leave", peerId: peerIdRef.current });
    if (beacon && typeof navigator.sendBeacon === "function" && navigator.sendBeacon(endpoint, body)) return;
    void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  }, [endpoint]);

  const leave = useCallback(() => {
    if (activeRef.current) sendLeave(false);
    teardown("ended", "You left the session.");
  }, [sendLeave, teardown]);

  const toggleMic = useCallback(async () => {
    if (!audioTrackRef.current) {
      try {
        micOnRef.current = true;
        await startMicrophone(selectedAudio || undefined);
        setMicOn(true);
        setMediaError("");
        replaceOutgoingTracks();
        refreshPreview();
        await refreshDevices();
      } catch (error) {
        micOnRef.current = false;
        setMicOn(false);
        setMediaError(describeMediaError(error));
      }
      return;
    }
    setMicrophoneEnabled(!micOnRef.current);
  }, [refreshDevices, refreshPreview, replaceOutgoingTracks, selectedAudio, setMicrophoneEnabled, startMicrophone]);

  const toggleCam = useCallback(async () => {
    if (cameraTrackRef.current) {
      // Stop the device (camera light off) instead of only disabling the track.
      cameraTrackRef.current.stop();
      cameraTrackRef.current = null;
      setCamOn(false);
      replaceOutgoingTracks();
      refreshPreview();
      return;
    }
    try {
      await startCamera(selectedVideo || undefined);
      setCamOn(true);
      setMediaError("");
      replaceOutgoingTracks();
      refreshPreview();
      await refreshDevices();
    } catch (error) {
      setCamOn(false);
      setMediaError(describeMediaError(error));
    }
  }, [refreshDevices, refreshPreview, replaceOutgoingTracks, selectedVideo, startCamera]);

  const stopShare = useCallback(() => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    sharingRef.current = false;
    setSharing(false);
    replaceOutgoingTracks();
    refreshPreview();
    lastBitrateKey.current = "";
    applyBitrates();
  }, [applyBitrates, refreshPreview, replaceOutgoingTracks]);

  const toggleShare = useCallback(async () => {
    if (screenTrackRef.current) {
      stopShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError("Screen sharing is not supported in this browser.");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: false });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      if ("contentHint" in track) track.contentHint = "detail";
      track.onended = () => stopShare();
      screenTrackRef.current = track;
      sharingRef.current = true;
      setSharing(true);
      replaceOutgoingTracks();
      refreshPreview();
      lastBitrateKey.current = "";
      applyBitrates();
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "NotAllowedError") return; // user cancelled
      setMediaError("Screen sharing could not start. " + describeMediaError(error));
    }
  }, [applyBitrates, refreshPreview, replaceOutgoingTracks, stopShare]);

  const toggleHand = useCallback(() => {
    handRef.current = !handRef.current;
    setHandRaised(handRef.current);
    schedulePoll(50);
  }, [schedulePoll]);

  const selectDevice = useCallback(async (kind: "audio" | "video", deviceId: string) => {
    try {
      if (kind === "audio") {
        setSelectedAudio(deviceId);
        if (audioTrackRef.current || micOnRef.current) await startMicrophone(deviceId);
      } else {
        setSelectedVideo(deviceId);
        if (cameraTrackRef.current) await startCamera(deviceId);
      }
      replaceOutgoingTracks();
      refreshPreview();
      setMediaError("");
    } catch (error) {
      setMediaError(describeMediaError(error));
    }
  }, [refreshPreview, replaceOutgoingTracks, startCamera, startMicrophone]);

  const hostAction = useCallback(async (control: "mute-all" | "lower-hands" | "mute" | "grant-seat" | "remove", targetPeerId?: string) => {
    try {
      await post({ action: "host", control, targetPeerId });
      if (control === "remove") closeLink(targetPeerId ?? "");
      schedulePoll(100);
    } catch (error) {
      notify(error instanceof Error ? error.message : "That host action was not accepted.");
    }
  }, [closeLink, notify, post, schedulePoll]);

  const dismissNotice = useCallback((id: number) => setNotices((current) => current.filter((item) => item.id !== id)), []);

  /* ------------------------------------------------------------ lifecycle */
  useEffect(() => {
    unmounted.current = false;
    let cancelled = false;
    const linkMap = links.current;
    try {
      debugEnabled.current = window.localStorage.getItem("purpose:room-debug") === "1";
    } catch {
      debugEnabled.current = false;
    }
    void acquireMedia(() => cancelled || unmounted.current);
    const onDeviceChange = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    const onPageHide = () => {
      if (activeRef.current) sendLeave(true);
    };
    const onPageShow = (event: PageTransitionEvent) => {
      // Restored from the back/forward cache after a leave beacon: rejoin quietly.
      if (event.persisted && activeRef.current) schedulePoll(50);
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      unmounted.current = true;
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      if (activeRef.current) sendLeave(false);
      activeRef.current = false;
      stopPolling();
      for (const link of linkMap.values()) link.pc.close();
      linkMap.clear();
      monitors.current.forEach(clearInterval);
      monitors.current = [];
      audioTrackRef.current?.stop();
      cameraTrackRef.current?.stop();
      screenTrackRef.current?.stop();
      audioTrackRef.current = null;
      cameraTrackRef.current = null;
      screenTrackRef.current = null;
      localAnalyser.current?.source.disconnect();
      localAnalyser.current = null;
      void audioContext.current?.close().catch(() => undefined);
      audioContext.current = null;
    };
    // Mount-only: media and listeners belong to this room instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Lobby presence: who is already inside. */
  useEffect(() => {
    if (phase !== "lobby") return;
    let stopped = false;
    const load = async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { presence?: Presence };
        if (!stopped) setPresence(data.presence ?? null);
      } catch {
        /* presence is informational */
      }
    };
    void load();
    const timer = setInterval(load, 8000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [endpoint, phase]);

  return {
    phase, message, self, peers, remote, linkStates, quality, speaking, capacity, presence, latency, connectionIssue, notices,
    previewStream, micOn, camOn, sharing, handRaised, mediaError, mediaReady, devices, selectedAudio, selectedVideo,
    hasMicrophone,
    join, leave, toggleMic, toggleCam, toggleShare, toggleHand, selectDevice, hostAction, dismissNotice,
    retryMedia: () => acquireMedia(() => unmounted.current),
  };
}
