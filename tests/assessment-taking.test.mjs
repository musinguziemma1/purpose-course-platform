import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import dotenv from "dotenv";

let client, taking, awards, appPool, levelId, active, secondSession;
const users = [], key = randomUUID(), actors = {}, ids = {}, questions = {};
const selections = (name) => questions[name].map((question) => ({ questionId: question.id, selectedIndex: 0 }));
const complete = (name, sessionId, actor = actors.learner, answers = selections(name)) => taking.completeAssessment({ assessmentId: ids[name], sessionId, selections: answers }, actor);
async function done(name) { await client.query("insert into lesson_progress(profile_id,lesson_id,status,completed_at) values($1,$2,'completed',now()) on conflict(profile_id,lesson_id) do update set status='completed',completed_at=now()", [actors.learner.profileId, ids[name]]); }

before(async () => {
  const env = dotenv.parse(readFileSync(".env")), uri = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(uri.hostname) && uri.port === "54329", "Assessment fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  taking = await import("../src/db/assessment-taking.ts"); awards = await import("../src/db/certificate-awards.ts"); appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  for (const name of ["learner", "other"]) {
    const userId = (await client.query("insert into users(email,password_hash) values($1,'unused') returning id", [`${key}-${name}@example.invalid`])).rows[0].id; users.push(userId);
    const profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug='student' returning id", [userId, name, `${key}-${name}`])).rows[0].id;
    actors[name] = { profileId, fullName: name, roleSlug: "student", permissions: [] };
  }
  levelId = (await client.query("insert into course_levels(slug,name,level_number,tagline,description) values($1,'Assessment fixture',99,'Fixture','Fixture') returning id", [key])).rows[0].id;
  for (const name of ["courseA", "courseB"]) ids[name] = (await client.query("insert into courses(level_id,slug,title) values($1,$2,$3) returning id", [levelId, `${key}-${name}`, name])).rows[0].id;
  for (const [name, course] of [["moduleA", "courseA"], ["moduleA2", "courseA"], ["moduleB", "courseB"]]) {
    ids[name] = (await client.query("insert into course_modules(course_id,slug,title) values($1,$2,$3) returning id", [ids[course], `${key}-${name}`, name])).rows[0].id;
    ids[name + "Lesson"] = (await client.query("insert into lessons(module_id,slug,title,body) values($1,$2,$3,'Published teaching content') returning id", [ids[name], key, name])).rows[0].id;
  }
  for (const [name, course, module, kind, max] of [["quizA", "courseA", "moduleA", "session", 2], ["quizA2", "courseA", "moduleA2", "session", 2], ["quizB", "courseB", "moduleB", "session", 2], ["exam", null, null, "level", 1]]) {
    ids[name] = (await client.query("insert into assessments(level_id,course_id,module_id,title,kind,max_attempts,time_limit_minutes) values($1,$2,$3,$4,$5,$6,1) returning id", [levelId, course ? ids[course] : null, module ? ids[module] : null, name, kind, max])).rows[0].id;
    questions[name] = [];
    for (let index = 0; index < 2; index++) questions[name].push((await client.query("insert into assessment_questions(assessment_id,prompt,options,correct_index,explanation,sort_order) values($1,$2,'[\"Correct\",\"Incorrect\"]',0,'Snapshot explanation',$3) returning *", [ids[name], `${key} ${name} question ${index}`, index])).rows[0]);
  }
  await client.query("insert into enrollments(profile_id,email,full_name,level_id,status) values($1,$2,'Fixture',$3,'enrolled')", [actors.learner.profileId, key + "@example.invalid", levelId]);
});

test("assessment start enforces enrolment, publication and lesson prerequisites", async () => {
  assert.match((await taking.beginAssessment(ids.quizA, actors.other)).error, /enrolment/);
  assert.match((await taking.beginAssessment(ids.quizA, actors.learner)).error, /Complete/);
  await done("moduleALesson");
  await client.query("update assessments set status='draft' where id=$1", [ids.quizA]);
  assert.match((await taking.beginAssessment(ids.quizA, actors.learner)).error, /not available/);
  await client.query("update assessments set status='published' where id=$1", [ids.quizA]);
});

test("concurrent starts resume one reserved timed session without exposing correct answers", async () => {
  const starts = await Promise.all([taking.beginAssessment(ids.quizA, actors.learner), taking.beginAssessment(ids.quizA, actors.learner)]);
  assert.ok(starts.every((result) => result.ok)); assert.equal(starts[0].sessionId, starts[1].sessionId); active = starts[0].sessionId;
  assert.equal(starts[0].attemptsUsed, 1); assert.equal(Date.parse(starts[0].expiresAt) - Date.parse(starts[0].serverTime), 60000);
  assert.ok(starts[0].questions.every((question) => !('correctIndex' in question) && !('explanation' in question)));
});

test("session ownership and complete valid selections are checked before writes", async () => {
  assert.ok((await complete("quizA", active, actors.other)).error);
  assert.ok((await complete("quizA", active, actors.learner, [selections("quizA")[0], selections("quizA")[0]])).error);
  assert.ok((await complete("quizA", active, actors.learner, [{ questionId: questions.quizA[0].id, selectedIndex: 99 }, selections("quizA")[1]])).error);
  assert.equal((await client.query("select count(*)::int as count from assessment_attempts where profile_id=$1", [actors.learner.profileId])).rows[0].count, 0);
});

test("grading uses the started question snapshot and concurrent retries store one result", async () => {
  await client.query("update assessment_questions set correct_index=1,explanation='Changed after start' where assessment_id=$1", [ids.quizA]);
  const results = await Promise.all([complete("quizA", active), complete("quizA", active)]);
  assert.ok(results.every((result) => result.ok)); assert.equal(results[0].attempt.id, results[1].attempt.id);
  assert.equal(results[0].attempt.score, 100); assert.equal(results.filter((result) => result.duplicate).length, 1);
  assert.equal((await client.query("select count(*)::int as count from assessment_answers where attempt_id=$1", [results[0].attempt.id])).rows[0].count, 2);
  assert.equal((await client.query("select count(*)::int as count from certificates where profile_id=$1", [actors.learner.profileId])).rows[0].count, 0, "One module quiz cannot certify an unfinished course.");
});

test("expired sessions consume an attempt and the server rejects over-limit starts", async () => {
  const started = await taking.beginAssessment(ids.quizA, actors.learner); assert.ok(started.ok); secondSession = started.sessionId;
  await client.query("update assessment_sessions set started_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' where id=$1", [secondSession]);
  assert.match((await complete("quizA", secondSession)).error, /expired/);
  assert.match((await taking.beginAssessment(ids.quizA, actors.learner)).error, /attempts have been used/);
  assert.equal((await client.query("select count(*)::int as count from assessment_attempts where assessment_id=$1 and profile_id=$2", [ids.quizA, actors.learner.profileId])).rows[0].count, 1);
});

test("a level exam requires all published lessons and required session quizzes", async () => {
  assert.match((await taking.beginAssessment(ids.exam, actors.learner)).error, /Complete/);
  await done("moduleA2Lesson"); await done("moduleBLesson");
  assert.match((await taking.beginAssessment(ids.exam, actors.learner)).error, /Pass the required/);
  const started = await taking.beginAssessment(ids.quizA2, actors.learner); assert.ok(started.ok);
  assert.ok((await complete("quizA2", started.sessionId)).ok);
  const certs = (await client.query("select kind,course_id from certificates where profile_id=$1", [actors.learner.profileId])).rows;
  assert.deepEqual(certs, [{ kind: "course", course_id: ids.courseA }]);
});

test("a late answer persistence failure rolls back the attempt, answers, session and awards", async () => {
  const started = await taking.beginAssessment(ids.quizB, actors.learner); assert.ok(started.ok); ids.quizBSession = started.sessionId;
  await client.query("delete from assessment_questions where id=$1", [questions.quizB[1].id]);
  await assert.rejects(complete("quizB", started.sessionId));
  assert.equal((await client.query("select count(*)::int as count from assessment_attempts where assessment_id=$1", [ids.quizB])).rows[0].count, 0);
  assert.equal((await client.query("select status from assessment_sessions where id=$1", [started.sessionId])).rows[0].status, "in_progress");
  assert.equal((await client.query("select count(*)::int as count from certificates where profile_id=$1 and course_id=$2", [actors.learner.profileId, ids.courseB])).rows[0].count, 0);
  const q = questions.quizB[1];
  await client.query("insert into assessment_questions(id,assessment_id,prompt,options,correct_index,explanation,sort_order) values($1,$2,$3,$4::jsonb,$5,$6,$7)", [q.id, q.assessment_id, q.prompt, JSON.stringify(q.options), q.correct_index, q.explanation, q.sort_order]);
});

test("separate courses in one level and the final level award retain distinct certificate scopes", async () => {
  const result = await complete("quizB", ids.quizBSession); assert.ok(result.ok);
  const started = await taking.beginAssessment(ids.exam, actors.learner); assert.ok(started.ok);
  assert.ok((await complete("exam", started.sessionId)).ok);
  const certs = (await client.query("select kind,course_id,level_id from certificates where profile_id=$1 order by kind,course_id", [actors.learner.profileId])).rows;
  assert.deepEqual(certs, [{ kind: "course", course_id: ids.courseA, level_id: levelId }, { kind: "course", course_id: ids.courseB, level_id: levelId }, { kind: "level", course_id: null, level_id: levelId }]);
  assert.equal((await awards.synchronizeCertificates(actors.learner.profileId)).newlyIssued.length, 0);
});

test("revoked awards are not silently reissued", async () => {
  await client.query("update certificates set revoked_at=now() where profile_id=$1 and kind='course' and course_id=$2", [actors.learner.profileId, ids.courseA]);
  const result = await awards.synchronizeCertificates(actors.learner.profileId);
  assert.ok(!result.awards.some((award) => award.kind === "course" && award.courseId === ids.courseA));
  assert.equal((await client.query("select count(*)::int as count from certificates where profile_id=$1", [actors.learner.profileId])).rows[0].count, 3);
});

after(async () => {
  if (client) {
    if (users.length) {
      await client.query("delete from activity_logs where actor_id in (select id from profiles where user_id=any($1::uuid[]))", [users]);
      await client.query("delete from learning_events where profile_id in (select id from profiles where user_id=any($1::uuid[]))", [users]);
      await client.query("delete from enrollments where profile_id in (select id from profiles where user_id=any($1::uuid[]))", [users]);
      await client.query("delete from users where id=any($1::uuid[])", [users]);
    }
    if (levelId) await client.query("delete from course_levels where id=$1", [levelId]);
    await client.end();
  }
  if (appPool) await appPool.end();
});
