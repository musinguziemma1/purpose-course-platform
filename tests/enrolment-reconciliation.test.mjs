import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { reconcileEnrolments } from "../scripts/reconcile-enrolments.mjs";

const key = randomUUID(), users = [], ids = [], backupDirectory = `.local/reconciliation-fixtures-${key}`;
let client, activeEmail;
before(async () => {
  const env = dotenv.parse(readFileSync(".env")), target = new URL(env.DATABASE_URL);
  assert.ok(target.hostname === "127.0.0.1" && target.port === "54329", "Only local generated fixtures are permitted");
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  const level = (await client.query("select id from course_levels order by level_number limit 1")).rows[0].id;
  for (const active of [true, false]) {
    const email = `${key}-${active}@example.invalid`;
    const user = (await client.query("insert into users(email,password_hash,is_active)values($1,'fixture-only',$2)returning id", [email, active])).rows[0]; users.push(user.id);
    const profile = (await client.query("insert into profiles(user_id,role_id,full_name,slug)select $1,id,'Reconciliation fixture',$2 from roles where slug='student' returning id", [user.id, `${key}-${active}`])).rows[0];
    ids.push((await client.query("insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,'Fixture',$3,'enrolled')returning id", [profile.id, active ? email.toUpperCase() : email, level])).rows[0].id);
    if (active) activeEmail = email;
  }
  ids.push((await client.query("insert into enrollments(email,full_name,level_id,status)values($1,'Unlinked fixture',$2,'enrolled')returning id", [`${key}-unlinked@example.invalid`, level])).rows[0].id);
  const session = (await client.query("select id from course_sessions order by id limit 1")).rows[0].id;
  await client.query("insert into learning_progress(enrollment_id,session_id,completed,completed_at)values($1,$2,true,now())", [ids[2], session]);
});
after(async () => {
  if (client) {
    await client.query("delete from activity_logs where action='enrolment.reconciled' and entity_id=any($1::text[])", [ids]);
    await client.query("delete from enrollments where id=any($1::uuid[])", [ids]);
    await client.query("delete from users where id=any($1::uuid[])", [users]); await client.end();
  }
  if (existsSync(backupDirectory)) { for (const file of readdirSync(backupDirectory)) unlinkSync(join(backupDirectory, file)); rmdirSync(backupDirectory); }
});
test("reconciliation plans without writes, pauses invalid placements and preserves legacy progress", async () => {
  const plan = await reconcileEnrolments(client, { onlyIds: ids });
  assert.equal(plan.pause, 2); assert.equal(plan.canonicalEmail, 1);
  assert.equal((await client.query("select id from enrollments where id=any($1::uuid[]) and status='enrolled'", [ids])).rowCount, 3);
  const result = await reconcileEnrolments(client, { apply: true, onlyIds: ids, backupDirectory, encryptionKey: randomBytes(32) });
  assert.equal(result.pause, 2);
  const rows = (await client.query("select id,email,profile_id,status from enrollments where id=any($1::uuid[])", [ids])).rows;
  assert.equal(rows.find(row => row.id === ids[0]).email, activeEmail);
  assert.equal(rows.find(row => row.id === ids[0]).status, "enrolled");
  for (const id of ids.slice(1)) assert.equal(rows.find(row => row.id === id).status, "paused");
  assert.equal(rows.find(row => row.id === ids[2]).profile_id, null);
  assert.equal((await client.query("select id from learning_progress where enrollment_id=$1 and completed", [ids[2]])).rowCount, 1);
  assert.ok(readdirSync(backupDirectory).length > 0);
  assert.equal((await reconcileEnrolments(client, { onlyIds: ids })).pause, 0);
});
