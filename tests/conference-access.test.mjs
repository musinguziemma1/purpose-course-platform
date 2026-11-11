import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

let client, conference, appPool, levelId, courseId, cohortId;
const users = [], rooms = [], actors = {}, key = randomUUID();
let code, secondCode, hostPeer, studentPeer, mentorPeer;
const heartbeat = (viewer, peerId, room = code) => conference.heartbeatRoom({ code: room, peerId, viewer, audioEnabled: true, videoEnabled: false, sharingScreen: false, handRaised: false });

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Conference fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  conference = await import("../src/db/conference.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  for (const [name, role] of [["host", "mentor"], ["mentor", "mentor"], ["student", "student"], ["outsider", "student"]]) {
    const userId = (await client.query("insert into users(email,password_hash) values($1,'unused-test-hash') returning id", [`${key}-${name}@example.invalid`])).rows[0].id;
    users.push(userId);
    const profile = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id", [userId, name, `${key}-${name}`, role])).rows[0];
    actors[name] = { profileId: profile.id, fullName: name, roleSlug: role, permissions: [] };
  }
  levelId = (await client.query("select id from course_levels order by id limit 1")).rows[0].id;
  courseId = (await client.query("insert into courses(level_id,slug,title) values($1,$2,'Conference fixture') returning id", [levelId, key])).rows[0].id;
  cohortId = (await client.query("insert into cohorts(slug,name,course_id,description,status,starts_at,ends_at) values($1,'Conference fixture',$2,'Private cohort','active',now(),now()+interval '1 week') returning id", [key, courseId])).rows[0].id;
  for (const actor of [actors.student, actors.mentor]) {
    await client.query("insert into enrollments(profile_id,email,full_name,level_id,status) values($1,$2,'Fixture',$3,'enrolled')", [actor.profileId, `${actor.profileId}@example.invalid`, levelId]);
    await client.query("insert into cohort_members(cohort_id,profile_id,status) values($1,$2,'active')", [cohortId, actor.profileId]);
  }
  code = 'test-' + key.slice(0, 30);
  secondCode = 'other-' + key.slice(0, 30);
  for (const room of [code, secondCode]) {
    rooms.push((await client.query("insert into live_sessions(course_id,cohort_id,host_id,title,status,starts_at,room_code) values($1,$2,$3,'Conference fixture','live',now(),$4) returning id", [courseId, cohortId, actors.host.profileId, room])).rows[0].id);
  }
  hostPeer = randomUUID(); studentPeer = randomUUID(); mentorPeer = randomUUID();
});

test("room access requires authentication, enrolment and active cohort membership", async () => {
  assert.equal(await conference.getRoomByCode(code, null), null);
  assert.equal(await conference.getRoomByCode(code, actors.outsider), null);
  assert.ok(await conference.getRoomByCode(code, actors.student));
  await client.query("update cohort_members set status='closed' where profile_id=$1", [actors.student.profileId]);
  assert.equal(await conference.getRoomByCode(code, actors.student), null);
  await client.query("update cohort_members set status='active' where profile_id=$1", [actors.student.profileId]);
  await client.query("update enrollments set status='paused' where profile_id=$1", [actors.student.profileId]);
  assert.equal(await conference.getRoomByCode(code, actors.student), null);
  await client.query("update enrollments set status='enrolled' where profile_id=$1", [actors.student.profileId]);
});

test("only the assigned host receives hosting privileges", async () => {
  assert.equal((await conference.joinRoom({ code, peerId: hostPeer, viewer: actors.host })).self.isHost, true);
  assert.equal((await conference.joinRoom({ code, peerId: studentPeer, viewer: actors.student })).self.isHost, false);
  assert.equal((await conference.joinRoom({ code, peerId: mentorPeer, viewer: actors.mentor })).self.isHost, false);
  assert.equal(await conference.hostControl({ code, actorPeerId: mentorPeer, viewer: actors.mentor, action: "mute-all" }), false);
});

test("a known peer id cannot be claimed, polled, signalled from or removed by another account", async () => {
  assert.equal(await conference.joinRoom({ code, peerId: studentPeer, viewer: actors.mentor }), null);
  assert.equal(await heartbeat(actors.mentor, studentPeer), null);
  assert.equal(await conference.sendSignal({ code, fromPeer: hostPeer, toPeer: studentPeer, viewer: actors.mentor, kind: "offer", payload: {} }), false);
  assert.equal(await conference.leaveRoom(code, studentPeer, actors.mentor), false);
  assert.equal(await conference.hostControl({ code, actorPeerId: hostPeer, viewer: actors.mentor, action: "remove", targetPeerId: studentPeer }), false);
  assert.ok(await heartbeat(actors.student, studentPeer));
});

test("signals require a recipient in the same room and polling consumes only that room's inbox", async () => {
  const otherPeer = randomUUID();
  await conference.joinRoom({ code: secondCode, peerId: otherPeer, viewer: actors.mentor });
  assert.equal(await conference.sendSignal({ code, fromPeer: hostPeer, toPeer: otherPeer, viewer: actors.host, kind: "offer", payload: {} }), false);
  assert.equal(await conference.sendSignal({ code, fromPeer: hostPeer, toPeer: studentPeer, viewer: actors.host, kind: "offer", payload: { sdp: "fixture" } }), true);
  const foreign = (await client.query("insert into conference_signals(room_code,from_peer,to_peer,kind,payload) values($1,$2,$3,'offer','{}') returning id", [secondCode, otherPeer, studentPeer])).rows[0].id;
  const polled = await heartbeat(actors.student, studentPeer);
  assert.equal(polled.signals.length, 1);
  assert.equal(polled.signals[0].payload.sdp, "fixture");
  assert.equal((await client.query("select consumed from conference_signals where id=$1", [foreign])).rows[0].consumed, false);
  assert.equal((await heartbeat(actors.student, studentPeer)).signals.length, 0);
});

test("host moderation works and participant removal invalidates further polls", async () => {
  assert.equal(await conference.hostControl({ code, actorPeerId: hostPeer, viewer: actors.host, action: "mute-all" }), true);
  const poll = await heartbeat(actors.student, studentPeer);
  assert.equal(poll.signals[0].kind, "control");
  assert.equal(poll.signals[0].payload.action, "mute-all");
  assert.equal(await conference.sendSignal({ code, fromPeer: studentPeer, toPeer: hostPeer, viewer: actors.student, kind: "control", payload: { action: "mute-all" } }), false);
  assert.equal(await conference.hostControl({ code, actorPeerId: hostPeer, viewer: actors.host, action: "remove", targetPeerId: studentPeer }), true);
  assert.equal(await heartbeat(actors.student, studentPeer), null);
});

test("concurrent joins and seat grants cannot overfill the mesh", async () => {
  const joined = await Promise.all(Array.from({ length: conference.MESH_SEAT_LIMIT + 2 }, () => conference.joinRoom({ code, peerId: randomUUID(), viewer: actors.student })));
  assert.ok(joined.every(Boolean));
  const counts = (await client.query("select count(*)::int as count from conference_participants where room_code=$1 and mode='mesh'", [code])).rows[0];
  assert.equal(counts.count, conference.MESH_SEAT_LIMIT);
  const viewer = joined.find((result) => result.self.mode === "viewer");
  assert.equal(await conference.hostControl({ code, actorPeerId: hostPeer, viewer: actors.host, action: "grant-seat", targetPeerId: viewer.self.peerId }), false);
});

test("draft courses, ended rooms and revoked enrolments block participation", async () => {
  await client.query("update courses set status='draft' where id=$1", [courseId]);
  assert.equal(await conference.getRoomByCode(code, actors.student), null);
  await client.query("update courses set status='published' where id=$1", [courseId]);
  await client.query("update live_sessions set status='ended' where id=$1", [rooms[0]]);
  assert.equal(await conference.joinRoom({ code, peerId: randomUUID(), viewer: actors.student }), null);
  assert.equal(await heartbeat(actors.host, hostPeer), null);
  assert.ok(await conference.getRoomByCode(code, actors.student), "Ended recordings remain available to enrolled learners.");
  await client.query("update live_sessions set status='live' where id=$1", [rooms[0]]);
  await client.query("update enrollments set status='paused' where profile_id=$1", [actors.student.profileId]);
  assert.equal(await conference.joinRoom({ code, peerId: randomUUID(), viewer: actors.student }), null);
});

after(async () => {
  if (client) {
    await client.query("delete from conference_signals where room_code=any($1::text[])", [[code, secondCode].filter(Boolean)]);
    if (rooms.length) await client.query("delete from live_sessions where id=any($1::int[])", [rooms]);
    if (users.length) { await client.query("delete from enrollments where profile_id in (select id from profiles where user_id=any($1::uuid[]))", [users]); await client.query("delete from users where id=any($1::uuid[])", [users]); }
    if (cohortId) await client.query("delete from cohorts where id=$1", [cohortId]);
    if (courseId) await client.query("delete from courses where id=$1", [courseId]);
    await client.end();
  }
  if (appPool) await appPool.end();
});
