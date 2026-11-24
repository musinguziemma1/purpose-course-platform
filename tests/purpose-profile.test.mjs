import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

let client, journey, appPool, courseId, levelId;
const users = [], actors = {}, key = randomUUID();
const lessonIds = [];

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Purpose Profile fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  journey = await import("../src/db/purpose-journey.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  for (const [name, role] of [["student", "student"], ["mentor", "mentor"], ["stranger", "mentor"]]) {
    const email = `${key}-${name}@example.invalid`;
    const userId = (await client.query("insert into users(email,password_hash) values($1,'unused-test-hash') returning id", [email])).rows[0].id;
    users.push(userId);
    const role_ = (await client.query("select permissions from roles where slug=$1", [role])).rows[0];
    const profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id", [userId, name, `${key}-${name}`, role])).rows[0].id;
    actors[name] = { profileId, userId, email, fullName: name, roleSlug: role, permissions: role_.permissions };
  }
  levelId = (await client.query("select id from course_levels order by id limit 1")).rows[0].id;
  courseId = (await client.query("insert into courses(level_id,slug,title,status) values($1,$2,'Journey fixture','published') returning id", [levelId, key])).rows[0].id;
  const moduleId = (await client.query("insert into course_modules(course_id,slug,title,sort_order) values($1,$2,'Untitled fixture module',1) returning id", [courseId, `${key}-m`])).rows[0].id;
  await client.query("insert into module_principles(module_id,principle) values($1,'identity')", [moduleId]);
  for (const index of [1, 2]) lessonIds.push((await client.query("insert into lessons(module_id,slug,title,sort_order,status) values($1,$2,$3,$4,'published') returning id", [moduleId, `${key}-l${index}`, `Lesson ${index}`, index])).rows[0].id);
  await client.query("insert into enrollments(profile_id,email,full_name,level_id,status) values($1,$2,'Fixture',$3,'enrolled')", [actors.student.profileId, actors.student.email, levelId]);
  await client.query("insert into lesson_progress(profile_id,lesson_id,status,completed_at) values($1,$2,'completed',now())", [actors.student.profileId, lessonIds[0]]);
  await client.query("insert into mentor_assignments(mentor_id,student_id,status) values($1,$2,'active')", [actors.mentor.profileId, actors.student.profileId]);
});

const form = (overrides = {}) => ({
  version: "0", identityStatement: "I am a teacher who brings calm and clarity to young people.", coreValues: "integrity, service\nCourage, integrity",
  strengths: "teaching\nlistening\nwriting", interests: "", story: "", influences: "", purposeStatement: "To help young leaders discover and live their purpose.",
  contribution: "", skills: "", developmentAreas: "", developmentObjectives: "", vision: "", careerDirection: "", impactAspirations: "", ...overrides,
});

test("saving a Purpose Profile versions it, normalises lists and rejects stale edits", async () => {
  const first = await journey.savePurposeProfile(form(), actors.student);
  assert.deepEqual([first.ok, first.version], [true, 1]);
  const saved = await journey.getOwnPurposeProfile(actors.student);
  assert.deepEqual(saved.coreValues, ["integrity", "service", "Courage"], "Duplicates are removed case-insensitively.");
  assert.equal(saved.sharedWithMentor, false, "Profiles are private by default.");
  assert.match((await journey.savePurposeProfile(form({ version: "0" }), actors.student)).error, /another window/);
  assert.match((await journey.savePurposeProfile(form({ version: "1", purposeStatement: "x".repeat(601) }), actors.student)).error, /600/);
  assert.match((await journey.savePurposeProfile(form({ version: "1", skills: Array.from({ length: 13 }, (_, index) => `skill ${index}`).join("\n") }), actors.student)).error, /12 skills/);
  assert.match((await journey.savePurposeProfile(form({ version: "1" }), { ...actors.student, isDemo: true })).error, /Sign in/);
  const second = await journey.savePurposeProfile(form({ version: "1", purposeStatement: "To equip young leaders to serve their communities." }), actors.student);
  assert.equal(second.version, 2);
  const history = await journey.getPurposeProfileHistory(actors.student.profileId, actors.student);
  assert.deepEqual(history.map((entry) => entry.version), [2, 1]);
  assert.equal(history[1].purposeStatement, "To help young leaders discover and live their purpose.", "Earlier versions are preserved.");
});

test("mentors see the written profile only when the learner shares it", async () => {
  assert.equal((await journey.getSharedPurposeProfile(actors.student.profileId, actors.mentor)).reason, "not-shared");
  assert.equal((await journey.getPurposeProfileHistory(actors.student.profileId, actors.mentor)).length, 0);
  await journey.savePurposeProfile(form({ version: "2", sharedWithMentor: "on" }), actors.student);
  const shared = await journey.getSharedPurposeProfile(actors.student.profileId, actors.mentor);
  assert.equal(shared.profile.identityStatement, "I am a teacher who brings calm and clarity to young people.");
  assert.equal((await journey.getSharedPurposeProfile(actors.student.profileId, actors.stranger)).reason, "forbidden", "Unassigned mentors never see it.");
  assert.equal(await journey.getPurposeJourney(actors.student.profileId, actors.stranger), null);
});

test("the journey reflects real lesson progress, profile evidence and recommendations", async () => {
  const result = await journey.getPurposeJourney(actors.student.profileId, actors.mentor);
  const identity = result.principles.find((principle) => principle.key === "identity");
  const fixture = identity.learning.modules.find((module) => module.title === "Untitled fixture module");
  assert.ok(fixture, "Explicit module tags win over title inference (the title matches no principle).");
  assert.deepEqual([fixture.completedCount, fixture.lessonCount], [1, 2]);
  assert.equal(identity.evidence.learn, identity.learning.done / identity.learning.total);
  assert.ok(identity.learning.total >= 2, "Other identity modules in the learner's level also count.");
  assert.ok(identity.checks.find((check) => /identity statement/.test(check.label)).done);
  assert.ok(identity.score > 0 && identity.score < 100);
  const source = result.principles.find((principle) => principle.key === "source");
  assert.equal(source.evidence.assess, null, "Source has no assessment, so it is excluded rather than scored zero.");
  assert.equal(result.overall, Math.round(result.principles.reduce((sum, principle) => sum + principle.score, 0) / 5));
  assert.ok(result.recommendations.length > 0 && result.recommendations.length <= 4);
  assert.ok(result.recommendations.some((item) => item.href === "/learn/goals"), "A learner without goals is guided to set one.");
  await client.query("update lesson_progress set status='completed', completed_at=now() where profile_id=$1", [actors.student.profileId]);
  await client.query("insert into lesson_progress(profile_id,lesson_id,status,completed_at) values($1,$2,'completed',now())", [actors.student.profileId, lessonIds[1]]);
  const updated = await journey.getPurposeJourney(actors.student.profileId, actors.student);
  const finished = updated.principles.find((principle) => principle.key === "identity").learning.modules.find((module) => module.title === "Untitled fixture module");
  assert.deepEqual([finished.completedCount, finished.lessonCount], [2, 2]);
});

after(async () => {
  if (client) {
    if (users.length) {
      await client.query("delete from enrollments where profile_id in (select id from profiles where user_id=any($1::uuid[]))", [users]);
      await client.query("delete from users where id=any($1::uuid[])", [users]);
    }
    if (courseId) await client.query("delete from courses where id=$1", [courseId]);
    await client.end();
  }
  if (appPool) await appPool.end();
});
