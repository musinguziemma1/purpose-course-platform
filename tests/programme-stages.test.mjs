import assert from "node:assert/strict";
import test from "node:test";
import {
  getProgrammeLevelPresentation,
  groupProgrammeOutlinesByStage,
} from "../src/lib/programme-stages.ts";

test("maps programme levels to the shared stages while preserving programme-specific focus", () => {
  assert.deepEqual(getProgrammeLevelPresentation("Foundation – Understanding Purpose", 0), {
    stage: "Foundation",
    focus: "Understanding Purpose",
  });
  assert.deepEqual(getProgrammeLevelPresentation("Level 2 – Actions Index", 1), {
    stage: "Intermediate",
    focus: "Actions Index",
  });
  assert.deepEqual(
    getProgrammeLevelPresentation("Relational Peace Leadership – Leading Relationships", 1),
    { stage: "Intermediate", focus: "Relational Peace Leadership – Leading Relationships" },
  );
  assert.deepEqual(
    ["Personal Peace Leadership – Leading Self", "Relational Peace Leadership – Leading Relationships", "Community Peace Leadership – Leading Communities"]
      .map((name, index) => getProgrammeLevelPresentation(name, index).stage),
    ["Foundation", "Intermediate", "Advanced"],
  );
});

test("groups every programme's corresponding level under the shared stage", () => {
  const groups = groupProgrammeOutlinesByStage([
    {
      id: 1,
      slug: "adults",
      name: "Purpose Program for Adults",
      levels: [
        { id: 1, name: "Foundation – Understanding Purpose", modules: [] },
        { id: 2, name: "Intermediate – Purpose Discovery and Clarity", modules: [] },
        { id: 3, name: "Advanced – Influence and Impact", modules: [] },
      ],
    },
    {
      id: 2,
      slug: "youlead",
      name: "YouLead!",
      levels: [
        { id: 4, name: "Level 1 – Values Index", modules: [] },
        { id: 5, name: "Level 2 – Actions Index", modules: [] },
        { id: 6, name: "Level 3 – Leadership Index", modules: [] },
      ],
    },
  ]);

  assert.deepEqual(groups.map((group) => group.stage), ["Foundation", "Intermediate", "Advanced"]);
  assert.deepEqual(groups[0].items.map((item) => item.focus), ["Understanding Purpose", "Values Index"]);
  assert.deepEqual(groups[1].items.map((item) => item.focus), ["Purpose Discovery and Clarity", "Actions Index"]);
});
