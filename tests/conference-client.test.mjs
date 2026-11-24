import assert from "node:assert/strict";
import { test } from "node:test";
import { candidatesFrom, connectionWanted, describeMediaError, descriptionFrom, nextPollDelay, orderSignals, shouldInitiate, videoBitrateFor } from "../src/lib/conference-client.ts";

const peer = (peerId, mode = "mesh", role = "student") => ({ peerId, displayName: peerId, role, mode, audioEnabled: true, videoEnabled: true, sharingScreen: false, handRaised: false });

test("exactly one side of every wanted pair makes the first offer", () => {
  const host = peer("h", "mesh", "host");
  const people = [host, peer("a"), peer("m"), peer("z"), peer("v1", "viewer"), peer("v2", "viewer")];
  for (const left of people) {
    for (const right of people) {
      if (left === right) continue;
      const self = (p) => ({ peerId: p.peerId, mode: p.mode, isHost: p.role === "host" });
      const leftWants = connectionWanted(self(left), right, host.peerId), rightWants = connectionWanted(self(right), left, host.peerId);
      assert.equal(leftWants, rightWants, `${left.peerId}/${right.peerId} must agree on whether to connect`);
      const callers = [shouldInitiate(self(left), right, host.peerId), shouldInitiate(self(right), left, host.peerId)].filter(Boolean).length;
      assert.equal(callers, leftWants ? 1 : 0, `${left.peerId}/${right.peerId} needs exactly one caller`);
    }
  }
});

test("audience members only connect to the host and the host answers them", () => {
  const viewer = { peerId: "a", mode: "viewer", isHost: false };
  assert.equal(shouldInitiate(viewer, peer("z", "mesh", "host"), "z"), true);
  assert.equal(connectionWanted(viewer, peer("b"), "z"), false);
  assert.equal(shouldInitiate({ peerId: "z", mode: "mesh", isHost: true }, peer("a", "viewer"), "z"), false);
  assert.equal(connectionWanted({ peerId: "m", mode: "mesh", isHost: false }, peer("a", "viewer"), "z"), false);
});

test("signals are applied in stored order, whatever order the database returned them", () => {
  const ordered = orderSignals([{ id: 9, kind: "ice" }, { id: 3, kind: "offer" }, { id: 12, kind: "ice" }]);
  assert.deepEqual(ordered.map((signal) => signal.id), [3, 9, 12]);
});

test("untrusted signal payloads are reduced to valid SDP and candidates", () => {
  assert.equal(descriptionFrom({ type: "rollback", sdp: "x" }), null);
  assert.equal(descriptionFrom({ type: "offer", sdp: 42 }), null);
  assert.deepEqual(descriptionFrom({ type: "answer", sdp: "v=0", extra: true }), { type: "answer", sdp: "v=0" });
  assert.deepEqual(candidatesFrom({ candidates: [{ candidate: "candidate:1 1 udp 1 1.2.3.4 5 typ host", sdpMid: "0", sdpMLineIndex: 0 }, { candidate: 7 }, null] }), [
    { candidate: "candidate:1 1 udp 1 1.2.3.4 5 typ host", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: null },
  ]);
  assert.equal(candidatesFrom({ candidate: { candidate: "c" } }).length, 1, "Single legacy candidates are still accepted.");
});

test("bitrate shrinks as the mesh grows and polling slows once stable", () => {
  assert.ok(videoBitrateFor(1, false) > videoBitrateFor(3, false));
  assert.ok(videoBitrateFor(3, false) > videoBitrateFor(7, false));
  assert.ok(videoBitrateFor(3, true) > videoBitrateFor(3, false), "Screen text needs more bits than a face.");
  assert.equal(nextPollDelay({ signalsReceived: 2, negotiating: false, hidden: false, failures: 0 }), 700);
  assert.equal(nextPollDelay({ signalsReceived: 0, negotiating: false, hidden: false, failures: 0 }), 2500);
  assert.ok(nextPollDelay({ signalsReceived: 0, negotiating: false, hidden: false, failures: 3 }) > 2500, "Failures back off.");
});

test("media errors become actionable guidance", () => {
  assert.match(describeMediaError({ name: "NotAllowedError" }), /blocked/);
  assert.match(describeMediaError({ name: "NotReadableError" }), /another app/);
  assert.match(describeMediaError(new Error("x")), /still join/);
});
