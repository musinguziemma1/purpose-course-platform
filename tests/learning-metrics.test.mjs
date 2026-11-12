import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const key = randomUUID(),
  actors = {},
  ids = {},
  userIds = [];
let client, metrics, pool;
const report = () => metrics.getLearningReport(actors.admin, ids.cohort);
const email = (name) => `${key}-${name}@example.invalid`;
const questions = (version) => [
  {
    id: 1,
    prompt: `Question ${version}`,
    options: ["Yes", "No"],
    correctIndex: 0,
    explanation: null,
  },
];
async function attempt(
  actor,
  assessment,
  score,
  { version = 1, passMark = 80, status = "submitted", age = 1 } = {},
) {
  const item = (
    await client.query(
      "insert into assessment_attempts(profile_id,assessment_id,score,passed,status,pass_mark,total_count,submitted_at)values($1,$2,$3::int,$3::int>=$4::int,$5,$4::int,10,now()-($6::int*interval '1 hour'))returning *",
      [actor.profileId, assessment, score, passMark, status, age],
    )
  ).rows[0];
  await client.query(
    "insert into assessment_sessions(profile_id,assessment_id,status,questions,pass_mark,started_at,expires_at,attempt_id,submitted_at)values($1,$2,'submitted',$3,$4,$5::timestamptz-interval '10 minutes',$5::timestamptz+interval '10 minutes',$6,$5)",
    [
      actor.profileId,
      assessment,
      JSON.stringify(questions(version)),
      passMark,
      item.submitted_at,
      item.id,
    ],
  );
}

before(async () => {
  const env = dotenv.parse(readFileSync(".env")),
    uri = new URL(env.DATABASE_URL);
  assert.ok(
    uri.hostname === "127.0.0.1" && uri.port === "54329",
    "Learning metrics fixtures require project-local PostgreSQL.",
  );
  process.env.DATABASE_URL = env.DATABASE_URL;
  metrics = await import("../src/db/learning-metrics.ts");
  pool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  for (const [name, slug, active] of [
    ["admin", "super_admin", true],
    ["mentor", "mentor", true],
    ["editor", "editor", true],
    ["a", "student", true],
    ["b", "student", true],
    ["other", "student", true],
    ["waiting", "student", true],
    ["inactive", "student", false],
    ["staff", "platform_admin", true],
  ]) {
    const userId = (
      await client.query(
        "insert into users(email,password_hash,is_active)values($1,'unused',$2)returning id",
        [email(name), active],
      )
    ).rows[0].id;
    userIds.push(userId);
    const profileId = (
      await client.query(
        "insert into profiles(user_id,role_id,full_name,slug)select $1,id,$2,$2 from roles where slug=$3 returning id",
        [userId, `${key}-${name}`, slug],
      )
    ).rows[0].id;
    actors[name] = {
      profileId,
      userId,
      roleSlug: slug,
      fullName: name,
      permissions: [],
    };
  }
  ids.level = (
    await client.query(
      "insert into course_levels(slug,name,level_number,tagline,description)values($1,'Metrics fixture',99,'Fixture','Fixture')returning id",
      [key],
    )
  ).rows[0].id;
  for (const name of ["first", "second", "draft"]) {
    ids[name] = (
      await client.query(
        "insert into courses(level_id,slug,title,status)values($1,$2,$2,$3)returning id",
        [ids.level, `${key}-${name}`, name === "draft" ? "draft" : "published"],
      )
    ).rows[0].id;
    ids[name + "Module"] = (
      await client.query(
        "insert into course_modules(course_id,slug,title)values($1,$2,$2)returning id",
        [ids[name], key],
      )
    ).rows[0].id;
  }
  for (const [name, module, status] of [
    ["done", "first", "published"],
    ["unstarted", "first", "published"],
    ["draftLesson", "first", "draft"],
    ["secondLesson", "second", "published"],
    ["draftCourseLesson", "draft", "published"],
  ])
    ids[name] = (
      await client.query(
        "insert into lessons(module_id,slug,title,status)values($1,$2,$2,$3)returning id",
        [ids[module + "Module"], name, status],
      )
    ).rows[0].id;
  for (const name of ["a", "b", "other", "waiting", "inactive", "staff"])
    await client.query(
      "insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,$2,$3,$4)",
      [
        actors[name].profileId,
        email(name),
        ids.level,
        name === "waiting" ? "waitlist" : "enrolled",
      ],
    );
  await client.query(
    "insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,'Duplicate alias fixture',$3,'completed')",
    [actors.a.profileId, email("alias"), ids.level],
  );
  for (const name of ["a", "inactive", "staff"])
    for (const lesson of ["done", "draftLesson", "draftCourseLesson"])
      await client.query(
        "insert into lesson_progress(profile_id,lesson_id,status)values($1,$2,'completed')",
        [actors[name].profileId, ids[lesson]],
      );
  ids.cohort = (
    await client.query(
      "insert into cohorts(slug,name,level_id,description,status,starts_at,ends_at)values($1,$1,$2,'Fixture','active',now()-interval '1 day',now()+interval '30 days')returning id",
      [key, ids.level],
    )
  ).rows[0].id;
  ids.otherCohort = (
    await client.query(
      "insert into cohorts(slug,name,level_id,course_id,description,status,starts_at,ends_at)values($1,$1,$2,$3,'Fixture','active',now(),now()+interval '30 days')returning id",
      [key + "-other", ids.level, ids.first],
    )
  ).rows[0].id;
  for (const name of ["a", "b", "waiting", "inactive", "staff"])
    await client.query(
      "insert into cohort_members(cohort_id,profile_id)values($1,$2)",
      [ids.cohort, actors[name].profileId],
    );
  await client.query(
    "insert into cohort_members(cohort_id,profile_id)values($1,$2)",
    [ids.otherCohort, actors.other.profileId],
  );
  await client.query(
    "insert into cohort_members(cohort_id,profile_id,status)values($1,$2,'inactive')",
    [ids.otherCohort, actors.a.profileId],
  );
  ids.quiz = (
    await client.query(
      "insert into assessments(level_id,course_id,title)values($1,$2,'Comparable fixture')returning id",
      [ids.level, ids.first],
    )
  ).rows[0].id;
  ids.otherQuiz = (
    await client.query(
      "insert into assessments(level_id,course_id,title)values($1,$2,'Different fixture')returning id",
      [ids.level, ids.first],
    )
  ).rows[0].id;
});

test("learning reports enforce active current analytics permission and per-learner assignment scope", async () => {
  for (const actor of [
    null,
    actors.a,
    actors.editor,
    { ...actors.admin, isDemo: true },
  ])
    assert.equal(await metrics.getLearningReport(actor, ids.cohort), null);
  assert.equal(
    (
      await metrics.getLearnerMetrics(actors.a, [
        actors.a.profileId,
        actors.b.profileId,
      ])
    ).length,
    1,
  );
  assert.equal(
    (await metrics.getLearnerMetrics(actors.mentor, [actors.a.profileId]))
      .length,
    0,
  );
  await client.query(
    "insert into mentor_assignments(mentor_id,student_id)values($1,$2)",
    [actors.mentor.profileId, actors.a.profileId],
  );
  assert.equal(
    (
      await metrics.getLearnerMetrics(actors.mentor, [
        actors.a.profileId,
        actors.b.profileId,
      ])
    ).length,
    1,
  );
  await client.query(
    "update mentor_assignments set status='inactive' where mentor_id=$1",
    [actors.mentor.profileId],
  );
  assert.equal(
    (await metrics.getLearnerMetrics(actors.mentor, [actors.a.profileId]))
      .length,
    0,
  );
  await client.query(
    "update profiles set role_id=(select id from roles where slug='student') where id=$1",
    [actors.admin.profileId],
  );
  try {
    assert.equal(await report(), null);
  } finally {
    await client.query(
      "update profiles set role_id=(select id from roles where slug='super_admin') where id=$1",
      [actors.admin.profileId],
    );
  }
  await client.query("update users set is_active=false where id=$1", [
    actors.admin.userId,
  ]);
  try {
    assert.equal(await report(), null);
  } finally {
    await client.query("update users set is_active=true where id=$1", [
      actors.admin.userId,
    ]);
  }
});

test("published lesson opportunities include unstarted learners without duplicate enrolments or staff", async () => {
  const value = await report();
  assert.equal(value.summary.learners, 3);
  assert.equal(value.summary.opportunities, 6);
  assert.equal(value.summary.completed, 1);
  assert.equal(value.summary.coursePairs, 4);
  const course = value.courses.find((entry) => entry.id === ids.first);
  assert.equal(course.learners, 2);
  assert.equal(course.total, 4);
  assert.equal(course.completed, 1);
  assert.ok(!value.courses.some((entry) => entry.id === ids.draft));
  const individual = (
    await metrics.getLearnerMetrics(actors.a, [actors.a.profileId])
  )[0];
  assert.equal(individual.lessonsTotal, 3);
  assert.equal(individual.lessonsCompleted, 1);
  assert.equal(individual.email, email("a"));
  assert.equal(individual.modules.length, 2);
  assert.equal(individual.levelName, "Metrics fixture");
  assert.ok(value.courses.every((entry) => entry.completed <= entry.total));
});

test("cohort reports use actual active memberships and the cohort's assigned course", async () => {
  const value = await metrics.getLearningReport(actors.admin, ids.otherCohort);
  assert.equal(value.summary.learners, 1);
  assert.equal(value.summary.opportunities, 2);
  assert.equal(value.courses.length, 1);
  assert.equal(value.courses[0].id, ids.first);
  assert.equal(await metrics.getLearningReport(actors.admin, -1), null);
  assert.equal(await metrics.getLearningReport(actors.admin, 2147483647), null);
});

test("assessment improvement compares one learner, assessment, stored question set and pass mark", async () => {
  await attempt(actors.a, ids.quiz, 40, { age: 72 });
  await attempt(actors.a, ids.quiz, 80, { age: 48 });
  await attempt(actors.a, ids.otherQuiz, 100, { age: 24 });
  await attempt(actors.a, ids.quiz, 90, { version: 2, age: 3 });
  await attempt(actors.a, ids.quiz, 100, { passMark: 90, age: 2 });
  await attempt(actors.a, ids.quiz, 100, { status: "void" });
  await attempt(actors.b, ids.quiz, 60);
  await attempt(actors.other, ids.quiz, 100);
  await attempt(actors.inactive, ids.quiz, 100);
  await attempt(actors.staff, ids.quiz, 100);
  await attempt(actors.a, ids.quiz, 100, { age: -24 });
  const value = await report();
  assert.equal(value.summary.attempts, 6);
  assert.equal(value.summary.passed, 4);
  assert.equal(value.summary.average, 78);
  assert.equal(value.summary.improvement, 40);
  assert.equal(value.summary.comparisons, 1);
  const individual = (
    await metrics.getLearnerMetrics(actors.a, [actors.a.profileId])
  )[0];
  assert.equal(individual.attempts.length, 5);
  assert.equal(individual.improvement, 40);
});

test("revoked certificates, cancelled goals and inactive mentor assignments are excluded", async () => {
  await client.query(
    "insert into certificates(code,profile_id,kind,course_id,level_id,title)values($1,$2,'course',$3,$4,'Fixture')",
    [key + "-a", actors.a.profileId, ids.first, ids.level],
  );
  await client.query(
    "insert into certificates(code,profile_id,kind,course_id,level_id,title,revoked_at)values($1,$2,'course',$3,$4,'Fixture',now())",
    [
      key.replaceAll("-", "") + "-revoked",
      actors.a.profileId,
      ids.second,
      ids.level,
    ],
  );
  await client.query(
    "insert into certificates(code,profile_id,kind,level_id,title)values($1,$2,'level',$3,'Fixture')",
    [key + "-b", actors.b.profileId, ids.level],
  );
  for (const [name, status] of [
    ["a", "achieved"],
    ["b", "active"],
    ["waiting", "cancelled"],
    ["inactive", "achieved"],
    ["other", "achieved"],
  ])
    await client.query(
      "insert into learner_goals(student_id,title,status)values($1,'Fixture',$2)",
      [actors[name].profileId, status],
    );
  await client.query(
    "update mentor_assignments set status='active' where mentor_id=$1",
    [actors.mentor.profileId],
  );
  const value = await report();
  assert.equal(value.summary.certificates, 2);
  assert.equal(value.summary.courseAwards, 1);
  assert.equal(value.summary.goals, 2);
  assert.equal(value.summary.achievedGoals, 1);
  assert.equal(value.summary.mentors, 1);
  const individual = (
    await metrics.getLearnerMetrics(actors.a, [actors.a.profileId])
  )[0];
  assert.equal(individual.certificates, 1);
});

test("engagement uses real recorded events, Kampala dates and zero-filled periods", async () => {
  const yesterday = (
    await client.query(
      "select to_char((now() at time zone 'Africa/Kampala')::date-1,'YYYY-MM-DD') as date",
    )
  ).rows[0].date;
  for (const type of ["lesson_completed", "assessment_started"])
    await client.query(
      "insert into learning_events(profile_id,event_type,course_id,occurred_at)values($1,$2,$3,($4::date::timestamp at time zone 'Africa/Kampala')+interval '15 minutes')",
      [actors.a.profileId, type, ids.first, yesterday],
    );
  await client.query(
    "insert into learning_events(profile_id,event_type,course_id)values($1,'assessment_submitted',$2)",
    [actors.b.profileId, ids.first],
  );
  for (const name of ["inactive", "staff", "other"])
    await client.query(
      "insert into learning_events(profile_id,event_type,course_id)values($1,'lesson_completed',$2)",
      [actors[name].profileId, ids.first],
    );
  await client.query(
    "insert into learning_events(profile_id,event_type,course_id,metadata,duration_seconds)values($1,'lesson_completed',$2,'{\"source\":\"seed\"}',999999)",
    [actors.a.profileId, ids.first],
  );
  await client.query(
    "insert into learning_events(profile_id,event_type,course_id,occurred_at)values($1,'lesson_completed',$2,now()+interval '1 day')",
    [actors.a.profileId, ids.first],
  );
  await client.query(
    "insert into engagement(snapshot_date,profile_id,minutes_learned,lessons_completed)values($1,$2,99999,99999)",
    [yesterday, actors.a.profileId],
  );
  const value = await report();
  assert.equal(value.daily.length, 14);
  assert.equal(value.weekly.length, 8);
  const day = value.daily.find((entry) => entry.date === yesterday);
  assert.equal(day.actions, 2);
  assert.equal(day.active, 1);
  assert.equal(
    value.daily.reduce((sum, entry) => sum + entry.actions, 0),
    3,
  );
  assert.equal(value.summary.activeLearners, 2);
  assert.ok(value.daily.some((entry) => entry.actions === 0));
  assert.equal(value.summary.completed, 1);
});

after(async () => {
  if (client) {
    const profiles = Object.values(actors).map((actor) => actor.profileId);
    await client.query("delete from learning_events where profile_id=any($1::uuid[])", [profiles]);
    await client.query(
      "delete from enrollments where profile_id=any($1::uuid[])",
      [profiles],
    );
    await client.query("delete from cohorts where id=any($1::int[])", [
      [ids.cohort, ids.otherCohort].filter(Boolean),
    ]);
    if (ids.level)
      await client.query("delete from course_levels where id=$1", [ids.level]);
    await client.query("delete from users where id=any($1::uuid[])", [userIds]);
    await client.end();
  }
  await pool?.end();
});
