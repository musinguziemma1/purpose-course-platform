import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

let client, announcements, appPool, cohortId;
const users = [], actors = {}, key = randomUUID(), created = [];

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Announcement fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  announcements = await import("../src/db/announcements.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  for (const [name, role] of [["editor", "editor"], ["student", "student"], ["mentor", "mentor"], ["outsider", "student"]]) {
    const email = `${key}-${name}@example.invalid`;
    const userId = (await client.query("insert into users(email,password_hash) values($1,'unused-test-hash') returning id", [email])).rows[0].id;
    users.push(userId);
    const permissions = (await client.query("select permissions from roles where slug=$1", [role])).rows[0].permissions;
    const profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id", [userId, name, `${key}-${name}`, role])).rows[0].id;
    actors[name] = { profileId, userId, email, fullName: name, roleSlug: role, permissions };
  }
  cohortId = (await client.query("insert into cohorts(slug,name,description,status,starts_at,ends_at) values($1,'Announcement fixture','Fixture cohort','active',now(),now()+interval '1 week') returning id", [key])).rows[0].id;
  await client.query("insert into cohort_members(cohort_id,profile_id,status) values($1,$2,'active')", [cohortId, actors.student.profileId]);
});

const input = (overrides = {}) => ({ title: `${key} welcome`, body: "Cohort orientation starts on Monday at 6pm.", audience: "learners", href: "/events", ...overrides });
const latestId = async () => (await client.query("select id from announcements where title like $1 order by id desc limit 1", [`${key}%`])).rows[0].id;
const noticeCount = async (id, profileId) => Number((await client.query("select count(*) from notifications where dedupe_key=$1", [`announcement:${id}:${profileId}`])).rows[0].count);

test("links are limited to site paths and https", () => {
  assert.equal(announcements.safeAnnouncementHref("/events"), "/events");
  assert.equal(announcements.safeAnnouncementHref(""), null);
  assert.equal(announcements.safeAnnouncementHref("https://example.org/a"), "https://example.org/a");
  for (const bad of ["//evil.example", "javascript:alert(1)", "http://example.org", "/a b"]) assert.equal(announcements.safeAnnouncementHref(bad), undefined, bad);
});

test("only publishers can write; drafts notify nobody", async () => {
  assert.match((await announcements.saveAnnouncement(input(), actors.student, true)).error, /permission/);
  assert.match((await announcements.saveAnnouncement(input({ href: "javascript:alert(1)" }), actors.editor, false)).error, /https/);
  assert.match((await announcements.saveAnnouncement(input({ audience: "cohort" }), actors.editor, false)).error, /cohort/);
  assert.ok((await announcements.saveAnnouncement(input(), actors.editor, false)).ok);
  const id = await latestId();
  created.push(id);
  assert.equal(await noticeCount(id, actors.student.profileId), 0);
  assert.equal((await announcements.getActiveAnnouncements(actors.student)).some((item) => item.id === id), false, "Drafts are not shown.");
});

test("publishing reaches exactly its audience once", async () => {
  const id = created[0];
  const version = (await client.query("select version from announcements where id=$1", [id])).rows[0].version;
  const result = await announcements.saveAnnouncement(input({ id: String(id), version: String(version) }), actors.editor, true);
  assert.match(result.message, /Published to \d+/);
  assert.equal(await noticeCount(id, actors.student.profileId), 1);
  assert.equal(await noticeCount(id, actors.mentor.profileId), 0, "Mentors are outside the learners audience.");
  assert.ok((await announcements.getActiveAnnouncements(actors.student)).some((item) => item.id === id));
  assert.equal((await announcements.getActiveAnnouncements(actors.mentor)).some((item) => item.id === id), false);
  const edited = await announcements.saveAnnouncement(input({ id: String(id), version: String(version + 1), title: `${key} welcome (updated)` }), actors.editor, true);
  assert.equal(edited.message, "Announcement saved.");
  assert.equal(await noticeCount(id, actors.student.profileId), 1, "Editing a published announcement does not notify again.");
  assert.match((await announcements.saveAnnouncement(input({ id: String(id), version: String(version) }), actors.editor, false)).error, /changed/);
});

test("cohort announcements reach only active members and expiry hides them", async () => {
  assert.ok((await announcements.saveAnnouncement(input({ title: `${key} cohort`, audience: "cohort", cohortId: String(cohortId) }), actors.editor, true)).ok);
  const id = await latestId();
  created.push(id);
  assert.equal(await noticeCount(id, actors.student.profileId), 1);
  assert.equal(await noticeCount(id, actors.outsider.profileId), 0);
  assert.ok((await announcements.getActiveAnnouncements(actors.student)).some((item) => item.id === id));
  assert.equal((await announcements.getActiveAnnouncements(actors.outsider)).some((item) => item.id === id), false);
  await client.query("update announcements set expires_at=now()-interval '1 minute' where id=$1", [id]);
  assert.equal((await announcements.getActiveAnnouncements(actors.student)).some((item) => item.id === id), false);
});

test("archiving removes an announcement from dashboards", async () => {
  const id = created[0];
  const version = (await client.query("select version from announcements where id=$1", [id])).rows[0].version;
  assert.match((await announcements.archiveAnnouncement(id, version, actors.student)).error, /permission/);
  assert.ok((await announcements.archiveAnnouncement(id, version, actors.editor)).ok);
  assert.equal((await announcements.getActiveAnnouncements(actors.student)).some((item) => item.id === id), false);
  assert.match((await announcements.saveAnnouncement(input({ id: String(id), version: String(version + 1) }), actors.editor, false)).error, /Archived/);
});

after(async () => {
  if (client) {
    for (const id of created) await client.query("delete from notifications where dedupe_key like $1", [`announcement:${id}:%`]);
    await client.query("delete from announcements where title like $1", [`${key}%`]);
    if (cohortId) await client.query("delete from cohorts where id=$1", [cohortId]);
    if (users.length) await client.query("delete from users where id=any($1::uuid[])", [users]);
    await client.end();
  }
  if (appPool) await appPool.end();
});
