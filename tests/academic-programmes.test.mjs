import assert from "node:assert/strict";
import { test } from "node:test";
import { ACADEMIC_PROGRAMMES, academicModuleKey, academicSessionDesign } from "../src/lib/academic-programmes.ts";

test("the academic catalogue contains every PDF programme, level and module", () => {
  const levels = ACADEMIC_PROGRAMMES.flatMap((programme) => programme.levels);
  const modules = levels.flatMap((level) => level.modules);

  assert.equal(ACADEMIC_PROGRAMMES.length, 4);
  assert.equal(levels.length, 12);
  assert.equal(modules.length, 51);
  assert.equal(modules.reduce((total, curriculumModule) => total + curriculumModule.concepts.length, 0), 255);
  assert.deepEqual(ACADEMIC_PROGRAMMES.map((programme) => programme.levels.length), [3, 3, 3, 3]);
});

test("every academic module has a complete professional session design", () => {
  let sessionCount = 0;

  for (const programme of ACADEMIC_PROGRAMMES) {
    for (const level of programme.levels) {
      for (const [moduleIndex, curriculumModule] of level.modules.entries()) {
        const session = academicSessionDesign(curriculumModule, moduleIndex, level.modules.length);
        sessionCount += 1;
        assert.equal(session.durationMinutes, 90);
        assert.ok(session.format.length >= 30);
        assert.ok(session.summary.length >= 300);
        assert.equal(session.focusQuestions.length, 5);
        assert.ok(session.focusQuestions.every((question) => question.length >= 50 && question.endsWith("?")));
      }
    }
  }

  assert.equal(sessionCount, 51);
});

test("curriculum identifiers and teaching concepts are complete and unambiguous", () => {
  const programmeSlugs = new Set();
  const digitalLevelSlugs = new Set();
  const courseSlugs = new Set();
  const moduleKeys = new Set();

  for (const programme of ACADEMIC_PROGRAMMES) {
    assert.ok(!programmeSlugs.has(programme.slug));
    programmeSlugs.add(programme.slug);
    for (const level of programme.levels) {
      assert.ok(!digitalLevelSlugs.has(level.digitalLevelSlug));
      assert.ok(!courseSlugs.has(level.courseSlug));
      digitalLevelSlugs.add(level.digitalLevelSlug);
      courseSlugs.add(level.courseSlug);
      assert.ok(level.introduction.length >= 80);
      assert.ok(level.outcomes.length >= 4);
      const codes = new Set();
      for (const curriculumModule of level.modules) {
        assert.ok(!codes.has(curriculumModule.code));
        codes.add(curriculumModule.code);
        assert.equal(curriculumModule.concepts.length, 5);
        assert.ok(curriculumModule.concepts.every((concept) => concept.length >= 60));
        const key = academicModuleKey(programme.slug, level.slug, curriculumModule.code);
        assert.ok(!moduleKeys.has(key));
        moduleKeys.add(key);
      }
    }
  }
});
