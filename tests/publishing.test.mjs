import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

let client, service, appPool;
const key = randomUUID(), users = [], articles = new Set(), actors = {};
const draft = { id: "", expectedVersion: "", title: "Atomic publishing fixture " + key, body: "A meaningful teaching article for the publishing regression tests. ".repeat(4), categoryId: null,
  authorId: "", subtitle: null, excerpt: "Test excerpt", coverImageUrl: null, coverAlt: "Fixture", seoTitle: "Fixture", seoDescription: "Fixture",
  changeNote: "Test revision", isFeatured: false, tags: "fixture-" + key };
async function row(id) { return (await client.query("select * from articles where id=$1", [id])).rows[0]; }
async function counts(id) { return (await client.query("select (select count(*)::int from article_revisions where article_id=$1) as revisions,(select count(*)::int from article_reviews where article_id=$1) as reviews,(select count(*)::int from activity_logs where entity_id=$1::text) as logs", [id])).rows[0]; }
async function create() { const result = await service.persistArticle({ ...draft, authorId: actors.author.profileId }, actors.author); assert.ok(result.ok); articles.add(result.articleId); return result; }
async function transition(id, action, actor = actors.editor, extra = {}) { return service.applyArticleTransition({ articleId: id, action, comment: "Verification review note", scheduledFor: "", expectedVersion: (await row(id)).updated_at.toISOString(), ...extra }, actor); }

before(async () => {
  const env = dotenv.parse(readFileSync(".env")), uri = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(uri.hostname) && uri.port === "54329", "Publishing fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  service = await import("../src/db/publishing.ts"); appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  for (const [name, role] of [["author", "author"], ["editor", "editor"], ["student", "student"]]) {
    const userId = (await client.query("insert into users(email,password_hash) values($1,'unused-test-hash') returning id", [`${key}-${name}@example.invalid`])).rows[0].id; users.push(userId);
    const profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id", [userId, name, `${key}-${name}`, role])).rows[0].id;
    actors[name] = { profileId, fullName: name, roleSlug: role, permissions: [] };
  }
});

test("all workflow commands persist valid review events and matching status changes", async () => {
  const created = await create(), id = created.articleId;
  for (const [action, expected] of [["submit", "submitted"], ["start_review", "in_review"], ["request_revision", "revision_requested"], ["submit", "submitted"], ["approve", "approved"], ["schedule", "scheduled"], ["publish", "published"], ["feature", "published"], ["archive", "archived"], ["restore", "draft"], ["submit", "submitted"], ["reject", "rejected"], ["restore", "draft"]]) {
    const result = await transition(id, action, action === "submit" ? actors.author : actors.editor, { scheduledFor: new Date(Date.now() + 3600000).toISOString() });
    assert.ok(result.ok, JSON.stringify(result)); assert.equal((await row(id)).status, expected);
  }
  const events = (await client.query("select action from article_reviews where article_id=$1 order by id", [id])).rows.map((event) => event.action);
  assert.deepEqual(events, ["submitted", "review_started", "revision_requested", "submitted", "approved", "scheduled", "published", "comment", "archived", "restored", "submitted", "rejected", "restored"]);
  assert.equal((await counts(id)).reviews, 13);
});

test("unknown actions, foreign ownership and withdrawn editorial permissions cannot transition articles", async () => {
  const { articleId } = await create(), before = await counts(articleId);
  assert.ok((await transition(articleId, "__proto__")).error);
  assert.ok((await transition(articleId, "submit", actors.student)).error);
  assert.ok((await transition(articleId, "publish", actors.author)).error);
  assert.ok((await transition(articleId, "submit", { ...actors.author, roleSlug: "student" })).error);
  assert.deepEqual(await counts(articleId), before); assert.equal((await row(articleId)).status, "draft");
});

test("a late database failure rolls back content, revision, tags and audit changes", async () => {
  const { articleId, updatedAt } = await create(), before = await counts(articleId), original = await row(articleId);
  await assert.rejects(service.persistArticle({ ...draft, id: articleId, expectedVersion: updatedAt, title: "This update must roll back" }, { ...actors.editor, profileId: randomUUID() }));
  assert.equal((await row(articleId)).title, original.title); assert.equal((await row(articleId)).updated_at.getTime(), original.updated_at.getTime());
  assert.deepEqual(await counts(articleId), before);
});

test("concurrent edits using one version produce one revision and one conflict", async () => {
  const { articleId, updatedAt } = await create();
  const input = { ...draft, id: articleId, expectedVersion: updatedAt, title: "Concurrent edit verification" };
  const results = await Promise.all([service.persistArticle(input, actors.author), service.persistArticle({ ...input, title: "Second editor changes" }, actors.author)]);
  assert.equal(results.filter((result) => result.ok).length, 1); assert.equal(results.filter((result) => result.error?.includes("changed since")).length, 1);
  assert.equal((await counts(articleId)).revisions, 2);
});

test("stale workflow actions and invalid schedules leave state and history unchanged", async () => {
  const { articleId, updatedAt } = await create();
  assert.ok((await transition(articleId, "submit", actors.author)).ok);
  assert.ok((await transition(articleId, "approve", actors.editor, { expectedVersion: updatedAt })).error);
  assert.ok((await transition(articleId, "approve")).ok);
  const before = await counts(articleId);
  assert.ok((await transition(articleId, "schedule", actors.editor, { scheduledFor: new Date(Date.now() - 10000).toISOString() })).error);
  assert.equal((await row(articleId)).status, "approved"); assert.deepEqual(await counts(articleId), before);
});

test("authors cannot change reviewed content and editor changes clear approval and scheduling", async () => {
  const created = await create(), id = created.articleId;
  await transition(id, "submit", actors.author); await transition(id, "approve");
  const input = { ...draft, id, expectedVersion: (await row(id)).updated_at.toISOString() };
  assert.ok((await service.persistArticle(input, actors.author)).error);
  await transition(id, "schedule", actors.editor, { scheduledFor: new Date(Date.now() + 3600000).toISOString() });
  const saved = await service.persistArticle({ ...input, expectedVersion: (await row(id)).updated_at.toISOString(), body: draft.body + " Editorial correction." }, actors.editor);
  assert.ok(saved.ok); assert.equal((await row(id)).status, "draft"); assert.equal((await row(id)).scheduled_for, null);
  const review = (await client.query("select action,to_status from article_reviews where article_id=$1 order by id desc limit 1", [id])).rows[0];
  assert.deepEqual(review, { action: "restored", to_status: "draft" });
});

test("concurrent scheduled publishers create exactly one publication event and notification", async () => {
  const { articleId } = await create();
  await client.query("update articles set status='scheduled',scheduled_for=now()-interval '1 minute' where id=$1", [articleId]);
  const results = await Promise.all([service.publishScheduledArticles([articleId]), service.publishScheduledArticles([articleId])]);
  assert.equal(results.reduce((sum, value) => sum + value, 0), 1); assert.equal((await row(articleId)).status, "published");
  assert.equal((await client.query("select count(*)::int as count from article_reviews where article_id=$1 and action='published'", [articleId])).rows[0].count, 1);
  assert.equal((await client.query("select count(*)::int as count from notifications where recipient_id=$1 and href=$2", [actors.author.profileId, '/blog/' + (await row(articleId)).slug])).rows[0].count, 1);
});

after(async () => {
  if (client) {
    if (articles.size) { await client.query("delete from activity_logs where entity_id=any($1::text[])", [[...articles]]); await client.query("delete from articles where id=any($1::uuid[])", [[...articles]]); }
    if (users.length) { await client.query("delete from activity_logs where actor_id in (select id from profiles where user_id=any($1::uuid[]))", [users]); await client.query("delete from users where id=any($1::uuid[])", [users]); }
    await client.query("delete from tags where name=$1", ['fixture-' + key]); await client.end();
  }
  if (appPool) await appPool.end();
});
