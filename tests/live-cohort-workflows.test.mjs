import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";
let client, pool, live, cohort, db, access;
const key = randomUUID(),
  actors = {},
  ids = { users: [], levels: [], cohorts: [] };
const future = (days = 3, hours = 0) =>
  new Date(Date.now() + days * 86400000 + hours * 3600000).toISOString();
const sessionInput = (extra = {}) => ({
  scheduleKey: randomUUID(),
  title: key + " Live teaching",
  description:
    "A planned live teaching session for scoped workflow verification.",
  agenda: "Protected preparation and teaching agenda.",
  type: "class",
  startsAt: future(),
  timezone: "Africa/Kampala",
  durationMinutes: 60,
  hostId: actors.mentor.profileId,
  courseId: null,
  cohortId: null,
  meetingUrl: "https://meet.example.invalid/private-room",
  isPublic: true,
  ...extra,
});
async function row(table, id) {
  return (await client.query("select * from " + table + " where id=$1", [id]))
    .rows[0];
}
async function setupCohort(name, capacity = 1) {
  const result = await cohort.saveCohortSetup(
    {
      name: key + " " + name,
      description:
        "A cohort with explicit dates and capacity for verified learner placement.",
      levelId: ids.levelA,
      courseId: null,
      capacity,
      startsAt: future(1),
      endsAt: future(14),
      cadence: "Weekly",
      status: "active",
      weeks: "Identity | Identity\nPractice | Potential",
    },
    actors.admin,
  );
  assert.equal(result.ok, true, result.error);
  ids.cohorts.push(result.id);
  return result.id;
}
async function enrolInput(id, extra = {}) {
  const current = await row("enrollments", id);
  return {
    id,
    version: current.updated_at.toISOString(),
    status: current.status,
    cohortId: current.cohort_id,
    notes: current.notes ?? "",
    ...extra,
  };
}
before(async () => {
  const env = dotenv.parse(readFileSync(".env")),
    target = new URL(env.DATABASE_URL);
  assert.ok(
    ["127.0.0.1", "localhost"].includes(target.hostname) &&
      target.port === "54329",
    "Only a local test database is permitted",
  );
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.DATABASE_POOL_MAX = "1";
  live = await import("../src/db/live-events.ts");
  cohort = await import("../src/db/cohort-enrolments.ts");
  ({ db, pool } = await import("../src/db/index.ts"));
  access = await import("../src/db/learning-access.ts");
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  for (const [name, role] of [
    ["admin", "super_admin"],
    ["mentor", "mentor"],
    ["otherMentor", "mentor"],
    ["student", "student"],
    ["otherStudent", "student"],
    ["guest", "guest"],
    ["inactiveStudent", "student"],
  ]) {
    const email = key + "-" + name + "@example.invalid",
      user = (
        await client.query(
          "insert into users(email,password_hash)values($1,'fixture-no-login')returning id",
          [email],
        )
      ).rows[0],
      profile = (
        await client.query(
          "insert into profiles(user_id,role_id,full_name,slug)select $1,id,$2,$3 from roles where slug=$4 returning id",
          [user.id, key + " " + name, key + "-" + name, role],
        )
      ).rows[0];
    ids.users.push(user.id);
    actors[name] = {
      profileId: profile.id,
      userId: user.id,
      email,
      fullName: key + " " + name,
      roleSlug: role,
      permissions: [],
      roleName: role,
    };
  }
  await client.query("update users set is_active=false where id=$1", [
    actors.inactiveStudent.userId,
  ]);
  const prior = (
    await client.query(
      "select id from course_levels order by level_number desc,id desc limit 1",
    )
  ).rows[0];
  for (const [name, number] of [
    ["A", 9501],
    ["B", 9502],
  ]) {
    const level = (
      await client.query(
        "insert into course_levels(slug,name,level_number,tagline,description)values($1,$2,$3,'Fixture','Fixture')returning id",
        [key + name, key + " Level " + name, number],
      )
    ).rows[0];
    ids.levels.push(level.id);
    ids["level" + name] = level.id;
  }
  ids.course = (
    await client.query(
      "insert into courses(level_id,slug,title,status)values($1,$2,$3,'published')returning id",
      [ids.levelA, key, key + " Course"],
    )
  ).rows[0].id;
  for (const name of ["student", "otherStudent"]) {
    ids[name + "Enrolment"] = (
      await client.query(
        "insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,$3,$4,'enrolled')returning id",
        [
          actors[name].profileId,
          actors[name].email,
          actors[name].fullName,
          ids.levelA,
        ],
      )
    ).rows[0].id;
    if (prior)
      await client.query(
        "insert into certificates(code,profile_id,kind,level_id,title)values($1,$2,'level',$3,'Verified previous-level fixture')",
        [randomUUID(), actors[name].profileId, prior.id],
      );
  }
  ids.cohortA = await setupCohort("Alpha");
  ids.cohortB = await setupCohort("Beta");
});
after(async () => {
  if (!client) return;
  const eventIds = (
    await client.query("select id from live_sessions where title like $1", [
      key + "%",
    ])
  ).rows.map((r) => r.id);
  await client.query(
    "delete from notifications where href=any($1::text[]) or body like $2",
    [eventIds.map((id) => "/events/" + id), key + "%"],
  );
  await client.query(
    "delete from notifications where title='Live session requested' and body like $1",
    [key + "%"],
  );
  await client.query(
    "delete from activity_logs where actor_id=any($1::uuid[])",
    [Object.values(actors).map((a) => a.profileId)],
  );
  await client.query("delete from live_sessions where id=any($1::int[])", [
    eventIds,
  ]);
  await client.query("delete from cohorts where id=any($1::int[])", [
    ids.cohorts,
  ]);
  await client.query("delete from users where id=any($1::uuid[])", [ids.users]);
  await client.query("delete from course_levels where id=any($1::int[])", [
    ids.levels,
  ]);
  await client.end();
  await pool?.end();
});

test("cohort setup rejects reversed dates, foreign roles and impossible capacity before writes", async () => {
  const base = {
    name: key + " Invalid cohort",
    description: "A valid description for checking cohort setup rules.",
    levelId: ids.levelA,
    courseId: null,
    capacity: 1,
    startsAt: future(1),
    endsAt: future(2),
    cadence: "Weekly",
    status: "draft",
    weeks: "",
  };
  assert.match(
    (await cohort.saveCohortSetup({ ...base, endsAt: future(0) }, actors.admin))
      .error,
    /end date/i,
  );
  assert.match(
    (await cohort.saveCohortSetup(base, actors.mentor)).error,
    /permission/i,
  );
  assert.match(
    (await cohort.saveCohortSetup({ ...base, capacity: 0 }, actors.admin))
      .error,
    /capacity/i,
  );
  assert.equal(
    (await client.query("select id from cohorts where name=$1", [base.name]))
      .rowCount,
    0,
  );
});
test("learner placement enforces level admission, faculty role and capacity under concurrent requests", async () => {
  const results = await Promise.all(
    ["student", "otherStudent"].map((name) =>
      cohort.changeCohortMember(
        {
          cohortId: ids.cohortA,
          profileId: actors[name].profileId,
          role: "learner",
          status: "active",
        },
        actors.admin,
      ),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.match(results.find((r) => r.error).error, /full/i);
  ids.placed = results[0].ok ? "student" : "otherStudent";
  ids.waiting = ids.placed === "student" ? "otherStudent" : "student";
  assert.match(
    (
      await cohort.changeCohortMember(
        {
          cohortId: ids.cohortA,
          profileId: actors.mentor.profileId,
          role: "learner",
          status: "active",
        },
        actors.admin,
      )
    ).error,
    /approve/i,
  );
  assert.match(
    (
      await cohort.changeCohortMember(
        {
          cohortId: ids.cohortA,
          profileId: actors.student.profileId,
          role: "facilitator",
          status: "active",
        },
        actors.admin,
      )
    ).error,
    /faculty/i,
  );
  assert.equal(
    (
      await cohort.changeCohortMember(
        {
          cohortId: ids.cohortA,
          profileId: actors.mentor.profileId,
          role: "mentor",
          status: "active",
        },
        actors.admin,
      )
    ).ok,
    true,
  );
});
test("cohort transfers synchronize the enrolment and preserve the original learning records", async () => {
  const actor = actors[ids.placed],
    original = await row("enrollments", ids[ids.placed + "Enrolment"]);
  assert.equal(original.cohort_id, ids.cohortA);
  assert.equal(
    (
      await cohort.changeCohortMember(
        {
          cohortId: ids.cohortB,
          profileId: actor.profileId,
          role: "learner",
          status: "active",
        },
        actors.admin,
      )
    ).ok,
    true,
  );
  assert.equal((await row("enrollments", original.id)).cohort_id, ids.cohortB);
  assert.equal(
    (
      await client.query(
        "select status from cohort_members where cohort_id=$1 and profile_id=$2",
        [ids.cohortA, actor.profileId],
      )
    ).rows[0].status,
    "removed",
  );
  assert.equal((await row("enrollments", original.id)).status, "enrolled");
});
test("enrolment pause withdraws membership and resumption rechecks capacity without deleting progress", async () => {
  const id = ids[ids.placed + "Enrolment"];
  assert.equal(
    (
      await cohort.manageEnrolment(
        await enrolInput(id, { status: "paused" }),
        actors.admin,
      )
    ).ok,
    true,
  );
  assert.equal(
    (
      await client.query(
        "select status from cohort_members where cohort_id=$1 and profile_id=$2",
        [ids.cohortB, actors[ids.placed].profileId],
      )
    ).rows[0].status,
    "paused",
  );
  const stale = await enrolInput(id, { status: "enrolled" });
  const resumed = await cohort.manageEnrolment(stale, actors.admin);
  assert.equal(resumed.ok, true, resumed.error);
  assert.match(
    (await cohort.manageEnrolment(stale, actors.admin)).error,
    /changed/i,
  );
  assert.match(
    (
      await cohort.manageEnrolment(
        await enrolInput(id, { status: "completed" }),
        actors.admin,
      )
    ).error,
    /examination/i,
  );
  assert.match(
    (await cohort.manageEnrolment(await enrolInput(id), actors.mentor)).error,
    /permission/i,
  );
});
test("waitlisted higher levels cannot be activated without the previous award and interest entries need approved accounts", async () => {
  const entry = (
    await client.query(
      "insert into enrollments(profile_id,email,full_name,level_id,status)values($1,$2,'Fixture',$3,'waitlist')returning id",
      [actors.student.profileId, actors.student.email, ids.levelB],
    )
  ).rows[0];
  assert.match(
    (
      await cohort.manageEnrolment(
        await enrolInput(entry.id, { status: "enrolled" }),
        actors.admin,
      )
    ).error,
    /previous level/i,
  );
  const interest = (
    await client.query(
      "insert into enrollments(email,full_name,level_id,status)values($1,'Unknown applicant',$2,'waitlist')returning id",
      [key + "-unapproved@example.invalid", ids.levelB],
    )
  ).rows[0];
  try {
    assert.match(
      (
        await cohort.manageEnrolment(
          await enrolInput(interest.id, { status: "enrolled" }),
          actors.admin,
        )
      ).error,
      /approve/i,
    );
  } finally {
    await client.query("delete from enrollments where id=$1", [interest.id]);
  }
});
test("mentors request teaching sessions; approval schedules exactly once and notifies every active account", async () => {
  const input = sessionInput();
  assert.match(
    (await live.scheduleLiveEvent(input, actors.mentor)).error,
    /request/i,
  );
  assert.match(
    (
      await live.requestLiveEvent(
        { ...input, hostId: actors.student.profileId },
        actors.student,
      )
    ).error,
    /mentor/i,
  );
  assert.equal((await live.requestLiveEvent(input, actors.mentor)).ok, true);
  assert.equal((await live.requestLiveEvent(input, actors.mentor)).ok, true);
  const request = (
    await client.query(
      "select * from live_session_requests where request_key=$1",
      [input.scheduleKey],
    )
  ).rows[0];
  assert.equal(
    (
      await client.query("select id from live_sessions where schedule_key=$1", [
        input.scheduleKey,
      ])
    ).rowCount,
    0,
  );
  const decisions = await Promise.all(
    [1, 2].map(() =>
      live.reviewLiveEventRequest(
        {
          id: request.id,
          version: request.updated_at.toISOString(),
          decision: "approve",
          note: "Approved by the programme team.",
        },
        actors.admin,
      ),
    ),
  );
  assert.equal(decisions.filter((r) => r.ok).length, 1);
  const reviewed = await row("live_session_requests", request.id);
  ids.session = reviewed.scheduled_session_id;
  assert.equal(reviewed.status, "approved");
  // Other test files create and delete accounts concurrently. Assert delivery
  // against this file's stable recipients instead of the changing global count.
  const recipients = Object.values(actors).map((actor) => actor.profileId);
  assert.deepEqual(
    (
      await client.query(
        "select recipient_id from notifications where href=$1 and title='New live event' and recipient_id=any($2::uuid[])",
        ["/events/" + ids.session, recipients],
      )
    ).rows.map((notification) => notification.recipient_id).sort(),
    recipients.filter((id) => id !== actors.inactiveStudent.profileId).sort(),
  );
});
test("public discovery and all account calendars expose event metadata while room access remains scoped", async () => {
  const publicRows = await live.getEventCalendar(null, { id: ids.session });
  assert.equal(publicRows.length, 1);
  assert.equal(publicRows[0].canJoin, false);
  for (const field of ["meetingUrl", "roomCode", "agenda", "recordingUrl"])
    assert.equal(field in publicRows[0], false);
  for (const name of ["student", "otherMentor", "admin"])
    assert.equal(
      (await live.getEventCalendar(actors[name], { id: ids.session })).length,
      1,
    );
  assert.equal(
    (await live.getEventCalendar(actors.guest, { id: ids.session }))[0].canJoin,
    false,
  );
  const privateEvent = await live.scheduleLiveEvent(
    sessionInput({
      startsAt: future(4),
      isPublic: false,
      courseId: ids.course,
      cohortId: ids.cohortA,
    }),
    actors.admin,
  );
  assert.equal(privateEvent.ok, true, privateEvent.error);
  ids.privateSession = privateEvent.id;
  assert.equal(
    (await live.getEventCalendar(null, { id: privateEvent.id })).length,
    0,
  );
  assert.equal(
    (
      await live.getEventCalendar(actors[ids.placed], { id: privateEvent.id })
    )[0].canJoin,
    false,
  );
  assert.equal(
    (await live.getEventCalendar(actors.mentor, { id: privateEvent.id }))[0]
      .canJoin,
    true,
    "A cohort mentor does not need a student enrolment",
  );
  assert.equal(
    (
      await live.setEventRsvp(privateEvent.id, true, actors[ids.placed])
    ).error.includes("membership"),
    true,
  );
});
test("schedule retries are idempotent and conflicting host slots cannot both be published", async () => {
  const input = sessionInput({ startsAt: future(5) }),
    first = await live.scheduleLiveEvent(input, actors.admin);
  assert.equal(first.ok, true, first.error);
  assert.equal(
    (await live.scheduleLiveEvent(input, actors.admin)).id,
    first.id,
  );
  const competing = await Promise.all(
    [1, 2].map((n) =>
      live.scheduleLiveEvent(
        sessionInput({ title: key + " conflicting " + n, startsAt: future(6) }),
        actors.admin,
      ),
    ),
  );
  assert.equal(competing.filter((r) => r.ok).length, 1);
  assert.match(competing.find((r) => r.error).error, /already has/i);
});
test("reschedules and terminal status changes guard versions and announce each committed change once", async () => {
  const original = await row("live_sessions", ids.session);
  const result = await live.scheduleLiveEvent(
    sessionInput({
      id: original.id,
      version: original.updated_at.toISOString(),
      startsAt: future(3, 2),
    }),
    actors.admin,
  );
  assert.equal(result.ok, true, result.error);
  assert.match(
    (
      await live.scheduleLiveEvent(
        sessionInput({
          id: original.id,
          version: original.updated_at.toISOString(),
        }),
        actors.admin,
      )
    ).error,
    /changed/i,
  );
  let current = await row("live_sessions", ids.session);
  assert.match(
    (
      await live.changeLiveEventStatus(
        {
          id: current.id,
          version: current.updated_at.toISOString(),
          status: "live",
        },
        actors.otherMentor,
      )
    ).error,
    /host/i,
  );
  assert.equal(
    (
      await live.changeLiveEventStatus(
        {
          id: current.id,
          version: current.updated_at.toISOString(),
          status: "live",
        },
        actors.mentor,
      )
    ).ok,
    true,
  );
  current = await row("live_sessions", ids.session);
  assert.equal(
    (
      await live.changeLiveEventStatus(
        {
          id: current.id,
          version: current.updated_at.toISOString(),
          status: "ended",
        },
        actors.mentor,
      )
    ).ok,
    true,
  );
  current = await row("live_sessions", ids.session);
  assert.match(
    (
      await live.changeLiveEventStatus(
        {
          id: current.id,
          version: current.updated_at.toISOString(),
          status: "live",
        },
        actors.admin,
      )
    ).error,
    /unavailable/i,
  );
});
test("RSVP writes are idempotent and cached roles cannot override withdrawn scheduling permission", async () => {
  const created = await live.scheduleLiveEvent(
    sessionInput({ startsAt: future(8) }),
    actors.admin,
  );
  assert.equal(created.ok, true);
  await Promise.all(
    [1, 2].map(() => live.setEventRsvp(created.id, true, actors.student)),
  );
  assert.equal(
    (
      await client.query(
        "select id from live_rsvps where live_session_id=$1 and profile_id=$2",
        [created.id, actors.student.profileId],
      )
    ).rowCount,
    1,
  );
  assert.equal(
    (await live.setEventRsvp(created.id, false, actors.student)).ok,
    true,
  );
  const cached = {
    ...actors.otherMentor,
    roleSlug: "super_admin",
    permissions: ["*"],
  };
  assert.match(
    (
      await live.scheduleLiveEvent(
        sessionInput({ startsAt: future(9) }),
        cached,
      )
    ).error,
    /permission/i,
  );
});
test("cancelling a cohort closes its scheduled events and blocks further private room access", async () => {
  const current = await row("cohorts", ids.cohortA);
  const result = await cohort.saveCohortSetup(
    {
      id: current.id,
      version: current.updated_at.toISOString(),
      name: current.name,
      description: current.description,
      levelId: current.level_id,
      courseId: current.course_id,
      capacity: current.capacity,
      startsAt: current.starts_at.toISOString(),
      endsAt: current.ends_at.toISOString(),
      cadence: current.cadence,
      status: "cancelled",
      weeks: "",
    },
    actors.admin,
  );
  assert.equal(result.ok, true, result.error);
  assert.equal(
    (await row("live_sessions", ids.privateSession)).status,
    "cancelled",
  );
  assert.equal(
    (await live.getEventCalendar(actors.mentor, { id: ids.privateSession }))[0]
      .status,
    "cancelled",
  );
});

test("declines and withdrawals never publish pending proposals and preserve reviewer feedback", async () => {
  for (const [decision, days] of [
    ["decline", 10],
    ["withdraw", 11],
  ]) {
    const input = sessionInput({
      startsAt: future(days),
      title: key + " " + decision,
    });
    assert.equal((await live.requestLiveEvent(input, actors.mentor)).ok, true);
    const request = (
      await client.query(
        "select * from live_session_requests where request_key=$1",
        [input.scheduleKey],
      )
    ).rows[0];
    if (decision === "decline")
      assert.match(
        (
          await live.reviewLiveEventRequest(
            {
              id: request.id,
              version: request.updated_at.toISOString(),
              decision,
              note: "",
            },
            actors.admin,
          )
        ).error,
        /explain/i,
      );
    const result = await live.reviewLiveEventRequest(
      {
        id: request.id,
        version: request.updated_at.toISOString(),
        decision,
        note:
          decision === "decline"
            ? "Please propose a different teaching date."
            : "",
      },
      decision === "withdraw" ? actors.mentor : actors.admin,
    );
    assert.equal(result.ok, true, result.error);
    assert.equal(
      (await row("live_session_requests", request.id)).scheduled_session_id,
      null,
    );
    assert.equal(
      (
        await client.query("select id from live_sessions where title=$1", [
          input.title,
        ])
      ).rowCount,
      0,
    );
  }
});
test("recordings require the current host, safe URLs, a closed or live event and a fresh version", async () => {
  const current = await row("live_sessions", ids.session),
    input = {
      id: current.id,
      version: current.updated_at.toISOString(),
      url: "https://video.example.invalid/recording.mp4",
    };
  assert.match(
    (await live.attachEventRecording(input, actors.otherMentor)).error,
    /host/i,
  );
  assert.match(
    (
      await live.attachEventRecording(
        { ...input, url: "javascript:alert(1)" },
        actors.mentor,
      )
    ).error,
    /valid/i,
  );
  assert.equal(
    (await live.attachEventRecording(input, actors.mentor)).ok,
    true,
  );
  assert.match(
    (await live.attachEventRecording(input, actors.mentor)).error,
    /refresh/i,
  );
  assert.equal(
    "recordingUrl" in
      (await live.getEventCalendar(null, { id: ids.session }))[0],
    false,
  );
});
test("a late notification failure rolls back the event and audit instead of announcing a partial schedule", async () => {
  const input = sessionInput({
      startsAt: future(12),
      title: key + " rollback",
    }),
    fn = "live_failure_" + key.replaceAll("-", "");
  await client.query(
    "create function " +
      fn +
      "() returns trigger language plpgsql as $$ begin if new.body = '" +
      input.title +
      "' then raise exception 'live fixture forced notification failure'; end if; return new; end $$",
  );
  await client.query(
    "create trigger " +
      fn +
      " before insert on notifications for each row execute function " +
      fn +
      "()",
  );
  try {
    await assert.rejects(
      live.scheduleLiveEvent(input, actors.admin),
      (error) =>
        error.cause?.message === "live fixture forced notification failure",
    );
    assert.equal(
      (
        await client.query(
          "select id from live_sessions where schedule_key=$1",
          [input.scheduleKey],
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await client.query("select id from notifications where body=$1", [
          input.title,
        ])
      ).rowCount,
      0,
    );
  } finally {
    await client.query("drop trigger " + fn + " on notifications");
    await client.query("drop function " + fn + "()");
  }
});
