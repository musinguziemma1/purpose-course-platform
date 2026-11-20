import assert from "node:assert/strict";
import test from "node:test";
import { programmeOutlinePublishError } from "../src/lib/programme-publishing.ts";

test("publishing requires at least one level", () => {
  assert.equal(programmeOutlinePublishError([]), "Add at least one level before publishing this outline.");
});

test("publishing requires each level to have a name and a module", () => {
  assert.equal(
    programmeOutlinePublishError([{ name: "Foundation", modules: [] }]),
    "Add at least one module to every level before publishing.",
  );
  assert.equal(
    programmeOutlinePublishError([{ name: "  ", modules: [{ title: "Module" }] }]),
    "Give every level a name before publishing.",
  );
});

test("publishing rejects untitled modules and accepts a complete outline", () => {
  assert.equal(
    programmeOutlinePublishError([{ name: "Foundation", modules: [{ title: " " }] }]),
    "Give every module a title before publishing.",
  );
  assert.equal(
    programmeOutlinePublishError([{ name: "Foundation", modules: [{ title: "Purpose basics" }] }]),
    null,
  );
});
