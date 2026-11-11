import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, inArray } from "drizzle-orm";

let client, database, policy, schema, appPool;
let member, outsider, moderator;
const fixture = {};

function viewer(profileId, roleSlug) {
  return { profileId, roleSlug, permissions: [], fullName: "Authorization test" };
}

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Security fixtures require the project-local database.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  schema = await import("../src/db/schema.ts");
  policy = await import("../src/db/community-access.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  await client.query("begin");
  database = drizzle(client);
  const profiles = (await client.query("select id from profiles order by created_at limit 2")).rows;
  assert.equal(profiles.length, 2);
  member = viewer(profiles[0].id, "student");
  outsider = viewer(profiles[1].id, "student");
  moderator = viewer(profiles[1].id, "moderator");
  const key = randomUUID();
  for (const [name, visibility, archived] of [["public", "public", false], ["private", "members", false], ["archived", "public", true]]) {
    fixture[name + "Community"] = (await client.query("insert into communities(slug,name,description,visibility,is_archived) values($1,$2,'Access control fixture',$3,$4) returning id", [key + name, name, visibility, archived])).rows[0].id;
  }
  await client.query("insert into community_members(community_id,profile_id) values($1,$2)", [fixture.privateCommunity, member.profileId]);
  fixture.group = (await client.query("insert into discussion_groups(slug,name,is_members_only) values($1,'Members',true) returning id", [key])).rows[0].id;
  for (const [name, communityId, groupId, removed] of [
    ["public", fixture.publicCommunity, null, false],
    ["private", fixture.privateCommunity, null, false],
    ["archived", fixture.archivedCommunity, null, false],
    ["removed", fixture.publicCommunity, null, true],
    ["group", null, fixture.group, false],
    ["orphan", -2147483647, null, false],
  ]) {
    fixture[name + "Thread"] = (await client.query("insert into discussion_threads(title,author_name,community_id,group_id,is_removed) values($1,'Test',$2,$3,$4) returning id", [key + name, communityId, groupId, removed])).rows[0].id;
  }
});

async function visibleThreads(actor) {
  const ids = ["public", "private", "archived", "removed", "group", "orphan"].map((name) => fixture[name + "Thread"]);
  return (await database.select({ id: schema.discussionThreads.id }).from(schema.discussionThreads).where(and(inArray(schema.discussionThreads.id, ids), policy.threadReadable(actor)))).map((row) => row.id).sort((a, b) => a - b);
}

test("anonymous readers cannot see members-only groups, private communities, removed, archived or orphaned discussions", async () => {
  assert.deepEqual(await visibleThreads(null), [fixture.publicThread]);
});

test("signing in does not grant membership in a private community", async () => {
  assert.deepEqual(await visibleThreads(outsider), [fixture.publicThread, fixture.groupThread].sort((a, b) => a - b));
});

test("members can read their community; removed and archived content stays hidden", async () => {
  assert.deepEqual(await visibleThreads(member), [fixture.publicThread, fixture.privateThread, fixture.groupThread].sort((a, b) => a - b));
});

test("moderators can review private discussions without restoring removed content in public readers", async () => {
  assert.deepEqual(await visibleThreads(moderator), [fixture.publicThread, fixture.privateThread, fixture.groupThread].sort((a, b) => a - b));
  assert.deepEqual(await visibleThreads(viewer(moderator.profileId, "editor")), [fixture.publicThread, fixture.privateThread, fixture.groupThread].sort((a, b) => a - b));
});

test("revoking membership immediately removes access", async () => {
  await client.query("delete from community_members where community_id=$1 and profile_id=$2", [fixture.privateCommunity, member.profileId]);
  const rows = await database.select({ id: schema.communities.id }).from(schema.communities).where(and(eq(schema.communities.id, fixture.privateCommunity), policy.communityReadable(member)));
  assert.equal(rows.length, 0);
  assert.ok(!(await visibleThreads(member)).includes(fixture.privateThread));
});

after(async () => {
  if (client) { await client.query("rollback"); await client.end(); }
  if (appPool) await appPool.end();
});
