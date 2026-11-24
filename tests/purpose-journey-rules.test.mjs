import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_PURPOSE_PROFILE, inferPrinciple, journeyStages, principleScore, profileChecks } from "../src/lib/purpose-journey.ts";

test("module titles from the live curriculum map to the principle they develop", () => {
  const expected = {
    "PURP 101 – Understanding Purpose": "purpose",
    "PURP 102 – Becoming a Person of Value": "identity",
    "PURP 104 – Purpose and Predestination": "source",
    "PURP 202 – Understanding and Liberating Your Potential": "potential",
    "PURP 203 – How Will You Be Remembered?": "destiny",
    "PURP 205 – Walking in Dominion: Defining Your Transformation Story": "source",
    "PURP 301 – Vision Building (Part 1): Understanding Vision": "destiny",
    "STU 202 – Stewardship of Gifts and Potential": "potential",
    "YL 102 – Relationships, Character, Forgiveness and Self-worth": "identity",
    "YL 202 – Friends, Experiences, Growth and Pain Influence My Actions": "source",
    "P2P 101 – Knowing Myself: Identity, Self-awareness and Peace": "identity",
    "P2P 204 – Community Mobilisation and Peace Advocacy": "destiny",
  };
  for (const [title, principle] of Object.entries(expected)) assert.equal(inferPrinciple(title), principle, title);
  assert.equal(inferPrinciple("P2P 105 – Understanding Peace and Conflict"), null, "Unmatched modules are left for staff to tag.");
  assert.equal(inferPrinciple(""), null);
});

test("principle scores weight evidence and leave out what does not apply", () => {
  assert.equal(principleScore({ learn: 1, profile: 1, assess: 1, reflect: 1 }), 100);
  assert.equal(principleScore({ learn: 0, profile: 0, assess: 0, reflect: 0 }), 0);
  assert.equal(principleScore({ learn: 0.5, profile: 0, assess: 0, reflect: 0 }), 20, "Learning carries 40% of the weight.");
  // No assessment exists for Source: the remaining weights are renormalised instead of scoring zero.
  assert.equal(principleScore({ learn: 1, profile: 1, assess: null, reflect: 1 }), 100);
  assert.equal(principleScore({ learn: null, profile: null, assess: null, reflect: null }), 0);
  assert.equal(principleScore({ learn: 2, profile: -1, assess: null, reflect: null }), 62, "Inputs are clamped to 0..1.");
});

test("profile checks and journey stages describe concrete next steps", () => {
  const empty = profileChecks(EMPTY_PURPOSE_PROFILE);
  assert.ok(Object.values(empty).flat().every((check) => !check.done));
  const profile = { ...EMPTY_PURPOSE_PROFILE, coreValues: ["integrity", "service", " "], strengths: ["teaching", "listening", "writing"], vision: "x".repeat(45) };
  const checks = profileChecks(profile);
  assert.equal(checks.identity.find((check) => /core values/.test(check.label)).done, false, "Blank list items do not count.");
  assert.equal(checks.identity.find((check) => /strengths/.test(check.label)).done, true);
  const stages = journeyStages(profile, [{ status: "active", progress: 30 }]);
  assert.deepEqual(stages.map((stage) => [stage.key, stage.done]), [["vision", true], ["goals", true], ["action", true], ["impact", false]]);
  assert.equal(journeyStages(profile, [{ status: "cancelled", progress: 100 }]).find((stage) => stage.key === "goals").done, false);
});
