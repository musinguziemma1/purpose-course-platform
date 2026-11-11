"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Hand,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ScreenShare,
  ShieldCheck,
  Signal,
  UserRound,
  Video,
  VideoOff,
  Wifi,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";

type Peer = {
  peerId: string;
  displayName: string;
  role: string;
  mode: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  sharingScreen: boolean;
  handRaised: boolean;
};

type SignalEnvelope = { id: number; fromPeer: string; kind: string; payload: Record<string, unknown> };

type Connection = {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  remoteSet: boolean;
  polite: boolean;
};

const POLL_MS = 1200;

export function VideoRoom({
  roomCode,
  selfName,
  isHostRole,
  onLeaveHref,
}: {
  roomCode: string;
  selfName: string;
  isHostRole: boolean;
  onLeaveHref: string;
}) {
  const peerIdRef = useRef<string>("");
  const [status, setStatus] = useState<"idle" | "connecting" | "joined" | "error">("idle");
  const [error, setError] = useState("");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [mode, setMode] = useState<"mesh" | "viewer">("mesh");
  const [role, setRole] = useState(isHostRole ? "host" : "student");
  const [capacity, setCapacity] = useState({ meshSeats: 8, meshUsed: 1 });
  const [copied, setCopied] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [latency, setLatency] = useState<number | null>(null);

  const connections = useRef<Map<string, Connection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const stateRef = useRef({ micOn: true, camOn: true, sharing: false, handRaised: false });
  const leavingRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    stateRef.current = { micOn, camOn, sharing, handRaised };
  }, [micOn, camOn, sharing, handRaised]);

  /* -------------------------------------------------- signalling helpers */

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const started = performance.now();
      const response = await fetch(`/api/conference/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, peerId: peerIdRef.current }),
        cache: "no-store",
      });
      setLatency(Math.round(performance.now() - started));
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Signalling failed");
      }
      return (await response.json()) as Record<string, unknown>;
    },
    [roomCode],
  );

  const sendSignal = useCallback(
    async (toPeer: string, kind: string, payload: Record<string, unknown>) => {
      await post({ action: "signal", toPeer, kind, payload }).catch(() => undefined);
    },
    [post],
  );

  const closeConnection = useCallback((remotePeerId: string) => {
    const entry = connections.current.get(remotePeerId);
    if (entry) {
      entry.pc.onicecandidate = null;
      entry.pc.ontrack = null;
      entry.pc.onconnectionstatechange = null;
      entry.pc.close();
      connections.current.delete(remotePeerId);
    }
    setRemoteStreams((current) => {
      if (!(remotePeerId in current)) return current;
      const next = { ...current };
      delete next[remotePeerId];
      return next;
    });
  }, []);

  const ensureConnection = useCallback(
    (remotePeerId: string, initiator: boolean) => {
      const existing = connections.current.get(remotePeerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });
      const entry: Connection = { pc, pendingIce: [], remoteSet: false, polite: peerIdRef.current > remotePeerId };
      connections.current.set(remotePeerId, entry);

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(remotePeerId, "ice", { candidate: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote) {
          setRemoteStreams((current) => ({ ...current, [remotePeerId]: remote }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          try {
            pc.restartIce();
          } catch {
            /* ignore */
          }
        }
        if (pc.connectionState === "closed") closeConnection(remotePeerId);
      };

      if (initiator) {
        void (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal(remotePeerId, "offer", { sdp: pc.localDescription?.sdp, type: pc.localDescription?.type });
        })();
      }
      return entry;
    },
    [closeConnection, sendSignal],
  );

  const iceServersRef = useRef<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);

  /* ------------------------------------------------------------- lifecycle */

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    peerIdRef.current = crypto.randomUUID();

    async function start() {
      setStatus("connecting");
      try {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setCamOn(false);
            setMediaError("Camera unavailable — joined with audio only.");
          } catch {
            setMediaError("No camera or microphone available — you joined as an observer.");
            setMicOn(false);
            setCamOn(false);
          }
        }
        if (cancelled) return;
        localStreamRef.current = stream;
        setLocalStream(stream);
        cameraTrackRef.current = stream?.getVideoTracks()[0] ?? null;
        if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;

        const joined = await post({ action: "join", displayName: selfName });
        if (cancelled) return;

        const servers = (joined.iceServers as RTCIceServer[] | undefined) ?? [];
        if (servers.length) iceServersRef.current = servers;
        setMode(((joined.self as { mode?: string } | undefined)?.mode as "mesh" | "viewer") ?? "mesh");
        setRole(((joined.self as { role?: string } | undefined)?.role as string) ?? "student");
        setCapacity((joined.capacity as { meshSeats: number; meshUsed: number }) ?? { meshSeats: 8, meshUsed: 1 });
        setStatus("joined");

        const existing = (joined.peers as Peer[] | undefined) ?? [];
        setPeers(existing);
        const selfMode = (joined.self as { mode?: string } | undefined)?.mode ?? "mesh";
        const hostPeerId = (joined.hostPeerId as string | null) ?? null;

        if (selfMode === "mesh") {
          for (const peer of existing) {
            const shouldInitiate = peer.role === "viewer" ? false : peerIdRef.current < peer.peerId;
            if (shouldInitiate) ensureConnection(peer.peerId, true);
          }
        } else if (hostPeerId) {
          ensureConnection(hostPeerId, true);
        }

        pollTimer = setInterval(() => void poll(), POLL_MS);
      } catch (cause) {
        if (!cancelled) {
          setStatus("error");
          setError(cause instanceof Error ? cause.message : "Could not join the room.");
        }
      }
    }

    async function poll() {
      try {
        const data = await post({
          action: "poll",
          audioEnabled: stateRef.current.micOn,
          videoEnabled: stateRef.current.camOn,
          sharingScreen: stateRef.current.sharing,
          handRaised: stateRef.current.handRaised,
        });
        if (cancelled) return;

        const nextPeers = (data.peers as Peer[] | undefined) ?? [];
        const self = data.self as { mode?: string; role?: string } | null;
        if (self?.mode) setMode(self.mode as "mesh" | "viewer");
        if (self?.role) setRole(self.role);
        if (data.capacity) setCapacity(data.capacity as { meshSeats: number; meshUsed: number });

        setPeers(nextPeers);
        const known = new Set(nextPeers.map((peer) => peer.peerId));
        Array.from(connections.current.keys()).forEach((remotePeerId) => {
          if (!known.has(remotePeerId)) closeConnection(remotePeerId);
        });

        for (const peer of nextPeers) {
          const selfMode = self?.mode ?? "mesh";
          const hostPeer = nextPeers.find((candidate) => candidate.role === "host");
          if (selfMode === "viewer") {
            if (hostPeer && hostPeer.peerId === peer.peerId && !connections.current.has(peer.peerId)) {
              ensureConnection(peer.peerId, true);
            }
            continue;
          }
          if (peer.mode === "viewer") continue;
          if (peerIdRef.current < peer.peerId && !connections.current.has(peer.peerId)) {
            ensureConnection(peer.peerId, true);
          }
        }

        const signals = (data.signals as SignalEnvelope[] | undefined) ?? [];
        for (const signal of signals) {
          await handleSignal(signal);
        }
      } catch {
        /* transient — keep the room alive and retry */
      }
    }

    async function handleSignal(signal: SignalEnvelope) {
      const remotePeerId = signal.fromPeer;
      if (signal.kind === "offer") {
        const entry = ensureConnection(remotePeerId, false);
        const sdp = signal.payload.sdp as string | undefined;
        const type = signal.payload.type as RTCSdpType | undefined;
        if (!sdp || !type) return;
        await entry.pc.setRemoteDescription({ type, sdp });
        entry.remoteSet = true;
        for (const candidate of entry.pendingIce) await entry.pc.addIceCandidate(candidate).catch(() => undefined);
        entry.pendingIce = [];
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        await sendSignal(remotePeerId, "answer", { sdp: entry.pc.localDescription?.sdp, type: entry.pc.localDescription?.type });
        return;
      }
      if (signal.kind === "answer") {
        const entry = connections.current.get(remotePeerId);
        if (!entry) return;
        const sdp = signal.payload.sdp as string | undefined;
        const type = signal.payload.type as RTCSdpType | undefined;
        if (!sdp || !type) return;
        if (entry.pc.signalingState === "have-local-offer") {
          await entry.pc.setRemoteDescription({ type, sdp });
          entry.remoteSet = true;
          for (const candidate of entry.pendingIce) await entry.pc.addIceCandidate(candidate).catch(() => undefined);
          entry.pendingIce = [];
        }
        return;
      }
      if (signal.kind === "ice") {
        const entry = connections.current.get(remotePeerId);
        if (!entry) return;
        const candidate = signal.payload.candidate as RTCIceCandidateInit | undefined;
        if (!candidate) return;
        if (entry.remoteSet) await entry.pc.addIceCandidate(candidate).catch(() => undefined);
        else entry.pendingIce.push(candidate);
        return;
      }
      if (signal.kind === "bye") {
        closeConnection(remotePeerId);
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      leavingRef.current = true;
      Array.from(connections.current.keys()).forEach((remotePeerId) => closeConnection(remotePeerId));
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (peerIdRef.current) {
        void fetch(`/api/conference/${roomCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave", peerId: peerIdRef.current }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- controls */

  function toggleMic() {
    const stream = localStreamRef.current;
    const next = !micOn;
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }

  function toggleCam() {
    const stream = localStreamRef.current;
    const next = !camOn;
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCamOn(next);
  }

  async function toggleShare() {
    if (sharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      const camera = cameraTrackRef.current;
      connections.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((item) => item.track?.kind === "video");
        if (sender && camera) void sender.replaceTrack(camera);
      });
      const stream = localStreamRef.current;
      if (stream && camera) {
        stream.getVideoTracks().forEach((track) => stream.removeTrack(track));
        stream.addTrack(camera);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      const [screenTrack] = display.getVideoTracks();
      if (!screenTrack) return;
      screenStreamRef.current = display;
      connections.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((item) => item.track?.kind === "video");
        if (sender) void sender.replaceTrack(screenTrack);
      });
      if (localVideoRef.current) {
        const preview = new MediaStream([screenTrack]);
        localVideoRef.current.srcObject = preview;
      }
      screenTrack.onended = () => void toggleShare();
      setSharing(true);
      setCamOn(true);
    } catch {
      setMediaError("Screen sharing was cancelled or unsupported in this browser.");
    }
  }

  async function hostControl(control: "mute-all" | "grant-seat" | "remove" | "lower-hands", targetPeerId?: string) {
    await post({ action: "host", control, targetPeerId }).catch(() => undefined);
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  const isHost = role === "host";
  const remoteList = peers.filter((peer) => peer.peerId in remoteStreams);

  return (
    <div className="overflow-hidden rounded-2xl border border-navy/15 bg-ink text-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[10.5px] uppercase tracking-[0.1em]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/80">
            <span className={cn("h-2 w-2 rounded-full", status === "joined" ? "live-pulse bg-source" : "bg-amber-400")} />
            {status === "joined" ? (mode === "viewer" ? "audience" : "interactive") : "connecting"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/70">
            <UserRound className="h-3 w-3" /> {peers.length + 1} here
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/70">
            <Wifi className="h-3 w-3 text-gold" /> {capacity.meshUsed}/{capacity.meshSeats} seats
          </span>
          {latency !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/60">
              <Signal className="h-3 w-3 text-gold" /> {latency} ms
            </span>
          ) : null}
          {isHost ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 font-semibold text-ink">
              <ShieldCheck className="h-3 w-3" /> host
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyInvite}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[10.5px] font-medium text-paper/80 hover:border-gold hover:text-gold"
          >
            <Copy className="h-3 w-3" /> {copied ? "Link copied" : "Copy invite"}
          </button>
        </div>
      </div>

      {mediaError ? (
        <p className="border-b border-white/10 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">{mediaError}</p>
      ) : null}
      {status === "error" ? (
        <div className="px-4 py-10 text-center">
          <p className="font-serif text-xl">Could not join the room</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-paper/60">{error}</p>
          <Link href={onLeaveHref} className="mt-3 inline-flex text-[11.5px] font-semibold text-gold hover:underline">
            Back to the session →
          </Link>
        </div>
      ) : null}

      <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn("aspect-video w-full object-cover", (!camOn && !sharing) || !localStream ? "opacity-0" : "")}
          />
          {!localStream || (!camOn && !sharing) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#162f52] to-[#0a1a30]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 font-serif text-base">
                {initials(selfName)}
              </span>
              <p className="text-[11px] text-paper/60">camera off</p>
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2">
            <p className="truncate text-[11px] font-medium">
              You {sharing ? "· sharing screen" : ""}
              {mode === "viewer" ? " · audience" : ""}
            </p>
            <span className="flex items-center gap-1">
              {!micOn ? <MicOff className="h-3 w-3 text-rose-400" /> : <Mic className="h-3 w-3 text-paper/70" />}
              {handRaised ? <Hand className="h-3 w-3 text-gold" /> : null}
            </span>
          </div>
        </div>

        {peers.map((peer) => (
          <RemoteTile
            key={peer.peerId}
            peer={peer}
            stream={remoteStreams[peer.peerId]}
            isHost={peer.role === "host"}
            selfIsHost={isHost}
            onGrant={() => void hostControl("grant-seat", peer.peerId)}
            onRemove={() => void hostControl("remove", peer.peerId)}
          />
        ))}

        {peers.length === 0 ? (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] text-center">
            <div className="px-4">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" />
              <p className="mt-2 text-[11.5px] text-paper/60">Waiting for others to join…</p>
              <p className="text-[10px] text-paper/40">Share the invite link to bring people in.</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-3">
        <ControlButton active={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"} icon={micOn ? Mic : MicOff} />
        <ControlButton active={camOn} onClick={toggleCam} label={camOn ? "Camera off" : "Camera on"} icon={camOn ? Video : VideoOff} />
        <ControlButton
          active={sharing}
          onClick={() => void toggleShare()}
          label={sharing ? "Stop sharing" : "Share screen"}
          icon={sharing ? MonitorUp : ScreenShare}
        />
        <ControlButton
          active={handRaised}
          onClick={() => setHandRaised((value) => !value)}
          label={handRaised ? "Lower hand" : "Raise hand"}
          icon={Hand}
        />
        {isHost ? (
          <>
            <button
              type="button"
              onClick={() => void hostControl("mute-all")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[10.5px] font-medium text-paper/80 hover:border-gold hover:text-gold"
            >
              <MicOff className="h-3.5 w-3.5" /> Mute all
            </button>
            <button
              type="button"
              onClick={() => void hostControl("lower-hands")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[10.5px] font-medium text-paper/80 hover:border-gold hover:text-gold"
            >
              Lower hands
            </button>
          </>
        ) : null}
        <Link
          href={onLeaveHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-[11px] font-semibold text-white hover:bg-rose-700"
        >
          <PhoneOff className="h-3.5 w-3.5" /> Leave
        </Link>
      </div>

      {mode === "viewer" ? (
        <p className="border-t border-white/10 bg-white/[0.04] px-4 py-2 text-[10.5px] leading-relaxed text-paper/60">
          All {capacity.meshSeats} interactive seats are taken, so you are watching the stage. Ask the host for a seat to
          join with your camera and microphone.
        </p>
      ) : null}
      <p className="border-t border-white/10 px-4 py-2 text-[10px] leading-relaxed text-paper/35">
        Peer-to-peer WebRTC · media never passes through our servers · STUN with optional TURN relay
        {Object.keys(remoteStreams).length > 0 ? ` · ${Object.keys(remoteStreams).length} live connection${Object.keys(remoteStreams).length === 1 ? "" : "s"}` : ""}
      </p>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Mic;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[10.5px] font-semibold transition-colors",
        active ? "bg-paper text-ink hover:bg-white" : "border border-white/20 text-paper/70 hover:border-gold hover:text-gold",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function RemoteTile({
  peer,
  stream,
  isHost,
  selfIsHost,
  onGrant,
  onRemove,
}: {
  peer: Peer;
  stream: MediaStream | undefined;
  isHost: boolean;
  selfIsHost: boolean;
  onGrant: () => void;
  onRemove: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  const hasVideo = Boolean(stream && stream.getVideoTracks().length > 0 && peer.videoEnabled);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <video ref={videoRef} autoPlay playsInline className={cn("aspect-video w-full object-cover", hasVideo ? "" : "opacity-0")} />
      {!hasVideo ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#162f52] to-[#0a1a30]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 font-serif text-base">
            {initials(peer.displayName)}
          </span>
          <p className="text-[10.5px] text-paper/60">{stream ? "camera off" : "connecting…"}</p>
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2">
        <p className="truncate text-[11px] font-medium text-paper">
          {peer.displayName}
          {isHost ? " · host" : peer.mode === "viewer" ? " · audience" : ""}
          {peer.sharingScreen ? " · sharing" : ""}
        </p>
        <span className="flex items-center gap-1">
          {peer.handRaised ? <Hand className="h-3 w-3 text-gold" /> : null}
          {peer.audioEnabled ? <Mic className="h-3 w-3 text-paper/60" /> : <MicOff className="h-3 w-3 text-rose-400" />}
        </span>
      </div>
      {selfIsHost && !isHost ? (
        <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {peer.mode === "viewer" ? (
            <button
              type="button"
              onClick={onGrant}
              className="rounded-full bg-gold px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-ink"
            >
              Give seat
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full bg-rose-600 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
