import assert from "node:assert/strict";
import test from "node:test";
import { PROGRAMME_CATALOGUE } from "../src/lib/programme-catalogue.ts";

test("programme catalogue preserves all four distinct outline structures", () => {
  assert.deepEqual(
    PROGRAMME_CATALOGUE.map((programme) => programme.slug),
    ["purpose-program-adults", "purpose-program-students", "youlead", "purpose-to-peace"],
  );
  assert.deepEqual(
    PROGRAMME_CATALOGUE.map((programme) => programme.levels.map((level) => level.modules.length)),
    [[5, 5, 5], [5, 5, 5], [4, 4, 4], [3, 3, 3]],
  );

  const levelSlugs = PROGRAMME_CATALOGUE.flatMap((programme) =>
    programme.levels.map((level) => `${programme.slug}/${level.slug}`),
  );
  assert.equal(new Set(levelSlugs).size, 12);
});
