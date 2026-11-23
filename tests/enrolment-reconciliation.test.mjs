import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { reconcileEnrolments } from "../scripts/reconcile-enrolments.mjs";

const key = randomUUID(), users = [], profiles = [], ids = [], membershipIds = [], backupDirectory = `.local/reconciliation-fixtures-${key}`;
let client, activeEmail, cohortId, completedId, completedProfileId;
before(async () => {
  const env = dotenv.parse(readFileSync(".env")), target = new URL(env.DATABASE_URL);
  assert.ok(target.hostname === "127.0.0.1" && target.port === "54329", "Only local generated fixtures are permitted");
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  const level = (await client.query("select id from course_levels order by level_number limit 1")).rows[0].id;
  for (const active of [true, false]) {
    const email = `${key}-${active}@example.invalid`;
    const user = (await client.query("insert into users(email,password_hash,is_active)values($1,'fixture-only',$2)returning id", [email, active])).rows[0]; users.push(user.id);
    const profile = (await client.query("insert into profiles(user_id,role_id,full_name,slug)select $1,id,'Reconciliation fixture',$2 from roles where slug='student' returning id", [user.id, `${key}-${active}`])).rows[0];
    profiles.push(profile.id);
    ids.push((await client.query("insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,'Fixture',$3,'enrolled')returning id", [profile.id, active ? email.toUpperCase() : email, level])).rows[0].id);
    if (active) activeEmail = email;
  }
  ids.push((await client.query("insert into enrollments(email,full_name,level_id,status)values($1,'Unlinked fixture',$2,'enrolled')returning id", [`${key}-unlinked@example.invalid`, level])).rows[0].id);
  const completedEmail = `${key}-completed@example.invalid`;
  const completedUser = (await client.query("insert into users(email,password_hash)values($1,'fixture-only')returning id", [completedEmail])).rows[0]; users.push(completedUser.id);
  completedProfileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug)select $1,id,'Completed fixture',$2 from roles where slug='student' returning id", [completedUser.id, `${key}-completed`])).rows[0].id;
  completedId = (await client.query("insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,'Completed fixture',$3,'completed')returning id", [completedProfileId, completedEmail, level])).rows[0].id;
  ids.push(completedId);
  cohortId = (await client.query("insert into cohorts(slug,name,level_id,description,status,starts_at,ends_at)values($1,'Reconciliation cohort',$2,'Fixture cohort for membership reconciliation.','active',now()-interval '1 day',now()+interval '30 days')returning id", [`${key}-cohort`, level])).rows[0].id;
  membershipIds.push(...(await client.query("insert into cohort_members(cohort_id,profile_id,role,status) values($1,$2,'learner','active'),($1,$3,'learner','active') returning id", [cohortId, profiles[1], completedProfileId])).rows.map(row => row.id));
  const session = (await client.query("select id from course_sessions order by id limit 1")).rows[0].id;
  await client.query("insert into learning_progress(enrollment_id,session_id,completed,completed_at)values($1,$2,true,now())", [ids[2], session]);
});
after(async () => {
  if (client) {
    await client.query("delete from activity_logs where action='enrolment.reconciled' and entity_id=any($1::text[])", [ids]);
    await client.query("delete from activity_logs where action='cohort.membership_reconciled' and entity_id=any($1::text[])", [membershipIds.map(String)]);
    if (cohortId) await client.query("delete from cohorts where id=$1", [cohortId]);
    await client.query("delete from enrollments where id=any($1::uuid[])", [ids]);
    await client.query("delete from users where id=any($1::uuid[])", [users]); await client.end();
  }
  if (existsSync(backupDirectory)) { for (const file of readdirSync(backupDirectory)) unlinkSync(join(backupDirectory, file)); rmdirSync(backupDirectory); }
});
test("reconciliation plans without writes, pauses invalid placements and preserves legacy progress", async () => {
  const plan = await reconcileEnrolments(client, { onlyIds: ids });
  assert.equal(plan.pause, 2); assert.equal(plan.canonicalEmail, 1);
  assert.equal(plan.cohortMemberships, 1); assert.equal(plan.cohortRemoved, 1);
  assert.equal((await client.query("select id from enrollments where id=any($1::uuid[]) and status='enrolled'", [ids])).rowCount, 3);
  const result = await reconcileEnrolments(client, { apply: true, onlyIds: ids, backupDirectory, encryptionKey: randomBytes(32) });
  assert.equal(result.pause, 2);
  const rows = (await client.query("select id,email,profile_id,status from enrollments where id=any($1::uuid[])", [ids])).rows;
  assert.equal(rows.find(row => row.id === ids[0]).email, activeEmail);
  assert.equal(rows.find(row => row.id === ids[0]).status, "enrolled");
  for (const id of ids.slice(1, 3)) assert.equal(rows.find(row => row.id === id).status, "paused");
  assert.equal(rows.find(row => row.id === completedId).status, "completed");
  assert.equal(rows.find(row => row.id === ids[2]).profile_id, null);
  assert.equal((await client.query("select id from learning_progress where enrollment_id=$1 and completed", [ids[2]])).rowCount, 1);
  const memberships = (await client.query("select profile_id,status from cohort_members where cohort_id=$1 order by profile_id", [cohortId])).rows;
  assert.equal(memberships.find(row => row.profile_id === profiles[1]).status, "paused");
  assert.equal(memberships.find(row => row.profile_id === completedProfileId).status, "removed");
  assert.ok(readdirSync(backupDirectory).length > 0);
  const clean = await reconcileEnrolments(client, { onlyIds: ids });
  assert.equal(clean.pause, 0); assert.equal(clean.cohortMemberships, 0);
});
