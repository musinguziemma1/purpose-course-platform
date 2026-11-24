/** Browser-safe conference rules shared by the room UI and its tests. No Node or DOM imports. */

export type ConferencePeer = {
  peerId: string;
  displayName: string;
  role: string;
  mode: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  sharingScreen: boolean;
  handRaised: boolean;
};

export type SignalEnvelope = { id: number; fromPeer: string; kind: string; payload: Record<string, unknown> };
export type SelfState = { peerId: string; mode: string; isHost: boolean };

/**
 * Which pairs hold a peer connection. Interactive ("mesh") participants connect
 * to each other; audience members connect only to the host.
 */
export function connectionWanted(self: SelfState, peer: ConferencePeer, hostPeerId: string | null) {
  if (self.mode === "viewer") return peer.peerId === hostPeerId;
  if (peer.mode === "viewer") return self.isHost;
  return true;
}

/**
 * Exactly one side of each pair creates the first offer, so offers do not
 * collide in normal operation: audience members call the host, otherwise the
 * lexically smaller peer id calls.
 */
export function shouldInitiate(self: SelfState, peer: ConferencePeer, hostPeerId: string | null) {
  if (!connectionWanted(self, peer, hostPeerId)) return false;
  if (self.mode === "viewer") return true;
  if (peer.mode === "viewer") return false;
  return self.peerId < peer.peerId;
}

/** Applies signals in the order the server stored them (offer before its candidates). */
export function orderSignals(signals: SignalEnvelope[]) {
  return [...signals].sort((first, second) => first.id - second.id);
}

/** A mesh uploads one copy per participant, so each copy gets less bandwidth as the room grows. */
export function videoBitrateFor(remoteCount: number, sharingScreen: boolean) {
  if (sharingScreen) return remoteCount <= 2 ? 2_500_000 : remoteCount <= 5 ? 1_500_000 : 1_000_000;
  if (remoteCount <= 1) return 1_500_000;
  if (remoteCount <= 3) return 900_000;
  if (remoteCount <= 5) return 600_000;
  return 400_000;
}

export const POLL_FAST_MS = 700;
export const POLL_STEADY_MS = 2500;
export const POLL_HIDDEN_MS = 4000;

/** Poll quickly while connections are negotiating, then settle to a steady heartbeat. */
export function nextPollDelay(input: { signalsReceived: number; negotiating: boolean; hidden: boolean; failures: number }) {
  if (input.failures > 0) return Math.min(10_000, POLL_STEADY_MS * 2 ** Math.min(input.failures - 1, 2));
  if (input.signalsReceived > 0 || input.negotiating) return POLL_FAST_MS;
  return input.hidden ? POLL_HIDDEN_MS : POLL_STEADY_MS;
}

/** Plain-language guidance for getUserMedia/getDisplayMedia failures. */
export function describeMediaError(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera and microphone access is blocked. Allow access from the padlock in your browser's address bar, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera or microphone was found. You can still join to watch and listen.";
    case "NotReadableError":
    case "AbortError":
      return "Your camera or microphone is in use by another app. Close that app, then try again.";
    default:
      return "Your camera and microphone could not be started. You can still join to watch and listen.";
  }
}

/** Keeps only ICE candidate fields the browser needs from an untrusted signal payload. */
export function candidatesFrom(payload: Record<string, unknown>): RTCIceCandidateInit[] {
  const raw = Array.isArray(payload.candidates) ? payload.candidates : payload.candidate ? [payload.candidate] : [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    if (typeof value.candidate !== "string" || value.candidate.length > 2048) return [];
    return [{
      candidate: value.candidate,
      sdpMid: typeof value.sdpMid === "string" ? value.sdpMid : null,
      sdpMLineIndex: typeof value.sdpMLineIndex === "number" ? value.sdpMLineIndex : null,
      usernameFragment: typeof value.usernameFragment === "string" ? value.usernameFragment : null,
    }];
  });
}

/** Extracts an SDP description from an untrusted signal payload. */
export function descriptionFrom(payload: Record<string, unknown>): RTCSessionDescriptionInit | null {
  const type = payload.type, sdp = payload.sdp;
  if ((type !== "offer" && type !== "answer") || typeof sdp !== "string" || sdp.length > 30_000) return null;
  return { type, sdp };
}
