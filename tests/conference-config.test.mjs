import assert from "node:assert/strict";
import { test } from "node:test";
import { conferenceConfiguration } from "../src/lib/conference-config.ts";

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
