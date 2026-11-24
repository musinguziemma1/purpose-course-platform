import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { conferenceConfiguration, participantIceServers, relayCredentials } from "../src/lib/conference-config.ts";

test("production native calls require a complete authenticated TURN configuration", () => {
  assert.equal(conferenceConfiguration({ NODE_ENV: "production" }).enabled, false);
  assert.equal(conferenceConfiguration({ NODE_ENV: "development" }).enabled, true);
  const env = { NODE_ENV: "production", TURN_URL: "turn:relay.example:3478?transport=udp,turns:relay.example:5349?transport=tcp", TURN_USERNAME: "fixture", TURN_CREDENTIAL: "fixture-secret" };
  assert.equal(conferenceConfiguration(env).enabled, true);
  assert.equal(conferenceConfiguration(env).relay.urls.length, 2);
  for (const changes of [{ TURN_USERNAME: "" }, { TURN_CREDENTIAL: "" }, { TURN_URL: "https://relay.example" }, { TURN_URL: "turn:relay.example:70000" }, { CONFERENCE_ENABLED: "false" }]) {
    assert.equal(conferenceConfiguration({ ...env, ...changes }).enabled, false);
  }
});

test("a shared TURN secret issues short-lived per-participant credentials and is never sent to browsers", () => {
  const secret = "s".repeat(48);
  const env = { NODE_ENV: "production", TURN_URL: "turn:relay.example:3478?transport=udp", TURN_SECRET: secret };
  const config = conferenceConfiguration(env);
  assert.equal(config.enabled, true);
  assert.equal(config.relay.mode, "ephemeral");
  const now = Date.UTC(2026, 10, 24, 12);
  const server = relayCredentials(config.relay, "c2b1f0b8-1d6a-4a5e-9f43-6e3a9c1d2b7f", now, 3600);
  assert.equal(server.username, `${Math.floor(now / 1000) + 3600}:c2b1f0b8-1d6a-4a5e-9f43-6e3a9c1d2b7f`);
  assert.equal(server.credential, createHmac("sha1", secret).update(server.username).digest("base64"));
  const browser = participantIceServers("profile-1", env);
  assert.equal(JSON.stringify(browser).includes(secret), false);
  assert.equal(conferenceConfiguration({ ...env, TURN_SECRET: "too-short" }).enabled, false, "A weak secret fails closed.");
  assert.equal(conferenceConfiguration({ ...env, TURN_SECRET: "too-short", TURN_USERNAME: "u", TURN_CREDENTIAL: "p" }).enabled, false, "A weak secret is not silently ignored.");
});

test("optional STUN servers are validated and offered before the relay", () => {
  const env = { NODE_ENV: "development", STUN_URLS: "stun:stun.example.org:3478, stun:stun2.example.org" };
  assert.deepEqual(participantIceServers("profile-1", env), [{ urls: ["stun:stun.example.org:3478", "stun:stun2.example.org"] }]);
  assert.deepEqual(participantIceServers("profile-1", { NODE_ENV: "development", STUN_URLS: "https://not-stun.example" }), []);
});
