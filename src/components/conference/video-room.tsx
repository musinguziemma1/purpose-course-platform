"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Hand,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Pin,
  PinOff,
  RefreshCw,
  ScreenShare,
  Settings2,
  ShieldCheck,
  Signal,
  UserMinus,
  UserPlus,
  Users,
  Video,
  VideoOff,
  Volume2,
  WifiOff,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { ConferencePeer } from "@/lib/conference-client";
import { useConference, type LinkQuality, type RemoteMedia } from "@/components/conference/use-conference";

type Props = { roomCode: string; selfName: string; isHostRole: boolean; onLeaveHref: string };

export function VideoRoom({ roomCode, selfName, isHostRole, onLeaveHref }: Props) {
  const room = useConference({ roomCode });
  const [panel, setPanel] = useState<"none" | "people" | "settings">("none");
  const [pinned, setPinned] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  if (room.phase === "lobby" || room.phase === "joining") {
    return <Lobby room={room} selfName={selfName} isHostRole={isHostRole} onLeaveHref={onLeaveHref} />;
  }

  if (room.phase === "ended" || room.phase === "removed") {
    return (
      <div className="rounded-2xl border border-navy/15 bg-ink px-6 py-14 text-center text-paper">
        <p className="font-serif text-2xl">{room.phase === "removed" ? "You were removed from this session" : "You have left the room"}</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-paper/65">{room.message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {room.phase === "ended" ? (
            <button type="button" onClick={() => window.location.reload()} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gold px-5 text-[12px] font-semibold text-ink hover:bg-gold-soft">
              <RefreshCw className="h-3.5 w-3.5" /> Rejoin
            </button>
          ) : null}
          <Link href={onLeaveHref} className="inline-flex h-10 items-center rounded-full border border-white/20 px-5 text-[12px] font-semibold text-paper hover:border-gold hover:text-gold">
            Back to the session
          </Link>
        </div>
      </div>
    );
  }

  const isHost = room.self.isHost;
  const everyone: TileModel[] = [
    { id: "self", name: `${selfName} (you)`, isSelf: true, isHost, peer: null },
    ...room.peers.map((peer) => ({ id: peer.peerId, name: peer.displayName, isSelf: false, isHost: peer.role === "host", peer })),
  ];
  const sharer = room.sharing ? "self" : room.peers.find((peer) => peer.sharingScreen)?.peerId ?? null;
  const spotlightId = pinned && everyone.some((tile) => tile.id === pinned) ? pinned : sharer;
  const spotlight = spotlightId ? everyone.find((tile) => tile.id === spotlightId) ?? null : null;
  const others = spotlight ? everyone.filter((tile) => tile.id !== spotlight.id) : everyone;
  const raisedHands = room.peers.filter((peer) => peer.handRaised);

  const renderTile = (tile: TileModel, size: "stage" | "grid" | "strip") => (
    <Tile
      key={tile.id}
      tile={tile}
      size={size}
      room={room}
      pinned={pinned === tile.id}
      onPin={() => setPinned((current) => (current === tile.id ? null : tile.id))}
      onAutoplayBlocked={() => setAutoplayBlocked(true)}
    />
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy/15 bg-ink text-paper">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[10.5px] uppercase tracking-[0.1em]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/85">
            <span className={cn("h-2 w-2 rounded-full", room.phase === "joined" && !room.connectionIssue ? "live-pulse bg-source" : "bg-amber-400")} />
            {room.phase === "rejoining" ? "reconnecting" : room.self.mode === "viewer" ? "audience" : "on stage"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/70">
            <Users className="h-3 w-3" /> {room.peers.length + 1} here
          </span>
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/70 sm:inline-flex" title="Interactive seats in use">
            <Video className="h-3 w-3 text-gold" /> {room.capacity.meshUsed}/{room.capacity.meshSeats} seats
          </span>
          {room.latency !== null ? (
            <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-paper/60 sm:inline-flex" title="Time for the platform to respond">
              <Signal className="h-3 w-3 text-gold" /> {room.latency} ms
            </span>
          ) : null}
          {isHost ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 font-semibold text-ink">
              <ShieldCheck className="h-3 w-3" /> host
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={copyInvite}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[11px] font-medium text-paper/80 hover:border-gold hover:text-gold"
        >
          <Copy className="h-3 w-3" /> {copied ? "Link copied" : "Copy room link"}
        </button>
      </div>

      {room.connectionIssue ? (
        <p role="status" className="flex items-center gap-2 border-b border-white/10 bg-amber-500/15 px-4 py-2 text-[12px] text-amber-100">
          <WifiOff className="h-3.5 w-3.5" /> Trouble reaching the platform. Your call continues while we retry.
        </p>
      ) : null}
      {room.mediaError ? (
        <p role="status" className="border-b border-white/10 bg-amber-500/10 px-4 py-2 text-[12px] text-amber-100">{room.mediaError}</p>
      ) : null}
      {autoplayBlocked ? (
        <button
          type="button"
          onClick={() => {
            document.querySelectorAll<HTMLVideoElement>("video[data-remote]").forEach((element) => void element.play().catch(() => undefined));
            setAutoplayBlocked(false);
          }}
          className="flex w-full items-center justify-center gap-2 border-b border-white/10 bg-gold/20 px-4 py-2 text-[12px] font-semibold text-gold-soft hover:bg-gold/30"
        >
          <Volume2 className="h-4 w-4" /> Your browser paused the audio. Select here to hear everyone.
        </button>
      ) : null}
      {isHost && raisedHands.length ? (
        <p className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-gold/10 px-4 py-2 text-[12px] text-gold-soft">
          <Hand className="h-3.5 w-3.5" /> {raisedHands.map((peer) => peer.displayName).join(", ")} {raisedHands.length === 1 ? "has" : "have"} a hand raised.
          <button type="button" onClick={() => void room.hostAction("lower-hands")} className="font-semibold underline underline-offset-2">Lower all</button>
        </p>
      ) : null}

      <div className="flex">
        {/* Stage */}
        <div className="min-w-0 flex-1 p-2">
          {spotlight ? (
            <div className="space-y-2">
              {renderTile(spotlight, "stage")}
              {others.length ? <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">{others.map((tile) => renderTile(tile, "strip"))}</div> : null}
            </div>
          ) : (
            <div className={cn("grid gap-2", gridColumns(everyone.length))}>
              {everyone.map((tile) => renderTile(tile, "grid"))}
              {room.peers.length === 0 ? (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 text-center">
                  <div>
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" />
                    <p className="mt-2 text-[12px] text-paper/70">Waiting for others to join…</p>
                    <p className="text-[11px] text-paper/45">Share the room link with participants who have access to this session.</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {panel !== "none" ? (
          <aside className="absolute inset-y-0 right-0 z-20 w-full max-w-xs overflow-y-auto border-l border-white/10 bg-[#0d2138] sm:relative sm:w-80">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-paper/80">{panel === "people" ? `People (${room.peers.length + 1})` : "Audio & video"}</p>
              <button type="button" aria-label="Close panel" onClick={() => setPanel("none")} className="rounded-full p-1 text-paper/60 hover:bg-white/10 hover:text-paper">
                <X className="h-4 w-4" />
              </button>
            </div>
            {panel === "people" ? <PeoplePanel room={room} selfName={selfName} /> : <DeviceSettings room={room} />}
          </aside>
        ) : null}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-3">
        <ControlButton
          on={room.micOn && room.hasMicrophone}
          onClick={() => void room.toggleMic()}
          label={room.micOn && room.hasMicrophone ? "Mute" : "Unmute"}
          icon={room.micOn && room.hasMicrophone ? Mic : MicOff}
          danger={!room.micOn || !room.hasMicrophone}
        />
        <ControlButton
          on={room.camOn}
          onClick={() => void room.toggleCam()}
          label={room.camOn ? "Stop video" : "Start video"}
          icon={room.camOn ? Video : VideoOff}
          danger={!room.camOn}
        />
        {room.self.mode !== "viewer" || isHost ? (
          <ControlButton
            on={room.sharing}
            onClick={() => void room.toggleShare()}
            label={room.sharing ? "Stop sharing" : "Share screen"}
            icon={room.sharing ? MonitorUp : ScreenShare}
            className="hidden sm:inline-flex"
          />
        ) : null}
        <ControlButton on={room.handRaised} onClick={room.toggleHand} label={room.handRaised ? "Lower hand" : "Raise hand"} icon={Hand} />
        <ControlButton on={panel === "people"} onClick={() => setPanel((current) => (current === "people" ? "none" : "people"))} label="People" icon={Users} />
        <ControlButton on={panel === "settings"} onClick={() => setPanel((current) => (current === "settings" ? "none" : "settings"))} label="Settings" icon={Settings2} />
        <Link
          href={onLeaveHref}
          onClick={() => room.leave()}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-[12px] font-semibold text-white hover:bg-rose-700"
        >
          <PhoneOff className="h-4 w-4" /> Leave
        </Link>
      </div>

      {room.self.mode === "viewer" ? (
        <p className="border-t border-white/10 bg-white/[0.04] px-4 py-2 text-[11.5px] leading-relaxed text-paper/65">
          All {room.capacity.meshSeats} interactive seats are taken, so you are in the audience and see the host. Raise your hand and the host can give you a seat.
        </p>
      ) : null}

      {/* Toasts */}
      <div aria-live="polite" className="pointer-events-none absolute left-1/2 top-14 z-30 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-1.5 px-3">
        {room.notices.map((notice) => (
          <button
            key={notice.id}
            type="button"
            onClick={() => room.dismissNotice(notice.id)}
            className="pointer-events-auto rounded-full bg-paper/95 px-4 py-1.5 text-[12px] font-medium text-ink shadow-lg"
          >
            {notice.text}
          </button>
        ))}
      </div>
    </div>
  );
}

type Room = ReturnType<typeof useConference>;
type TileModel = { id: string; name: string; isSelf: boolean; isHost: boolean; peer: ConferencePeer | null };

function gridColumns(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 9) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
}

function Lobby({ room, selfName, isHostRole, onLeaveHref }: { room: Room; selfName: string; isHostRole: boolean; onLeaveHref: string }) {
  const presence = room.presence;
  const joining = room.phase === "joining";
  return (
    <div className="overflow-hidden rounded-2xl border border-navy/15 bg-ink text-paper">
      <div className="grid gap-0 lg:grid-cols-[1.35fr_1fr]">
        <div className="p-3">
          <div className="relative overflow-hidden rounded-xl bg-black/60">
            <LocalVideo stream={room.previewStream} mirrored={!room.sharing} className={cn("aspect-video w-full object-cover", room.camOn ? "" : "opacity-0")} />
            {!room.camOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#162f52] to-[#0a1a30]">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 font-serif text-xl">{initials(selfName)}</span>
                <p className="text-[12px] text-paper/60">{room.mediaReady ? "Camera is off" : "Starting your camera…"}</p>
              </div>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
              <ControlButton on={room.micOn && room.hasMicrophone} onClick={() => void room.toggleMic()} label={room.micOn && room.hasMicrophone ? "Mute" : "Unmute"} icon={room.micOn && room.hasMicrophone ? Mic : MicOff} danger={!room.micOn || !room.hasMicrophone} />
              <ControlButton on={room.camOn} onClick={() => void room.toggleCam()} label={room.camOn ? "Stop video" : "Start video"} icon={room.camOn ? Video : VideoOff} danger={!room.camOn} />
            </div>
          </div>
          <MicLevel stream={room.previewStream} active={room.micOn && room.hasMicrophone} />
        </div>
        <div className="flex flex-col justify-center gap-4 border-t border-white/10 p-6 lg:border-l lg:border-t-0">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold">Ready to join?</p>
            <p className="mt-1 font-serif text-2xl leading-tight">{selfName}</p>
            <p className="mt-1.5 text-[12.5px] text-paper/65">
              {presence === null
                ? "Checking who is in the room…"
                : presence.count === 0
                  ? isHostRole ? "No one is here yet. Participants will see you as the host when they arrive." : "No one is here yet. You can wait inside for the host."
                  : `${presence.count} ${presence.count === 1 ? "person is" : "people are"} in the room${presence.hostPresent ? ", including the host" : ""}.`}
            </p>
          </div>
          {room.mediaError ? (
            <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-100">
              {room.mediaError}
              <button type="button" onClick={() => void room.retryMedia()} className="mt-2 flex items-center gap-1.5 font-semibold text-gold-soft underline underline-offset-2">
                <RefreshCw className="h-3 w-3" /> Try camera and microphone again
              </button>
            </div>
          ) : null}
          <DeviceSettings room={room} compact />
          {room.message ? <p role="alert" className="rounded-lg bg-rose-500/15 p-3 text-[12px] text-rose-100">{room.message}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={joining || !room.mediaReady}
              onClick={() => void room.join()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-[13px] font-semibold text-ink transition-colors hover:bg-gold-soft disabled:cursor-wait disabled:opacity-60"
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              {joining ? "Joining…" : "Join now"}
            </button>
            <Link href={onLeaveHref} className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-[12.5px] font-medium text-paper/80 hover:border-gold hover:text-gold">
              Not now
            </Link>
          </div>
          <p className="text-[11px] leading-relaxed text-paper/45">Headphones prevent echo. Your camera and microphone are only shared after you join.</p>
        </div>
      </div>
    </div>
  );
}

function DeviceSettings({ room, compact = false }: { room: Room; compact?: boolean }) {
  const select = "mt-1 h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-[12px] text-paper focus:border-gold focus:outline-none";
  const label = (device: MediaDeviceInfo, index: number, fallback: string) => device.label || `${fallback} ${index + 1}`;
  if (!room.devices.audio.length && !room.devices.video.length) {
    return compact ? null : <p className="p-4 text-[12px] text-paper/60">Allow camera or microphone access to choose devices.</p>;
  }
  return (
    <div className={cn("space-y-3", compact ? "" : "p-4")}>
      {room.devices.video.length ? (
        <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-paper/55">
          Camera
          <select className={select} value={room.selectedVideo} onChange={(event) => void room.selectDevice("video", event.target.value)}>
            {room.devices.video.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId} className="bg-ink">{label(device, index, "Camera")}</option>
            ))}
          </select>
        </label>
      ) : null}
      {room.devices.audio.length ? (
        <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-paper/55">
          Microphone
          <select className={select} value={room.selectedAudio} onChange={(event) => void room.selectDevice("audio", event.target.value)}>
            {room.devices.audio.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId} className="bg-ink">{label(device, index, "Microphone")}</option>
            ))}
          </select>
        </label>
      ) : null}
      {!compact ? <MicLevel stream={room.previewStream} active={room.micOn && room.hasMicrophone} /> : null}
    </div>
  );
}

function PeoplePanel({ room, selfName }: { room: Room; selfName: string }) {
  const isHost = room.self.isHost;
  const seatsFree = room.capacity.meshUsed < room.capacity.meshSeats;
  return (
    <div>
      {isHost ? (
        <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
          <button type="button" onClick={() => void room.hostAction("mute-all")} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[11px] font-medium hover:border-gold hover:text-gold">
            <MicOff className="h-3.5 w-3.5" /> Mute everyone
          </button>
          <button type="button" onClick={() => void room.hostAction("lower-hands")} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[11px] font-medium hover:border-gold hover:text-gold">
            <Hand className="h-3.5 w-3.5" /> Lower hands
          </button>
        </div>
      ) : null}
      <ul className="divide-y divide-white/5">
        <li className="flex items-center gap-2.5 px-4 py-2.5">
          <Avatar name={selfName} speaking={Boolean(room.speaking.self)} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium">{selfName} (you)</p>
            <p className="text-[10.5px] text-paper/50">{isHost ? "Host" : room.self.mode === "viewer" ? "Audience" : "On stage"}</p>
          </div>
          <StatusIcons micOn={room.micOn && room.hasMicrophone} hand={room.handRaised} />
        </li>
        {room.peers.map((peer) => (
          <li key={peer.peerId} className="px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar name={peer.displayName} speaking={Boolean(room.speaking[peer.peerId])} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{peer.displayName}</p>
                <p className="text-[10.5px] text-paper/50">
                  {peer.role === "host" ? "Host" : peer.mode === "viewer" ? "Audience" : "On stage"}
                  {room.quality[peer.peerId]?.relayed ? " · via relay" : ""}
                </p>
              </div>
              <StatusIcons micOn={peer.audioEnabled} hand={peer.handRaised} />
            </div>
            {isHost && peer.role !== "host" ? (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                {peer.audioEnabled ? (
                  <button type="button" onClick={() => void room.hostAction("mute", peer.peerId)} className="inline-flex h-7 items-center gap-1 rounded-full border border-white/15 px-2.5 text-[10.5px] hover:border-gold hover:text-gold">
                    <MicOff className="h-3 w-3" /> Mute
                  </button>
                ) : null}
                {peer.mode === "viewer" ? (
                  <button type="button" disabled={!seatsFree} onClick={() => void room.hostAction("grant-seat", peer.peerId)} className="inline-flex h-7 items-center gap-1 rounded-full bg-gold px-2.5 text-[10.5px] font-semibold text-ink disabled:opacity-40" title={seatsFree ? "Bring onto the stage" : "All seats are taken"}>
                    <UserPlus className="h-3 w-3" /> Give seat
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remove ${peer.displayName} from this session? They will not be able to rejoin until it ends.`)) void room.hostAction("remove", peer.peerId);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-rose-400/40 px-2.5 text-[10.5px] text-rose-200 hover:bg-rose-600 hover:text-white"
                >
                  <UserMinus className="h-3 w-3" /> Remove
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ tile, size, room, pinned, onPin, onAutoplayBlocked }: {
  tile: TileModel; size: "stage" | "grid" | "strip"; room: Room; pinned: boolean; onPin: () => void; onAutoplayBlocked: () => void;
}) {
  const media: RemoteMedia | undefined = tile.isSelf ? undefined : room.remote[tile.id];
  const peer = tile.peer;
  const showVideo = tile.isSelf ? room.camOn || room.sharing : Boolean(media?.hasVideo && peer?.videoEnabled);
  const screen = tile.isSelf ? room.sharing : Boolean(peer?.sharingScreen);
  const speaking = tile.isSelf ? Boolean(room.speaking.self) : Boolean(room.speaking[tile.id]);
  const linkState = tile.isSelf ? "connected" : room.linkStates[tile.id];
  const quality: LinkQuality | undefined = tile.isSelf ? undefined : room.quality[tile.id];
  const micOn = tile.isSelf ? room.micOn && room.hasMicrophone : Boolean(peer?.audioEnabled);
  const hand = tile.isSelf ? room.handRaised : Boolean(peer?.handRaised);
  const status = tile.isSelf ? null
    : !media ? (peer?.mode === "viewer" && room.self.mode === "viewer" ? "In the audience" : "Connecting…")
    : linkState === "disconnected" || linkState === "failed" ? "Reconnecting…" : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-black/60 transition-shadow",
        speaking ? "border-gold shadow-[0_0_0_2px_var(--color-gold)]" : "border-white/10",
        size === "strip" ? "w-44 shrink-0 sm:w-52" : "",
      )}
    >
      {tile.isSelf ? (
        <LocalVideo stream={room.previewStream} mirrored={!room.sharing} className={cn("aspect-video w-full", screen ? "object-contain" : "object-cover", showVideo ? "" : "opacity-0")} />
      ) : (
        <RemoteVideo stream={media?.stream} className={cn("aspect-video w-full", screen ? "object-contain" : "object-cover", showVideo ? "" : "opacity-0")} onAutoplayBlocked={onAutoplayBlocked} />
      )}
      {!showVideo ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#162f52] to-[#0a1a30]">
          <span className={cn("flex items-center justify-center rounded-full bg-white/10 font-serif", size === "strip" ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg")}>{initials(tile.name)}</span>
          <p className="text-[11px] text-paper/60">{status ?? "Camera off"}</p>
        </div>
      ) : status ? (
        <p className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] text-amber-100">{status}</p>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-2.5 py-2">
        <p className="min-w-0 truncate text-[11.5px] font-medium">
          {tile.name}
          {tile.isHost ? " · host" : peer?.mode === "viewer" ? " · audience" : ""}
          {screen ? " · presenting" : ""}
        </p>
        <span className="flex shrink-0 items-center gap-1.5">
          {quality && quality.level !== "unknown" ? (
            <span title={`${quality.rttMs ?? "?"} ms round trip${quality.relayed ? " via relay" : ""}`} className={cn("h-1.5 w-1.5 rounded-full", quality.level === "good" ? "bg-emerald-400" : quality.level === "fair" ? "bg-amber-300" : "bg-rose-400")} />
          ) : null}
          {hand ? <Hand className="h-3.5 w-3.5 text-gold" aria-label="Hand raised" /> : null}
          {micOn ? <Mic className="h-3.5 w-3.5 text-paper/70" aria-label="Microphone on" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" aria-label="Muted" />}
        </span>
      </div>
      <button
        type="button"
        onClick={onPin}
        aria-label={pinned ? `Unpin ${tile.name}` : `Pin ${tile.name}`}
        className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1.5 text-paper/80 opacity-0 transition-opacity hover:text-gold focus:opacity-100 group-hover:opacity-100"
      >
        {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function LocalVideo({ stream, mirrored, className }: { stream: MediaStream | null; mirrored: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className={cn(className, mirrored ? "-scale-x-100" : "")} />;
}

function RemoteVideo({ stream, className, onAutoplayBlocked }: { stream: MediaStream | undefined; className?: string; onAutoplayBlocked: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (element.srcObject !== (stream ?? null)) element.srcObject = stream ?? null;
    if (stream) {
      element.play().catch((error: unknown) => {
        if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "NotAllowedError") onAutoplayBlocked();
      });
    }
  }, [stream, onAutoplayBlocked]);
  return <video ref={ref} data-remote autoPlay playsInline className={className} />;
}

function MicLevel({ stream, active }: { stream: MediaStream | null; active: boolean }) {
  const bar = useRef<HTMLSpanElement>(null);
  const track = stream?.getAudioTracks()[0];
  const trackId = track?.id;
  useEffect(() => {
    if (!track || !active) {
      if (bar.current) bar.current.style.width = "0%";
      return;
    }
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / samples.length) * 4);
      if (bar.current) bar.current.style.width = `${Math.round(level * 100)}%`;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void context.close().catch(() => undefined);
    };
    // The track id identifies the device; the track object itself is stable for that id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, active]);
  return (
    <div className="mt-2 flex items-center gap-2 px-1" aria-hidden>
      <Mic className="h-3.5 w-3.5 text-paper/50" />
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <span ref={bar} className="block h-full w-0 rounded-full bg-gold transition-[width] duration-75" />
      </span>
    </div>
  );
}

function Avatar({ name, speaking }: { name: string; speaking: boolean }) {
  return (
    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-serif text-[11px]", speaking ? "ring-2 ring-gold" : "")}>
      {initials(name)}
    </span>
  );
}

function StatusIcons({ micOn, hand }: { micOn: boolean; hand: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {hand ? <Hand className="h-3.5 w-3.5 text-gold" aria-label="Hand raised" /> : null}
      {micOn ? <Mic className="h-3.5 w-3.5 text-paper/60" aria-label="Microphone on" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" aria-label="Muted" />}
    </span>
  );
}

function ControlButton({ on, onClick, label, icon: Icon, danger = false, className }: {
  on: boolean; onClick: () => void; label: string; icon: typeof Mic; danger?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={label}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-semibold transition-colors",
        danger ? "bg-rose-600/90 text-white hover:bg-rose-600" : on ? "bg-paper text-ink hover:bg-white" : "border border-white/20 text-paper/80 hover:border-gold hover:text-gold",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
