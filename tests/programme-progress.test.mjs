import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
let client, pool, progress, userId, enrollmentId, sessionId, otherSessionId;
const key = randomUUID(), viewer = { profileId: "", roleSlug: "student", fullName: "Checklist learner" };
before(async () => {
  const env = dotenv.parse(readFileSync(".env")), uri = new URL(env.DATABASE_URL);
  assert.ok(uri.hostname === "127.0.0.1" && uri.port === "54329", "Programme fixtures require project-local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  progress = await import("../src/db/programme-progress.ts"); pool = (await import("../src/db/index.ts")).pool;
  userId = (await client.query("insert into users(email,password_hash)values($1,'unused')returning id", [key + "@example.invalid"])).rows[0].id;
  viewer.profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug)select $1,id,'Checklist learner',$2 from roles where slug='student'returning id", [userId,key])).rows[0].id;
  const sessions = (await client.query("select s.id,s.level_id from course_sessions s join course_levels l on l.id=s.level_id order by l.level_number,s.sort_order")).rows;
  sessionId = sessions[0].id; otherSessionId = sessions.find(s => s.level_id !== sessions[0].level_id).id;
  enrollmentId = (await client.query("insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,'Checklist learner',$3,'enrolled')returning id", [viewer.profileId,key + "@example.invalid",sessions[0].level_id])).rows[0].id;
});
test("checklist changes require the learner's active enrolment and intended session level", async () => {
  for (const id of [0,-1,1.5,Number.NaN,otherSessionId]) assert.equal(await progress.setProgrammeSessionComplete(id,true,viewer),false);
  assert.equal(await progress.setProgrammeSessionComplete(sessionId,true,{...viewer,roleSlug:"mentor"}),false);
  assert.equal(await progress.setProgrammeSessionComplete(sessionId,true,{...viewer,profileId:randomUUID()}),false);
});
test("repeated concurrent submissions preserve the intended checked state with one audit event", async () => {
  assert.deepEqual(await Promise.all([progress.setProgrammeSessionComplete(sessionId,true,viewer),progress.setProgrammeSessionComplete(sessionId,true,viewer)]),[true,true]);
  const rows = (await client.query("select * from learning_progress where enrollment_id=$1",[enrollmentId])).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].completed,true);assert.ok(rows[0].completed_at);
  assert.equal((await client.query("select * from activity_logs where actor_id=$1",[viewer.profileId])).rowCount,1);
  assert.equal((await client.query("select * from lesson_progress where profile_id=$1",[viewer.profileId])).rowCount,0);
  assert.equal((await client.query("select * from certificates where profile_id=$1",[viewer.profileId])).rowCount,0);
});
test("unchecking is idempotent and cannot change assessed learning records", async () => {
  await progress.setProgrammeSessionComplete(sessionId,false,viewer);await progress.setProgrammeSessionComplete(sessionId,false,viewer);
  const row = (await client.query("select * from learning_progress where enrollment_id=$1",[enrollmentId])).rows[0];
  assert.equal(row.completed,false);assert.equal(row.completed_at,null);
  assert.equal((await client.query("select * from activity_logs where actor_id=$1",[viewer.profileId])).rowCount,2);
});
test("paused, waitlisted and completed enrolments cannot rewrite their checklist", async () => {
  for (const status of ["paused","waitlist","completed"]) {
    await client.query("update enrollments set status=$1 where id=$2",[status,enrollmentId]);
    assert.equal(await progress.setProgrammeSessionComplete(sessionId,true,viewer),false);
  }
  assert.equal((await client.query("select completed from learning_progress where enrollment_id=$1",[enrollmentId])).rows[0].completed,false);
});
after(async () => {if(client){if(viewer.profileId)await client.query("delete from activity_logs where actor_id=$1",[viewer.profileId]);if(enrollmentId)await client.query("delete from enrollments where id=$1",[enrollmentId]);if(userId)await client.query("delete from users where id=$1",[userId]);await client.end();}await pool?.end();});
