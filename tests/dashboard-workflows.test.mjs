import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
import { verifyPassword } from "../scripts/password-security.mjs";

let client,
  pool,
  profileService,
  assignmentService,
  admissions,
  progression,
  taking;
const key = randomUUID(),
  actors = {},
  userIds = [],
  levelIds = [],
  ids = {};
const body =
  "My evidence-based response explains the practical steps I will apply in my learning and mentoring.";
const profile = {
  fullName: "Workflow Learner",
  title: "Learner",
  bio: "A practice learner completing the account profile for workflow verification.",
  phone: "+1 202 555 0101",
  location: "Test campus",
  timezone: "Africa/Kampala",
  avatarUrl: "",
};
const requestPassword = `Apply-${key}-A1!`;
const rate = (name) =>
  createHash("sha256")
    .update(key + name)
    .digest("hex");
const submission = async () =>
  (
    await client.query(
      "select * from assignment_submissions where assignment_id=$1 and profile_id=$2",
      [ids.assignment, actors.learner.profileId],
    )
  ).rows[0];
const responseInput = async (extra = {}) => ({
  assignmentId: ids.assignment,
  body,
  asDraft: false,
  attachmentId: "",
  version: (await submission())?.updated_at.toISOString() ?? "",
  ...extra,
});
const application = (name, extra = {}) => ({
  email: `${key}-${name}@example.invalid`,
  fullName: "Applicant " + name,
  password: requestPassword,
  notes: "Application verification fixture",
  consent: true,
  website: "",
  ...extra,
});

before(async () => {
  const env = dotenv.parse(readFileSync(".env")),
    uri = new URL(env.DATABASE_URL);
  assert.ok(
    ["127.0.0.1", "localhost"].includes(uri.hostname) && uri.port === "54329",
    "Workflow fixtures require local PostgreSQL.",
  );
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.DATABASE_POOL_MAX = "1";
  profileService = await import("../src/db/profile-settings.ts");
  assignmentService = await import("../src/db/assignment-workflow.ts");
  admissions = await import("../src/db/admissions.ts");
  progression = await import("../src/db/level-progression.ts");
  taking = await import("../src/db/assessment-taking.ts");
  pool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  for (const [name, role] of [
    ["admin", "super_admin"],
    ["mentor", "mentor"],
    ["otherMentor", "mentor"],
    ["learner", "student"],
    ["other", "student"],
  ]) {
    const email = `${key}-${name}@example.invalid`;
    const account = (
      await client.query(
        "insert into users(email,password_hash) values($1,'fixture-unused') returning id",
        [email],
      )
    ).rows[0];
    userIds.push(account.id);
    const record = (
      await client.query(
        "insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id",
        [account.id, name, `${key}-${name}`, role],
      )
    ).rows[0];
    actors[name] = {
      userId: account.id,
      profileId: record.id,
      email,
      fullName: name,
      roleSlug: role,
      permissions: [],
    };
  }
  for (const [index, name] of ["A", "B", "C"].entries()) {
    const level = (
      await client.query(
        "insert into course_levels(slug,name,level_number,tagline,description) values($1,$2,$3,'Fixture','Fixture') returning id",
        [`${key}-${name}`, `Progression ${name}`, 8801 + index],
      )
    ).rows[0];
    levelIds.push(level.id);
    ids[name] = level.id;
    const course = (
      await client.query(
        "insert into courses(level_id,slug,title,status) values($1,$2,$3,'published') returning id",
        [level.id, `${key}-${name}`, `Workflow ${name}`],
      )
    ).rows[0];
    const courseModule = (
      await client.query(
        "insert into course_modules(course_id,slug,title) values($1,$2,'Fixture') returning id",
        [course.id, key],
      )
    ).rows[0];
    ids[`lesson${name}`] = (
      await client.query(
        "insert into lessons(module_id,slug,title,body,status) values($1,$2,'Fixture','Published learning','published') returning id",
        [courseModule.id, key],
      )
    ).rows[0].id;
  }
  for (const name of ["learner", "other"])
    await client.query(
      "insert into enrollments(profile_id,email,full_name,level_id,status) values($1,$2,$3,$4,'enrolled')",
      [actors[name].profileId, actors[name].email, name, ids.A],
    );
  await client.query(
    "insert into mentor_assignments(mentor_id,student_id,status) values($1,$2,'active'),($3,$4,'active')",
    [
      actors.mentor.profileId,
      actors.learner.profileId,
      actors.otherMentor.profileId,
      actors.other.profileId,
    ],
  );
  ids.exam = (
    await client.query(
      "insert into assessments(level_id,title,kind,status,max_attempts,time_limit_minutes) values($1,'Workflow level exam','level','published',3,10) returning id",
      [ids.A],
    )
  ).rows[0].id;
  ids.question = (
    await client.query(
      "insert into assessment_questions(assessment_id,prompt,options,correct_index) values($1,'Choose the correct fixture answer','[\"Correct\",\"Incorrect\"]',0) returning id",
      [ids.exam],
    )
  ).rows[0].id;
});

test("profile completion validates required contact details and never accepts role or user ownership changes", async () => {
  assert.ok(
    (
      await profileService.saveOwnProfile(
        { ...profile, phone: "" },
        actors.learner,
      )
    ).error,
  );
  assert.equal(
    (
      await client.query(
        "select profile_completed_at from profiles where id=$1",
        [actors.learner.profileId],
      )
    ).rows[0].profile_completed_at,
    null,
  );
  assert.ok(
    (
      await profileService.saveOwnProfile(
        { ...profile, timezone: "Not/AZone" },
        actors.learner,
      )
    ).error,
  );
  assert.ok(
    (
      await profileService.saveOwnProfile(
        { ...profile, roleId: 1, userId: actors.admin.userId },
        actors.learner,
      )
    ).ok,
  );
  const row = (
    await client.query(
      "select p.*,r.slug as role from profiles p join roles r on r.id=p.role_id where p.id=$1",
      [actors.learner.profileId],
    )
  ).rows[0];
  assert.equal(row.user_id, actors.learner.userId);
  assert.equal(row.role, "student");
  assert.equal(row.phone, profile.phone);
  assert.ok(row.profile_completed_at);
  assert.equal(
    (
      await client.query("select full_name from profiles where id=$1", [
        actors.admin.profileId,
      ])
    ).rows[0].full_name,
    "admin",
  );
});

test("inactive accounts cannot update profiles and students cannot expose staff library images as their avatar", async () => {
  const mediaId = randomUUID();
  await client.query(
    "insert into media_assets(id,url,kind,purpose,state,file_name) values($1,$2,'image','library','ready',$3)",
    [mediaId, `/api/media/${mediaId}`, key],
  );
  try {
    assert.ok(
      (
        await profileService.saveOwnProfile(
          { ...profile, avatarUrl: `/api/media/${mediaId}` },
          actors.learner,
        )
      ).error,
    );
  } finally {
    await client.query("delete from media_assets where id=$1", [mediaId]);
  }
  await client.query("update users set is_active=false where id=$1", [
    actors.learner.userId,
  ]);
  try {
    assert.ok(
      (await profileService.saveOwnProfile(profile, actors.learner)).error,
    );
  } finally {
    await client.query("update users set is_active=true where id=$1", [
      actors.learner.userId,
    ]);
  }
});

test("mentors can set work only for their active assigned learners, even with forged cached role claims", async () => {
  const input = {
    title: "Evidence and next steps",
    brief: body,
    levelId: ids.A,
    assigneeId: actors.other.profileId,
    dueAt: "",
    attachmentId: "",
  };
  assert.ok(
    (await assignmentService.createLearningAssignment(input, actors.mentor))
      .error,
  );
  assert.ok(
    (
      await assignmentService.createLearningAssignment(input, {
        ...actors.mentor,
        roleSlug: "super_admin",
        permissions: ["academy.oversee"],
      })
    ).error,
  );
  assert.ok(
    (
      await assignmentService.createLearningAssignment(
        { ...input, assigneeId: "" },
        actors.mentor,
      )
    ).error,
  );
  const result = await assignmentService.createLearningAssignment(
    { ...input, assigneeId: actors.learner.profileId },
    actors.mentor,
  );
  assert.ok(result.ok);
  ids.assignment = result.id;
});

test("students cannot submit another learner's assignment and draft work cannot be graded", async () => {
  assert.ok(
    (
      await assignmentService.saveAssignmentResponse(
        await responseInput(),
        actors.other,
      )
    ).error,
  );
  assert.ok(
    (
      await assignmentService.saveAssignmentResponse(
        await responseInput({ asDraft: true }),
        actors.learner,
      )
    ).ok,
  );
  const draft = await submission();
  assert.equal(draft.status, "draft");
  assert.ok(
    (
      await assignmentService.gradeAssignment(
        {
          submissionId: draft.id,
          feedback: body,
          score: 90,
          version: draft.updated_at.toISOString(),
        },
        actors.mentor,
      )
    ).error,
  );
  assert.equal((await submission()).score, null);
});

test("concurrent assignment saves preserve one version and reject stale windows", async () => {
  const input = await responseInput(),
    results = await Promise.all([
      assignmentService.saveAssignmentResponse(input, actors.learner),
      assignmentService.saveAssignmentResponse(
        { ...input, body: body + " Changed." },
        actors.learner,
      ),
    ]);
  assert.equal(results.filter((row) => row.ok).length, 1);
  assert.equal(results.filter((row) => row.error).length, 1);
  assert.equal((await submission()).status, "submitted");
});

test("reviews enforce assigned mentorship, bounded scores, optimistic concurrency and immutable graded work", async () => {
  const record = await submission(),
    input = {
      submissionId: record.id,
      feedback: body,
      score: 0,
      version: record.updated_at.toISOString(),
    };
  assert.ok(
    (await assignmentService.gradeAssignment(input, actors.otherMentor)).error,
  );
  assert.ok(
    (
      await assignmentService.gradeAssignment(
        { ...input, score: 101 },
        actors.mentor,
      )
    ).error,
  );
  assert.ok(
    (
      await assignmentService.gradeAssignment(
        { ...input, score: 50.5 },
        actors.mentor,
      )
    ).error,
  );
  const results = await Promise.all([
    assignmentService.gradeAssignment(input, actors.mentor),
    assignmentService.gradeAssignment({ ...input, score: 100 }, actors.mentor),
  ]);
  assert.equal(results.filter((row) => row.ok).length, 1);
  assert.equal(results.filter((row) => row.error).length, 1);
  const reviewed = await submission();
  assert.equal(reviewed.status, "reviewed");
  assert.ok([0, 100].includes(reviewed.score));
  assert.equal(reviewed.feedback, body);
  assert.ok(
    (
      await assignmentService.saveAssignmentResponse(
        await responseInput(),
        actors.learner,
      )
    ).error,
  );
  assert.equal((await submission()).score, reviewed.score);
});

test("new applications retain only password hashes and cannot sign in before staff approval", async () => {
  assert.ok(
    (await admissions.requestAdmission(application("applicant"), rate("apply")))
      .ok,
  );
  const row = (
    await client.query("select * from admission_requests where email=$1", [
      application("applicant").email,
    ])
  ).rows[0];
  ids.application = row.id;
  assert.equal(row.status, "pending");
  assert.notEqual(row.password_hash, requestPassword);
  assert.ok(verifyPassword(requestPassword, row.password_hash));
  assert.equal(
    (await client.query("select id from users where email=$1", [row.email]))
      .rowCount,
    0,
  );
  assert.ok(
    (
      await admissions.requestAdmission(
        application("applicant", { password: "Replacement-Password-123!" }),
        rate("apply"),
      )
    ).ok,
  );
  assert.equal(
    (
      await client.query(
        "select password_hash from admission_requests where id=$1",
        [row.id],
      )
    ).rows[0].password_hash,
    row.password_hash,
  );
});

test("approval requires current staff authority, creates only a Student, and is atomic under concurrent decisions", async () => {
  assert.ok(
    (
      await admissions.reviewAdmission(ids.application, "approve", {
        ...actors.learner,
        roleSlug: "super_admin",
      })
    ).error,
  );
  assert.ok(
    (
      await admissions.reviewAdmission(
        ids.application,
        "approve",
        actors.mentor,
      )
    ).error,
  );
  const results = await Promise.all([
    admissions.reviewAdmission(ids.application, "approve", actors.admin),
    admissions.reviewAdmission(ids.application, "approve", actors.admin),
  ]);
  assert.equal(results.filter((row) => row.ok).length, 1);
  const row = (
    await client.query(
      "select u.id,u.password_hash,r.slug,p.id as profile_id from users u join profiles p on p.user_id=u.id join roles r on r.id=p.role_id where u.email=$1",
      [application("applicant").email],
    )
  ).rows[0];
  assert.equal(row.slug, "student");
  assert.ok(verifyPassword(requestPassword, row.password_hash));
  assert.equal(
    (
      await client.query(
        "select password_hash from admission_requests where id=$1",
        [ids.application],
      )
    ).rows[0].password_hash,
    null,
  );
  const enrollment = (
    await client.query(
      "select e.status,l.level_number from enrollments e join course_levels l on l.id=e.level_id where e.profile_id=$1",
      [row.profile_id],
    )
  ).rows[0];
  assert.equal(enrollment.status, "enrolled");
  assert.equal(enrollment.level_number, 1);
});

test("declined, invalid, consent-free and rate-limited requests never create active users", async () => {
  assert.ok(
    (
      await admissions.requestAdmission(
        application("no-consent", { consent: false }),
        rate("invalid"),
      )
    ).error,
  );
  assert.ok(
    (
      await admissions.requestAdmission(
        application("short", { password: "short" }),
        rate("invalid"),
      )
    ).error,
  );
  assert.ok(
    (
      await admissions.requestAdmission(
        application("declined"),
        rate("declined"),
      )
    ).ok,
  );
  const row = (
    await client.query("select id from admission_requests where email=$1", [
      application("declined").email,
    ])
  ).rows[0];
  assert.ok(
    (await admissions.reviewAdmission(row.id, "decline", actors.admin)).ok,
  );
  assert.equal(
    (
      await client.query("select id from users where email=$1", [
        application("declined").email,
      ])
    ).rowCount,
    0,
  );
  for (let i = 0; i < 5; i++)
    assert.ok(
      (
        await admissions.requestAdmission(
          application(`limited-${i}`),
          rate("limited"),
        )
      ).ok,
    );
  assert.ok(
    (
      await admissions.requestAdmission(
        application("limited-6"),
        rate("limited"),
      )
    ).error,
  );
});

test("next-level enrolment rejects skipping and failed examinations", async () => {
  assert.ok((await progression.enrollInNextLevel(ids.B, actors.learner)).error);
  await client.query(
    "insert into lesson_progress(profile_id,lesson_id,status,completed_at) values($1,$2,'completed',now())",
    [actors.learner.profileId, ids.lessonA],
  );
  const started = await taking.beginAssessment(ids.exam, actors.learner);
  assert.ok(started.ok);
  const result = await taking.completeAssessment(
    {
      assessmentId: ids.exam,
      sessionId: started.sessionId,
      selections: [{ questionId: ids.question, selectedIndex: 1 }],
    },
    actors.learner,
  );
  assert.equal(result.attempt.passed, false);
  assert.ok((await progression.enrollInNextLevel(ids.B, actors.learner)).error);
});

test("passing the level exam completes the current enrolment and enables one concurrent next-level enrolment", async () => {
  const started = await taking.beginAssessment(ids.exam, actors.learner);
  assert.ok(started.ok);
  const result = await taking.completeAssessment(
    {
      assessmentId: ids.exam,
      sessionId: started.sessionId,
      selections: [{ questionId: ids.question, selectedIndex: 0 }],
    },
    actors.learner,
  );
  assert.ok(result.ok);
  assert.equal(result.attempt.passed, true);
  assert.ok(result.certificate);
  assert.equal(
    (
      await client.query(
        "select status from enrollments where profile_id=$1 and level_id=$2",
        [actors.learner.profileId, ids.A],
      )
    ).rows[0].status,
    "completed",
  );
  assert.ok((await progression.enrollInNextLevel(ids.C, actors.learner)).error);
  const results = await Promise.all([
    progression.enrollInNextLevel(ids.B, actors.learner),
    progression.enrollInNextLevel(ids.B, actors.learner),
  ]);
  assert.ok(results.every((row) => row.ok));
  assert.equal(
    (
      await client.query(
        "select * from enrollments where profile_id=$1 and level_id=$2",
        [actors.learner.profileId, ids.B],
      )
    ).rowCount,
    1,
  );
  const state = await progression.getLevelProgression(actors.learner);
  assert.equal(
    state.find((row) => row.id === ids.B).enrollmentStatus,
    "enrolled",
  );
});

test("paused admission and revoked level awards cannot be bypassed by self enrolment", async () => {
  await client.query(
    "update enrollments set status='paused' where profile_id=$1 and level_id=$2",
    [actors.learner.profileId, ids.B],
  );
  assert.ok((await progression.enrollInNextLevel(ids.B, actors.learner)).error);
  await client.query(
    "update enrollments set status='waitlist' where profile_id=$1 and level_id=$2",
    [actors.learner.profileId, ids.B],
  );
  await client.query(
    "update certificates set revoked_at=now() where profile_id=$1 and level_id=$2 and kind='level'",
    [actors.learner.profileId, ids.A],
  );
  assert.ok((await progression.enrollInNextLevel(ids.B, actors.learner)).error);
});

after(async () => {
  if (client) {
    const requests = (
      await client.query(
        "select id from admission_requests where email like $1",
        [key + "%"],
      )
    ).rows.map((row) => row.id);
    for (const id of requests) {
      await client.query("delete from notifications where href=$1", [
        `/admin/admissions?application=${id}`,
      ]);
      await client.query(
        "delete from activity_logs where entity_type='admission_request' and entity_id=$1",
        [id],
      );
    }
    await client.query(
      "delete from activity_logs where actor_id in (select p.id from profiles p join users u on u.id=p.user_id where u.email like $1)",
      [key + "%"],
    );
    await client.query("delete from admission_requests where email like $1", [
      key + "%",
    ]);
    await client.query("delete from enrollments where email like $1", [
      key + "%",
    ]);
    await client.query("delete from users where email like $1", [key + "%"]);
    await client.query("delete from course_levels where id=any($1::int[])", [
      levelIds,
    ]);
    await client.end();
  }
  await pool?.end();
});
