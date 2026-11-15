import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const key = randomUUID(), people = {}, userIds = [];
let client, pool, change;
before(async () => {
  const env = dotenv.parse(readFileSync(".env")), url = new URL(env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "54329", "Only local fixtures are permitted");
  process.env.DATABASE_URL = env.DATABASE_URL;
  ({ changeProfileRole: change } = await import("../src/db/people-roles.ts"));
  ({ pool } = await import("../src/db/index.ts"));
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  for (const [name, role] of [["admin", "super_admin"], ["mentor", "mentor"], ["target", "guest"], ["rollback", "guest"]]) {
    const email = `${key}-${name}@example.invalid`;
    const user = (await client.query("insert into users(email,password_hash)values($1,'no-login-fixture')returning id", [email])).rows[0];
    userIds.push(user.id);
    const profile = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id", [user.id, `${key} ${name}`, `${key}-${name}`, role])).rows[0];
    people[name] = { userId: user.id, profileId: profile.id, roleSlug: role, permissions: [], email, fullName: name };
  }
});
after(async () => {
  if (client) {
    await client.query("delete from activity_logs where actor_id=any($1::uuid[])", [Object.values(people).map(x => x.profileId)]);
    await client.query("delete from users where id=any($1::uuid[])", [userIds]); await client.end();
  }
  await pool?.end();
});
test("student role conversion revokes sessions and records access changes without manufacturing admission", async () => {
  await client.query("insert into auth_sessions(token,user_id,expires_at)values($1,$2,now()+interval '1 day')", [key, people.target.userId]);
  assert.equal((await change(people.target.profileId, "student", people.admin)).ok, true);
  assert.equal((await client.query("select id from enrollments where profile_id=$1", [people.target.profileId])).rowCount, 0);
  assert.equal((await client.query("select token from auth_sessions where user_id=$1", [people.target.userId])).rowCount, 0);
  assert.equal((await client.query("select id from activity_logs where actor_id=$1 and entity_id=$2 and action='people.role_updated'", [people.admin.profileId, people.target.profileId])).rowCount, 1);
});
test("role changes recheck the current actor and preserve active learner placement", async () => {
  assert.match((await change(people.target.profileId, "mentor", { ...people.mentor, roleSlug: "super_admin" })).error, /Administrator/);
  assert.match((await change(people.admin.profileId, "mentor", people.admin)).error, /own role/);
  assert.match((await change(people.admin.profileId.toUpperCase(), "mentor", people.admin)).error, /own role/);
  const level = (await client.query("select id from course_levels order by level_number limit 1")).rows[0];
  await client.query("insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,'Fixture',$3,'enrolled')", [people.target.profileId, people.target.email, level.id]);
  assert.match((await change(people.target.profileId, "mentor", people.admin)).error, /Pause or complete/);
  await client.query("update enrollments set status='paused' where profile_id=$1", [people.target.profileId]);
  assert.equal((await change(people.target.profileId, "mentor", people.admin)).ok, true);
  assert.equal((await client.query("select status from enrollments where profile_id=$1", [people.target.profileId])).rows[0].status, "paused");
});
test("notification failure rolls back the role change and session revocation", async () => {
  const fn = `role_failure_${key.replaceAll("-", "")}`;
  await client.query("insert into auth_sessions(token,user_id,expires_at)values($1,$2,now()+interval '1 day')", [key + "-rollback", people.rollback.userId]);
  await client.query(`create function ${fn}() returns trigger language plpgsql as $$ begin if new.recipient_id = '${people.rollback.profileId}'::uuid and new.title = 'Your access level changed' then raise exception 'role fixture failure'; end if; return new; end $$`);
  await client.query(`create trigger ${fn} before insert on notifications for each row execute function ${fn}()`);
  try {
    await assert.rejects(change(people.rollback.profileId, "student", people.admin));
    assert.equal((await client.query("select r.slug from profiles p join roles r on r.id=p.role_id where p.id=$1", [people.rollback.profileId])).rows[0].slug, "guest");
    assert.equal((await client.query("select token from auth_sessions where user_id=$1", [people.rollback.userId])).rowCount, 1);
  } finally { await client.query(`drop trigger ${fn} on notifications`); await client.query(`drop function ${fn}()`); }
});
