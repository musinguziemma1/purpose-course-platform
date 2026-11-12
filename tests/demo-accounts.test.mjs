import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { checkDemoAccounts, disableDemoAccounts, provisionDemoAccounts } from "../scripts/manage-demo-accounts.mjs";

const key = randomUUID().replaceAll("-", ""), prefix = `review-${key.slice(0, 12)}`;
const options = { prefix, target: "project-local-test", credentialsFile: `.local/verification/${key}-demo-credentials.json`, backupDirectory: `.local/verification/${key}-demo-backups` };
let client, metrics, pool, adminId, originalHashes, first;
before(async () => {
  const env = dotenv.parse(readFileSync(".env")), uri = new URL(env.DATABASE_URL);
  assert.ok(uri.hostname === "127.0.0.1" && uri.port === "54329", "Demo fixtures require the project-local database.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  metrics = await import("../src/db/learning-metrics.ts"); pool = (await import("../src/db/index.ts")).pool;
  const user = (await client.query("insert into users(email,password_hash)values($1,'untouched-real-owner-fixture')returning id", [`${key}@example.invalid`])).rows[0].id;
  adminId = (await client.query("insert into profiles(user_id,role_id,full_name,slug)select $1,id,$2,$2 from roles where slug='super_admin'returning id", [user, key])).rows[0].id;
  originalHashes = (await client.query("select password_hash,is_active,is_demo_account from users where id=$1", [user])).rows[0];
});
const records = async () => (await client.query("select u.*,p.id as profile_id,r.slug as role from users u join profiles p on p.user_id=u.id join roles r on r.id=p.role_id where u.email like $1", [prefix + ".%@purposecourse.invalid"])).rows;

test("demo provisioning creates three verified unique credentials and coherent role relationships", async () => {
  first = await provisionDemoAccounts(client, options);
  assert.equal(first.accounts.length, 3); assert.ok(first.accounts.every((account) => account.active && account.roleMatches && account.markedDemo && account.passwordVerified));
  const credentials = JSON.parse(readFileSync(options.credentialsFile)); assert.equal(credentials.status, "active"); assert.equal(new Set(credentials.accounts.map((item) => item.password)).size, 3); assert.ok(credentials.accounts.every((item) => item.password.length >= 24));
  assert.ok(credentials.accounts.every((item) => !JSON.stringify(first).includes(item.password)));
  const rows = await records(), student = rows.find((row) => row.role === "student"), mentor = rows.find((row) => row.role === "mentor");
  assert.equal((await client.query("select * from enrollments where profile_id=$1 and status='enrolled'", [student.profile_id])).rowCount, 1);
  assert.equal((await client.query("select * from mentor_assignments where student_id=$1 and mentor_id=$2 and status='active'", [student.profile_id, mentor.profile_id])).rowCount, 1);
  assert.equal((await client.query("select * from org_memberships where profile_id=any($1::uuid[])", [rows.map((row) => row.profile_id)])).rowCount, 3);
});

test("rerunning provision preserves passwords, practice edits and the real owner", async () => {
  const previous = JSON.parse(readFileSync(options.credentialsFile));
  const student = (await records()).find((row) => row.role === "student");
  await client.query("update learner_goals set progress=25 where student_id=$1", [student.profile_id]);
  await provisionDemoAccounts(client, options);
  const next = JSON.parse(readFileSync(options.credentialsFile)); assert.deepEqual(next.accounts, previous.accounts);
  assert.equal((await client.query("select * from learner_goals where student_id=$1 and progress=25", [student.profile_id])).rowCount, 1);
  assert.equal((await client.query("select * from enrollments where profile_id=$1", [student.profile_id])).rowCount, 1);
  const current = (await client.query("select u.password_hash,u.is_active,u.is_demo_account from users u join profiles p on p.user_id=u.id where p.id=$1", [adminId])).rows[0]; assert.deepEqual(current, originalHashes);
});

test("practice learning reports are visible to demo staff and excluded for real staff", async () => {
  const rows = await records(), demoAdmin = rows.find((row) => row.role === "super_admin"), student = rows.find((row) => row.role === "student");
  const cohort = (await client.query("select id from cohorts where slug=$1", [prefix + "-review-cohort"])).rows[0];
  const normal = await metrics.getLearningReport({ profileId: adminId }, cohort.id); assert.equal(normal.summary.learners, 0); assert.equal(normal.summary.opportunities, 0);
  const practice = await metrics.getLearningReport({ profileId: demoAdmin.profile_id }, cohort.id); assert.equal(practice.summary.learners, 1); assert.ok(practice.summary.opportunities > 0);
  assert.equal((await metrics.getLearnerMetrics({ profileId: student.profile_id }, [student.profile_id])).length, 1);
});

test("missing credentials or reserved-address collisions never reset another account", async () => {
  await assert.rejects(() => provisionDemoAccounts(client, { ...options, credentialsFile: options.credentialsFile + ".missing" }), /credentials.*missing/);
  const collisionPrefix = prefix + "-collision", address = `${collisionPrefix}.super-admin@purposecourse.invalid`;
  await client.query("insert into users(email,password_hash)values($1,'keep-this-hash')", [address]);
  try { await assert.rejects(() => provisionDemoAccounts(client, { ...options, prefix: collisionPrefix, credentialsFile: options.credentialsFile + ".collision" }), /nonmatching account/); assert.equal((await client.query("select password_hash from users where email=$1", [address])).rows[0].password_hash, "keep-this-hash"); }
  finally { await client.query("delete from users where email=$1", [address]); }
});

test("a late provisioning failure rolls back credentials, enrolment, cohort and mentor links", async () => {
  const failurePrefix = prefix + "-rollback", trigger = "demo_rollback_" + key;
  await client.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin if NEW.action='security.demo_accounts_verified' and exists(select 1 from profiles where id=NEW.actor_id and slug like '${failurePrefix}-%') then raise exception 'forced demo provisioning failure'; end if; return NEW; end $$; create trigger ${trigger} before insert on activity_logs for each row execute function ${trigger}()`);
  try { await assert.rejects(() => provisionDemoAccounts(client, { ...options, prefix: failurePrefix, credentialsFile: options.credentialsFile + ".rollback" }), /forced demo provisioning failure/); }
  finally { await client.query(`drop trigger ${trigger} on activity_logs; drop function ${trigger}()`); }
  assert.equal((await client.query("select * from users where email like $1", [failurePrefix + ".%@purposecourse.invalid"])).rowCount, 0);
  assert.equal((await client.query("select * from cohorts where slug=$1", [failurePrefix + "-review-cohort"])).rowCount, 0);
  assert.equal(JSON.parse(readFileSync(options.credentialsFile + ".rollback")).status, "pending");
});

test("disabling demo accounts revokes sessions and never reactivates on provision", async () => {
  const rows = await records(); await client.query("insert into auth_sessions(user_id,token,expires_at)values($1,$2,now()+interval '1 hour')", [rows[0].id, randomBytes(32).toString("hex")]);
  await disableDemoAccounts(client, options);
  assert.ok((await checkDemoAccounts(client, options)).every((item) => !item.active && item.passwordVerified));
  assert.equal((await client.query("select * from auth_sessions where user_id=any($1::uuid[])", [rows.map((row) => row.id)])).rowCount, 0);
  await assert.rejects(() => provisionDemoAccounts(client, options), /does not reactivate/);
  assert.equal((await client.query("select u.is_active from users u join profiles p on p.user_id=u.id where p.id=$1", [adminId])).rows[0].is_active, true);
});

after(async () => {
  if (client) {
    const rows = await records(), ids = rows.map((row) => row.profile_id);
    await client.query("delete from activity_logs where actor_id=any($1::uuid[])", [ids]);
    await client.query("delete from enrollments where profile_id=any($1::uuid[])", [ids]);
    await client.query("delete from cohorts where slug=$1", [prefix + "-review-cohort"]);
    await client.query("delete from users where id=any($1::uuid[])or id in(select user_id from profiles where id=$2)", [rows.map((row) => row.id), adminId]); await client.end();
  }
  await pool?.end();
});
