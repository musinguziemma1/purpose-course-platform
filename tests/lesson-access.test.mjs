import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

let client, database, schema, policy, progress, appPool, userId, courseId, moduleId, levelId;
const key = randomUUID(), ids = {}, viewer = { profileId: "", fullName: "Verification learner", roleSlug: "student", permissions: [] };
before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Lesson fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  schema = await import("../src/db/schema.ts"); policy = await import("../src/db/learning-access.ts"); progress = await import("../src/db/lesson-progress.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect(); database = drizzle(client);
  userId = (await client.query("insert into users(email,password_hash) values($1,'unused-test-hash') returning id", [key + "@example.invalid"])).rows[0].id;
  viewer.profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,'Verification learner',$2 from roles where slug='student' returning id", [userId, key])).rows[0].id;
  levelId = (await client.query("select id from course_levels order by id limit 1")).rows[0].id;
  courseId = (await client.query("insert into courses(level_id,slug,title) values($1,$2,'Lesson fixture') returning id", [levelId, key])).rows[0].id;
  moduleId = (await client.query("insert into course_modules(course_id,slug,title) values($1,$2,'Lesson fixture') returning id", [courseId, key])).rows[0].id;
  for (const [index, name] of ["preview", "first", "draft", "last"].entries()) ids[name] = (await client.query("insert into lessons(module_id,slug,title,body,status,sort_order,is_preview) values($1,$2,$2,'Private teaching content',$3,$4,$5) returning id", [moduleId, name, name === "draft" ? "draft" : "published", index, name === "preview"])).rows[0].id;
});

async function allowed(name, write = false, actor = viewer) {
  return (await database.select({ id: schema.lessons.id }).from(schema.lessons).innerJoin(schema.courseModules, eq(schema.lessons.moduleId, schema.courseModules.id)).innerJoin(schema.courses, eq(schema.courseModules.courseId, schema.courses.id)).where(and(eq(schema.lessons.id, ids[name]), policy.lessonAccessible(actor, { write })))).length > 0;
}

test("a published preview can be read without enrolment but cannot award progress", async () => {
  assert.equal(await allowed("preview"), true);
  assert.equal(await allowed("first"), false);
  assert.equal(await allowed("preview", true), false);
  assert.equal(await allowed("preview", false, null), false);
  assert.equal(await progress.changeLessonCompletion(ids.preview, viewer), null);
});

test("waitlisted and paused enrolments cannot complete lessons", async () => {
  await client.query("insert into enrollments(profile_id,email,full_name,level_id,status) values($1,$2,'Verification',$3,'waitlist')", [viewer.profileId, key + "@example.invalid", levelId]);
  assert.equal(await progress.changeLessonCompletion(ids.preview, viewer), null);
  await client.query("update enrollments set status='paused' where profile_id=$1", [viewer.profileId]);
  assert.equal(await progress.changeLessonCompletion(ids.preview, viewer), null);
  await client.query("update enrollments set status='enrolled' where profile_id=$1", [viewer.profileId]);
});

test("forged completion cannot skip earlier published lessons", async () => {
  assert.equal(await allowed("first"), false);
  assert.equal(await progress.changeLessonCompletion(ids.last, viewer), null);
  assert.equal((await progress.changeLessonCompletion(ids.preview, viewer)).completed, true);
  assert.equal(await allowed("first", true), true);
  assert.equal((await progress.changeLessonCompletion(ids.first, viewer)).completed, true);
  assert.equal(await allowed("last", true), true, "Draft lessons do not block published progression.");
});

test("draft lessons and draft or archived parent courses remain inaccessible", async () => {
  assert.equal(await allowed("draft"), false);
  assert.equal(await progress.changeLessonCompletion(ids.draft, viewer), null);
  for (const status of ["draft", "archived"]) {
    await client.query("update courses set status=$1 where id=$2", [status, courseId]);
    assert.equal(await allowed("preview"), false);
    assert.equal(await progress.changeLessonCompletion(ids.last, viewer), null);
  }
  await client.query("update courses set status='published' where id=$1", [courseId]);
});

test("concurrent completion toggles serialize without duplicate records or lost updates", async () => {
  const results = await Promise.all([progress.changeLessonCompletion(ids.last, viewer), progress.changeLessonCompletion(ids.last, viewer)]);
  assert.deepEqual(results.map((row) => row.completed).sort(), [false, true]);
  const rows = (await client.query("select status from lesson_progress where profile_id=$1 and lesson_id=$2", [viewer.profileId, ids.last])).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].status, "in_progress");
});

test("revoking enrolment blocks previously unlocked lessons and further progress writes", async () => {
  await client.query("update enrollments set status='paused' where profile_id=$1", [viewer.profileId]);
  assert.equal(await allowed("first"), false);
  assert.equal(await progress.changeLessonCompletion(ids.last, viewer), null);
  assert.equal((await client.query("select status from lesson_progress where profile_id=$1 and lesson_id=$2", [viewer.profileId, ids.last])).rows[0].status, "in_progress");
});

test("assessment access requires published, consistent course scope and enrolment", async () => {
  const assessmentId = (await client.query("insert into assessments(level_id,course_id,module_id,title) values($1,$2,$3,'Assessment access fixture') returning id", [levelId, courseId, moduleId])).rows[0].id;
  const readable = async () => (await database.select({ id: schema.assessments.id }).from(schema.assessments).where(and(eq(schema.assessments.id, assessmentId), policy.assessmentReadable(viewer)))).length > 0;
  assert.equal(await readable(), false, "Paused enrolment cannot access assessment questions.");
  await client.query("update enrollments set status='enrolled' where profile_id=$1", [viewer.profileId]);
  assert.equal(await readable(), true);
  await client.query("update assessments set status='draft' where id=$1", [assessmentId]);
  assert.equal(await readable(), false);
  await client.query("update assessments set status='published' where id=$1", [assessmentId]);
  await client.query("update courses set status='draft' where id=$1", [courseId]);
  assert.equal(await readable(), false);
  await client.query("update courses set status='published' where id=$1", [courseId]);
  await client.query("update assessments set course_id=null where id=$1", [assessmentId]);
  assert.equal(await readable(), false, "A module cannot be accessed through an unrelated or absent parent course.");
});

after(async () => {
  if (client) {
    if (userId) { await client.query("delete from activity_logs where actor_id=$1", [viewer.profileId]); await client.query("delete from learning_events where profile_id=$1", [viewer.profileId]); await client.query("delete from enrollments where profile_id=$1", [viewer.profileId]); await client.query("delete from users where id=$1", [userId]); }
    if (courseId) await client.query("delete from courses where id=$1", [courseId]);
    await client.end();
  }
  if (appPool) await appPool.end();
});
