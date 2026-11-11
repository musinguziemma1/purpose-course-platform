import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, inArray } from "drizzle-orm";

let client, database, policy, schema, appPool;
const fixture = {};
const resultIds = [];

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Privacy fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  schema = await import("../src/db/schema.ts");
  policy = await import("../src/db/learner-access.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  await client.query("begin");
  database = drizzle(client);
  const key = randomUUID();
  for (const [name, role] of [["mentor", "mentor"], ["otherMentor", "mentor"], ["learner", "student"], ["otherLearner", "student"]]) {
    const id = (await client.query("insert into users(email,password_hash) values($1,'unused-test-hash') returning id", [`${key}-${name}@example.invalid`])).rows[0].id;
    const profile = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id", [id, name, `${key}-${name}`, role])).rows[0];
    fixture[name] = { profileId: profile.id, roleSlug: role, permissions: [] };
  }
  await client.query("insert into mentor_assignments(mentor_id,student_id,status) values($1,$2,'active'),($3,$4,'active'),($1,$4,'closed')", [fixture.mentor.profileId, fixture.learner.profileId, fixture.otherMentor.profileId, fixture.otherLearner.profileId]);
  const instrument = (await client.query("select id,version from instruments order by id limit 1")).rows[0];
  assert.ok(instrument, "Local seed must include an instrument.");
  for (const [name, owner, shared, consent] of [
    ["shared", fixture.learner, true, true], ["private", fixture.learner, false, true],
    ["noConsent", fixture.learner, true, false], ["unassigned", fixture.otherLearner, true, true],
  ]) {
    const session = (await client.query("insert into instrument_sessions(instrument_id,profile_id,instrument_version,consent_given,shared_with_mentor,status) values($1,$2,$3,$4,$5,'completed') returning id", [instrument.id, owner.profileId, instrument.version, consent, shared])).rows[0];
    const result = (await client.query("insert into instrument_results(session_id,instrument_id,profile_id,overall_score,band_label,summary) values($1,$2,$3,50,'Fixture','Privacy fixture') returning id", [session.id, instrument.id, owner.profileId])).rows[0];
    fixture[name] = result.id;
    resultIds.push(result.id);
  }
  fixture.goal = (await client.query("insert into learner_goals(student_id,title) values($1,'Private goal fixture') returning id", [fixture.otherLearner.profileId])).rows[0].id;
  fixture.group = (await client.query("insert into course_groups(name,mentor_id) values('Privacy group',$1) returning id", [fixture.mentor.profileId])).rows[0].id;
  await client.query("insert into group_members(group_id,profile_id) values($1,$2),($1,$3)", [fixture.group, fixture.learner.profileId, fixture.otherLearner.profileId]);
});

async function resultsFor(viewer) {
  return (await database.select({ id: schema.instrumentResults.id }).from(schema.instrumentResults).where(and(inArray(schema.instrumentResults.id, resultIds), policy.instrumentReadable(viewer)))).map((row) => row.id).sort((a, b) => a - b);
}

test("mentors see only actively assigned learners' shared, consented instrument results", async () => {
  assert.deepEqual(await resultsFor(fixture.mentor), [fixture.shared]);
  assert.deepEqual(await resultsFor(fixture.otherMentor), [fixture.unassigned]);
  assert.deepEqual(await resultsFor(null), []);
});

test("learners retain their own results but cannot read another learner's results", async () => {
  assert.deepEqual(await resultsFor(fixture.learner), [fixture.shared, fixture.private, fixture.noConsent].sort((a, b) => a - b));
});

test("administrative oversight respects a learner's private result choice", async () => {
  const administrator = { ...fixture.mentor, roleSlug: "super_admin" };
  assert.deepEqual(await resultsFor(administrator), [fixture.shared, fixture.unassigned].sort((a, b) => a - b));
});

test("a forged goal identifier cannot update an unassigned learner", async () => {
  const changed = await database.update(schema.learnerGoals).set({ progress: 100 }).where(and(eq(schema.learnerGoals.id, fixture.goal), policy.learnerReadable(schema.learnerGoals.studentId, fixture.mentor))).returning();
  assert.equal(changed.length, 0);
  const row = (await client.query("select progress from learner_goals where id=$1", [fixture.goal])).rows[0];
  assert.equal(row.progress, 0);
});

test("group review requires ownership and authorization for every member", async () => {
  const readable = () => database.select({ id: schema.courseGroups.id }).from(schema.courseGroups).where(and(eq(schema.courseGroups.id, fixture.group), policy.groupReviewable(fixture.mentor)));
  assert.equal((await readable()).length, 0);
  await client.query("delete from group_members where group_id=$1 and profile_id=$2", [fixture.group, fixture.otherLearner.profileId]);
  assert.equal((await readable()).length, 1);
});

test("revoking an assignment immediately removes access to previously shared results", async () => {
  await client.query("update mentor_assignments set status='closed' where mentor_id=$1 and student_id=$2", [fixture.mentor.profileId, fixture.learner.profileId]);
  assert.deepEqual(await resultsFor(fixture.mentor), []);
});

after(async () => {
  if (client) { await client.query("rollback"); await client.end(); }
  if (appPool) await appPool.end();
});
