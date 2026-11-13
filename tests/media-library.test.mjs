import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

let client, pool, media, workflow, types, levelId, privateAsset, responseAsset;
const key = randomUUID(),
  actors = {},
  objects = new Map(),
  requests = [];
const originalFetch = globalThis.fetch;
const pdf = Buffer.from(
  "%PDF-1.4\nPurpose Course media verification fixture\n%%EOF",
);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

async function storageFixture(input, init = {}) {
  const url = new URL(typeof input === "string" ? input : input.url);
  assert.equal(
    url.hostname,
    "fixture.supabase.co",
    "Tests cannot call hosted services.",
  );
  const path = url.pathname.replace(/^\/storage\/v1/, ""),
    method = init.method ?? "GET",
    body = init.body ? JSON.parse(init.body) : {};
  requests.push({ path, method });
  if (path === "/bucket/purpose-course-media" && method === "GET")
    return json({
      id: "purpose-course-media",
      name: "purpose-course-media",
      public: false,
    });
  if (path.startsWith("/object/upload/sign/") && method === "POST")
    return json({ url: path + "?token=upload-fixture" });
  if (path.startsWith("/object/sign/") && method === "POST") {
    assert.equal(body.expiresIn, 60);
    return json({ signedURL: path + "?token=read-fixture" });
  }
  if (path === "/object/list/purpose-course-media" && method === "POST")
    return json(
      [...objects.entries()]
        .filter(([name]) => name.startsWith(body.prefix + "/"))
        .map(([name, object]) => ({
          name: name.split("/").at(-1),
          id: randomUUID(),
          metadata: { size: object.size, mimetype: object.mime },
          created_at: new Date().toISOString(),
        })),
    );
  if (
    path.startsWith("/object/sign/purpose-course-media/") &&
    method === "GET"
  ) {
    const object = objects.get(
      path.slice("/object/sign/purpose-course-media/".length),
    );
    return object
      ? new Response(object.bytes.subarray(0, 512), {
          status: 206,
          headers: { "content-type": object.mime },
        })
      : json({ error: "Not found" }, 404);
  }
  if (path === "/object/purpose-course-media" && method === "DELETE") {
    for (const name of body.prefixes) objects.delete(name);
    return json([]);
  }
  throw new Error("Unexpected Storage fixture request: " + method + " " + path);
}

async function reserve(
  viewer,
  purpose = "library",
  bytes = pdf,
  name = key + ".pdf",
) {
  const result = await media.beginMediaUpload(
    { name, byteSize: bytes.length, purpose },
    viewer,
  );
  assert.ok(result.ok, result.error);
  assert.ok(!JSON.stringify(result).includes(process.env.SUPABASE_SECRET_KEY));
  assert.equal(result.publicKey, "sb_publishable_storage_fixture");
  const row = (
    await client.query("select * from media_assets where id=$1", [result.id])
  ).rows[0];
  objects.set(row.storage_path, {
    bytes,
    size: bytes.length,
    mime: row.mime_type,
  });
  return { result, row };
}

before(async () => {
  const local = dotenv.parse(readFileSync(".env")),
    uri = new URL(local.DATABASE_URL);
  assert.ok(
    ["127.0.0.1", "localhost"].includes(uri.hostname) && uri.port === "54329",
    "Media fixtures require local PostgreSQL.",
  );
  process.env.DATABASE_URL = local.DATABASE_URL;
  process.env.DATABASE_POOL_MAX = "1";
  process.env.SUPABASE_URL = "https://fixture.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_storage_unit_fixture";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_storage_fixture";
  globalThis.fetch = storageFixture;
  media = await import("../src/db/media-library.ts");
  workflow = await import("../src/db/assignment-workflow.ts");
  types = await import("../src/lib/media-files.ts");
  pool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: local.DATABASE_URL });
  await client.connect();
  for (const [name, role] of [
    ["mentor", "mentor"],
    ["student", "student"],
    ["other", "student"],
    ["guest", "guest"],
  ]) {
    const account = (
      await client.query(
        "insert into users(email,password_hash) values($1,'unused') returning id",
        [`${key}-${name}@example.invalid`],
      )
    ).rows[0];
    const profile = (
      await client.query(
        "insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug=$4 returning id",
        [account.id, name, `${key}-${name}`, role],
      )
    ).rows[0];
    actors[name] = {
      profileId: profile.id,
      userId: account.id,
      fullName: name,
      roleSlug: role,
      permissions: [],
    };
  }
  levelId = (
    await client.query(
      "insert into course_levels(slug,name,level_number,tagline,description) values($1,'Media fixture',9905,'Fixture','Fixture') returning id",
      [key],
    )
  ).rows[0].id;
  for (const name of ["student", "other"])
    await client.query(
      "insert into enrollments(profile_id,email,full_name,level_id,status) values($1,$2,$3,$4,'enrolled')",
      [actors[name].profileId, `${key}-${name}@example.invalid`, name, levelId],
    );
  await client.query(
    "insert into mentor_assignments(mentor_id,student_id,status) values($1,$2,'active')",
    [actors.mentor.profileId, actors.student.profileId],
  );
});

test("only staff roles can browse and upload reusable library files", async () => {
  for (const role of types.MEDIA_STAFF_ROLES)
    assert.equal(types.canUseMediaLibrary({ roleSlug: role }), true);
  for (const actor of [
    actors.student,
    actors.guest,
    null,
    { roleSlug: "custom", permissions: ["media.access"] },
  ]) {
    assert.equal(await media.listLibraryAssets(actor), null);
    assert.ok(
      (
        await media.beginMediaUpload(
          { name: "fixture.pdf", byteSize: pdf.length, purpose: "library" },
          actor,
        )
      ).error,
    );
  }
  assert.ok(
    (
      await media.beginMediaUpload(
        { name: "fixture.pdf", byteSize: pdf.length, purpose: "submission" },
        actors.guest,
      )
    ).error,
  );
});

test("format, path and size restrictions reject unsafe inputs before storage authorization", async () => {
  for (const [name, size] of [
    ["script.html", 10],
    ["drawing.svg", 10],
    ["../secret.pdf", 10],
    ["empty.pdf", 0],
    ["large.mp4", types.MEDIA_MAX_BYTES + 1],
    ["fraction.pdf", 3.5],
  ])
    assert.ok(
      (
        await media.beginMediaUpload(
          { name, byteSize: size, purpose: "library" },
          actors.mentor,
        )
      ).error,
    );
  assert.equal(types.mediaFileError("lesson.pptx", 500), null);
  assert.equal(types.mediaFileError("workbook.xlsx", 500), null);
  assert.equal(types.mediaFileError("teaching.mp4", 500), null);
  assert.equal(types.mediaFileError("recording.mp3", 500), null);
});

test("an upload becomes visible only after ownership, storage metadata and actual bytes are verified", async () => {
  privateAsset = await reserve(actors.mentor);
  assert.equal(
    (await media.listLibraryAssets(actors.mentor)).some(
      (row) => row.id === privateAsset.result.id,
    ),
    false,
  );
  assert.ok(
    (await media.completeMediaUpload(privateAsset.result.id, actors.student))
      .error,
  );
  const result = await media.completeMediaUpload(
    privateAsset.result.id,
    actors.mentor,
  );
  assert.ok(result.ok, result.error);
  assert.ok(
    (await media.completeMediaUpload(privateAsset.result.id, actors.mentor)).ok,
  );
  assert.equal(
    (await media.listLibraryAssets(actors.mentor)).some(
      (row) => row.id === privateAsset.result.id,
    ),
    true,
  );
  assert.equal(
    await media.readableMedia(privateAsset.result.id, actors.student),
    null,
  );
  assert.equal(await media.readableMedia(privateAsset.result.id, null), null);
  assert.match(
    await media.readableMedia(privateAsset.result.id, actors.mentor),
    /read-fixture/,
  );
});

test("renamed active content and mismatched sizes cannot be published", async () => {
  const fake = await reserve(
    actors.mentor,
    "library",
    Buffer.from("<script>alert('unsafe')</script>"),
  );
  assert.ok(
    (await media.completeMediaUpload(fake.result.id, actors.mentor)).error,
  );
  assert.equal(objects.has(fake.row.storage_path), false);
  const wrongSize = await reserve(actors.mentor);
  objects.get(wrongSize.row.storage_path).size++;
  assert.ok(
    (await media.completeMediaUpload(wrongSize.result.id, actors.mentor)).error,
  );
  assert.equal(
    (
      await client.query("select state from media_assets where id=$1", [
        wrongSize.result.id,
      ])
    ).rows[0].state,
    "failed",
  );
});

test("assigned materials are available to the intended learner without exposing the reusable library", async () => {
  const assignment = await workflow.createLearningAssignment(
    {
      title: "Use the shared worksheet",
      brief:
        "Read the attached worksheet and provide specific evidence in your own response.",
      levelId,
      assigneeId: actors.student.profileId,
      dueAt: "",
      attachmentId: privateAsset.result.id,
    },
    actors.mentor,
  );
  assert.ok(assignment.ok);
  assert.match(
    await media.readableMedia(privateAsset.result.id, actors.student),
    /read-fixture/,
  );
  assert.equal(
    await media.readableMedia(privateAsset.result.id, actors.other),
    null,
  );
  assert.equal(await media.listLibraryAssets(actors.student), null);
  actors.student.assignmentId = assignment.id;
});

test("student response files remain private until submitted and never enter the staff library", async () => {
  responseAsset = await reserve(actors.student, "submission");
  assert.ok(
    (await media.completeMediaUpload(responseAsset.result.id, actors.student))
      .ok,
  );
  assert.equal(
    (await media.listLibraryAssets(actors.mentor)).some(
      (row) => row.id === responseAsset.result.id,
    ),
    false,
  );
  const input = {
    assignmentId: actors.student.assignmentId,
    body: "My response explains the evidence in the attached document and the next steps I will take.",
    asDraft: true,
    attachmentId: responseAsset.result.id,
    version: "",
  };
  assert.ok((await workflow.saveAssignmentResponse(input, actors.student)).ok);
  assert.equal(
    await media.readableMedia(responseAsset.result.id, actors.mentor),
    null,
  );
  assert.equal(
    await media.readableMedia(responseAsset.result.id, actors.other),
    null,
  );
  const row = (
    await client.query(
      "select updated_at from assignment_submissions where assignment_id=$1",
      [actors.student.assignmentId],
    )
  ).rows[0];
  assert.ok(
    (
      await workflow.saveAssignmentResponse(
        { ...input, asDraft: false, version: row.updated_at.toISOString() },
        actors.student,
      )
    ).ok,
  );
  assert.match(
    await media.readableMedia(responseAsset.result.id, actors.mentor),
    /read-fixture/,
  );
  assert.equal(
    await media.readableMedia(responseAsset.result.id, actors.other),
    null,
  );
});

test("current permissions, not stale role claims, govern listing, signing and finalization", async () => {
  const pending = await reserve(actors.mentor);
  await client.query(
    "update profiles set role_id=(select id from roles where slug='guest') where id=$1",
    [actors.mentor.profileId],
  );
  try {
    assert.equal(await media.listLibraryAssets(actors.mentor), null);
    assert.equal(
      await media.readableMedia(privateAsset.result.id, actors.mentor),
      null,
    );
    assert.ok(
      (await media.completeMediaUpload(pending.result.id, actors.mentor)).error,
    );
    assert.equal(
      (
        await client.query("select state from media_assets where id=$1", [
          pending.result.id,
        ])
      ).rows[0].state,
      "pending",
    );
  } finally {
    await client.query(
      "update profiles set role_id=(select id from roles where slug='mentor') where id=$1",
      [actors.mentor.profileId],
    );
  }
});

test("embedded lesson and course materials and recordings follow publication and enrolment", async () => {
  const asset = await reserve(
    actors.mentor,
    "library",
    pdf,
    key + "-embedded.pdf",
  );
  assert.equal(
    (await media.completeMediaUpload(asset.result.id, actors.mentor)).ok,
    true,
  );
  const course = (
    await client.query(
      "insert into courses(level_id,slug,title,status,is_sequential,description)values($1,$2,'Embedded course','published',false,$3)returning id",
      [levelId, key, asset.row.url],
    )
  ).rows[0];
  let recordingId;
  try {
    assert.match(
      await media.readableMedia(asset.result.id, actors.student),
      /read-fixture/,
    );
    assert.equal(await media.readableMedia(asset.result.id, null), null);
    await client.query("update courses set description='' where id=$1", [
      course.id,
    ]);
    assert.equal(
      await media.readableMedia(asset.result.id, actors.student),
      null,
    );
    const unit = (
      await client.query(
        "insert into course_modules(course_id,slug,title)values($1,$2,'Unit')returning id",
        [course.id, key],
      )
    ).rows[0];
    const lesson = (
      await client.query(
        "insert into lessons(module_id,slug,title,body,status)values($1,$2,'Embedded lesson',$3,'published')returning id",
        [unit.id, key, asset.row.url],
      )
    ).rows[0];
    assert.match(
      await media.readableMedia(asset.result.id, actors.student),
      /read-fixture/,
    );
    await client.query("update lessons set status='draft' where id=$1", [
      lesson.id,
    ]);
    assert.equal(
      await media.readableMedia(asset.result.id, actors.student),
      null,
    );
    const recording = (
      await client.query(
        "insert into live_sessions(course_id,host_id,title,status,starts_at,recording_url)values($1,$2,'Recording fixture','ended',now(),$3)returning id",
        [course.id, actors.mentor.profileId, asset.row.url],
      )
    ).rows[0];
    recordingId = recording.id;
    assert.match(
      await media.readableMedia(asset.result.id, actors.student),
      /read-fixture/,
    );
    assert.equal(await media.readableMedia(asset.result.id, null), null);
    await client.query(
      "update enrollments set status='paused' where profile_id=$1 and level_id=$2",
      [actors.student.profileId, levelId],
    );
    assert.equal(
      await media.readableMedia(asset.result.id, actors.student),
      null,
    );
  } finally {
    await client.query(
      "update enrollments set status='enrolled' where profile_id=$1 and level_id=$2",
      [actors.student.profileId, levelId],
    );
    if (recordingId)
      await client.query("delete from live_sessions where id=$1", [
        recordingId,
      ]);
    await client.query("delete from courses where id=$1", [course.id]);
  }
});

test("library upload limits are enforced and no public API role is granted admission credentials", async () => {
  await client.query(
    "insert into media_assets(url,file_name,uploaded_by) select 'unused',$1,$2 from generate_series(1,100)",
    [key, actors.mentor.profileId],
  );
  assert.ok(
    (
      await media.beginMediaUpload(
        { name: "over-quota.pdf", byteSize: pdf.length, purpose: "library" },
        actors.mentor,
      )
    ).error,
  );
  const rows = (
    await client.query(
      "select rolname,has_table_privilege(oid,'public.admission_requests','SELECT') as allowed from pg_roles where rolname in ('anon','authenticated')",
    )
  ).rows;
  assert.ok(rows.every((row) => !row.allowed));
  assert.equal(
    (
      await client.query(
        "select a.privilege_type from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid='public.admission_requests'::regclass and a.grantee=0",
      )
    ).rowCount,
    0,
  );
});

after(async () => {
  globalThis.fetch = originalFetch;
  if (client) {
    const ids = Object.values(actors).map((actor) => actor.profileId);
    await client.query(
      "delete from activity_logs where actor_id=any($1::uuid[])",
      [ids],
    );
    await client.query("delete from assignments where level_id=$1", [levelId]);
    await client.query(
      "delete from media_assets where uploaded_by=any($1::uuid[])",
      [ids],
    );
    await client.query(
      "delete from enrollments where profile_id=any($1::uuid[])",
      [ids],
    );
    await client.query("delete from users where id=any($1::uuid[])", [
      Object.values(actors).map((actor) => actor.userId),
    ]);
    await client.query("delete from course_levels where id=$1", [levelId]);
    await client.end();
  }
  await pool?.end();
});
