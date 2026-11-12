import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const key = randomUUID(), actors = {}, enquiryIds = [], outboxIds = [], notificationIds = [], legacyIds = [];
let client, inbox, contact, mail, delivery, pool;
const rateKey = () => randomBytes(32).toString("hex");
const input = (overrides = {}) => ({ submissionId: randomUUID(), fullName: "Contact fixture", email: `${key}@example.invalid`, subject: "Enquiry fixture", body: "Please help me understand the next available course dates.", ...overrides });
async function submit(overrides = {}, rate = rateKey(), sender = null) {
  const item = input(overrides); enquiryIds.push(item.submissionId);
  const result = await inbox.submitContactEnquiry(item, sender, rate);
  const notices = (await client.query("select id from notifications where href=$1", [`/admin/contact/${item.submissionId}`])).rows;
  notificationIds.push(...notices.map((row) => row.id));
  return { ...item, result };
}
const row = async (id) => (await client.query("select * from contact_enquiries where id=$1", [id])).rows[0];
const reply = (item, overrides = {}) => ({ id: item.submissionId, replyId: randomUUID(), body: "Thank you. The team will confirm the dates with you.", recipientEmail: item.email, ...overrides });

before(async () => {
  const env = dotenv.parse(readFileSync(".env")), uri = new URL(env.DATABASE_URL);
  assert.ok(uri.hostname === "127.0.0.1" && uri.port === "54329", "Contact fixtures require project-local PostgreSQL.");
  Object.assign(process.env, { DATABASE_URL: env.DATABASE_URL, RESEND_API_KEY: "fake-no-network", RESEND_FROM_EMAIL: "Purpose Course <accounts@example.invalid>", APP_URL: "https://purpose.example.invalid", EMAIL_OUTBOX_ENCRYPTION_KEY: randomBytes(32).toString("base64"), CONTACT_RATE_LIMIT_SECRET: randomBytes(32).toString("hex") });
  inbox = await import("../src/db/contact-inbox.ts"); contact = await import("../src/lib/contact.ts"); mail = await import("../src/lib/email.ts"); delivery = await import("../src/db/email-delivery.ts"); pool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  for (const [name, slug, active] of [["admin", "super_admin", true], ["manager", "platform_admin", true], ["editor", "editor", true], ["learner", "student", true], ["inactive", "super_admin", false]]) {
    const userId = (await client.query("insert into users(email,password_hash,is_active) values($1,'unused',$2) returning id", [`${key}-${name}@example.invalid`, active])).rows[0].id;
    const role = (await client.query("select * from roles where slug=$1", [slug])).rows[0];
    const profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) values($1,$2,$3,$3) returning id", [userId, role.id, `${key}-${name}`])).rows[0].id;
    actors[name] = { profileId, userId, roleSlug: slug, permissions: role.permissions };
  }
});

test("contact validation and honeypot do not persist invalid submissions", async () => {
  for (const invalid of [{ fullName: " " }, { fullName: "x".repeat(161) }, { email: "not-an-email" }, { subject: "x".repeat(241) }, { body: "Short" }, { body: "x".repeat(10001) }, { submissionId: "invalid" }]) {
    const item = await submit(invalid); assert.ok(item.result.error); if (contact.isUuid(item.submissionId)) assert.equal(await row(item.submissionId), undefined);
  }
  const trap = await submit({ website: "https://spam.example.invalid" }); assert.ok(trap.result.ok); assert.equal(await row(trap.submissionId), undefined);
});

test("trusted client rate keys omit raw IPs and do not trust spoofed headers off Vercel", () => {
  const original = process.env.VERCEL; process.env.VERCEL = "1";
  try {
    const first = contact.contactRateKey(new Headers({ "x-forwarded-for": "192.0.2.10" }));
    assert.equal(first.length, 64); assert.ok(!first.includes("192.0.2.10")); assert.equal(first, contact.contactRateKey(new Headers({ "x-forwarded-for": "192.0.2.10" })));
    assert.notEqual(first, contact.contactRateKey(new Headers({ "x-forwarded-for": "192.0.2.11" })));
    assert.throws(() => contact.contactRateKey(new Headers({ "x-forwarded-for": "forged" })), /Trusted client/);
    process.env.VERCEL = "0";
    assert.equal(contact.contactRateKey(new Headers({ "x-forwarded-for": "192.0.2.10" })), contact.contactRateKey(new Headers({ "x-forwarded-for": "192.0.2.11" })));
  } finally { if (original === undefined) delete process.env.VERCEL; else process.env.VERCEL = original; }
});

test("simultaneous submissions, retries and double clicks create one enquiry and one notification per manager", async () => {
  const item = input(), rate = rateKey(); enquiryIds.push(item.submissionId);
  const outcomes = await Promise.all(Array.from({ length: 4 }, () => inbox.submitContactEnquiry(item, null, rate)));
  assert.ok(outcomes.every((result) => result.ok));
  assert.equal((await client.query("select * from contact_enquiries where id=$1", [item.submissionId])).rowCount, 1);
  const notices = (await client.query("select * from notifications where href=$1", [`/admin/contact/${item.submissionId}`])).rows; notificationIds.push(...notices.map((notice) => notice.id));
  assert.equal(notices.filter((notice) => notice.recipient_id === actors.admin.profileId).length, 1);
  assert.equal(notices.filter((notice) => notice.recipient_id === actors.manager.profileId).length, 1);
  assert.ok(notices.every((notice) => ![actors.learner.profileId, actors.editor.profileId, actors.inactive.profileId].includes(notice.recipient_id)));
  assert.ok(notices.every((notice) => !notice.body.includes(item.email) && !notice.body.includes(item.body)));
  assert.equal((await client.query("select * from activity_logs where entity_id=$1", [item.submissionId])).rowCount, 1);
  assert.ok((await inbox.submitContactEnquiry({ ...item, body: item.body + " changed" }, null, rate)).error);
  const duplicate = await submit({}, rate); assert.ok(duplicate.result.ok); assert.equal(await row(duplicate.submissionId), undefined);
});

test("concurrent unique submissions enforce five per hour with no partial records", async () => {
  const rate = rateKey();
  const outcomes = await Promise.all(Array.from({ length: 8 }, (_, n) => submit({ subject: `Rate check ${n}` }, rate)));
  assert.equal(outcomes.filter((item) => item.result.ok).length, 5); assert.equal(outcomes.filter((item) => item.result.error).length, 3);
  assert.equal((await client.query("select * from contact_enquiries where rate_key=$1", [rate])).rowCount, 5);
});

test("inbox reads and writes enforce current active staff permissions, including role withdrawal", async () => {
  const item = await submit();
  for (const actor of [null, actors.learner, actors.editor, actors.inactive, { ...actors.admin, isDemo: true }]) {
    assert.equal((await inbox.getContactInbox(actor)).length, 0); assert.equal(await inbox.getContactEnquiry(item.submissionId, actor), null);
    assert.match((await inbox.updateContactEnquiry({ id: item.submissionId, version: 0, status: "resolved", claim: true }, actor)).error, /permission/);
    assert.match((await inbox.queueContactReply(reply(item), actor)).error, /permission/);
  }
  assert.equal((await inbox.getContactEnquiry(item.submissionId, actors.manager)).enquiry.body, item.body);
  await client.query("update profiles set role_id=(select id from roles where slug='editor') where id=$1", [actors.manager.profileId]);
  try { assert.equal(await inbox.getContactEnquiry(item.submissionId, actors.manager), null); assert.match((await inbox.queueContactReply(reply(item), actors.manager)).error, /permission/); }
  finally { await client.query("update profiles set role_id=(select id from roles where slug='platform_admin') where id=$1", [actors.manager.profileId]); }
});

test("stale competing staff updates cannot overwrite a newer status or owner", async () => {
  const item = await submit();
  const outcomes = await Promise.all([inbox.updateContactEnquiry({ id: item.submissionId, version: 0, status: "in_progress", claim: true }, actors.admin), inbox.updateContactEnquiry({ id: item.submissionId, version: 0, status: "resolved", claim: true }, actors.manager)]);
  assert.equal(outcomes.filter((result) => result.ok).length, 1); assert.match(outcomes.find((result) => result.error).error, /another window/);
  const current = await row(item.submissionId); assert.equal(current.version, 1); assert.ok([actors.admin.profileId, actors.manager.profileId].includes(current.assigned_to_id));
  assert.equal(Boolean(current.resolved_at), current.status === "resolved");
});

test("a late audit failure rolls back the enquiry and all staff notifications", async () => {
  const item = input(), trigger = "contact_fixture_" + key.replaceAll("-", ""); enquiryIds.push(item.submissionId);
  await client.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin if NEW.entity_id='${item.submissionId}' then raise exception 'forced contact failure'; end if; return NEW; end $$; create trigger ${trigger} before insert on activity_logs for each row execute function ${trigger}()`);
  try { await assert.rejects(() => inbox.submitContactEnquiry(item, null, rateKey()), (error) => /forced contact failure/.test(String(error.cause))); }
  finally { await client.query(`drop trigger ${trigger} on activity_logs; drop function ${trigger}()`); }
  assert.equal(await row(item.submissionId), undefined); assert.equal((await client.query("select * from notifications where href=$1", [`/admin/contact/${item.submissionId}`])).rowCount, 0);
});

test("replies protect the recipient, queue one encrypted request and distinguish provider acceptance from delivery", async () => {
  const item = await submit(), request = reply(item);
  assert.match((await inbox.queueContactReply({ ...request, recipientEmail: "wrong@example.invalid" }, actors.admin)).error, /must match/);
  const outcomes = await Promise.all([inbox.queueContactReply(request, actors.admin), inbox.queueContactReply(request, actors.admin)]); assert.ok(outcomes.every((result) => result.ok));
  const records = (await client.query("select r.*,o.request_ciphertext,o.status,o.sent_at,o.body as outbox_body from contact_replies r join notification_outbox o on o.id=r.outbox_id where r.enquiry_id=$1", [item.submissionId])).rows;
  assert.equal(records.length, 1); const record = records[0]; outboxIds.push(record.outbox_id);
  assert.equal(record.status, "queued"); assert.equal(record.sent_at, null); assert.ok(!record.request_ciphertext.includes(request.body)); assert.ok(!record.outbox_body.includes(request.body));
  const decoded = mail.decryptEmail(record.request_ciphertext); assert.deepEqual(decoded.to, [item.email]); assert.ok(decoded.text.includes(request.body));
  assert.equal((await row(item.submissionId)).status, "in_progress");
  assert.match((await inbox.queueContactReply({ ...request, body: request.body + " changed" }, actors.admin)).error, /already used/);
  let calls = 0; await delivery.deliverQueuedEmails({ id: record.outbox_id, limit: 1, transport: async (value) => { calls++; assert.deepEqual(value, decoded); return { id: randomUUID() }; } });
  assert.equal(calls, 1); const sent = (await client.query("select * from notification_outbox where id=$1", [record.outbox_id])).rows[0]; assert.equal(sent.status, "accepted"); assert.equal(sent.delivered_at, null);
});

test("reply persistence failures and missing provider settings leave no queued email", async () => {
  const item = await submit(), request = reply(item), trigger = "reply_fixture_" + key.replaceAll("-", "");
  const originalKey = process.env.RESEND_API_KEY; delete process.env.RESEND_API_KEY;
  try { await assert.rejects(() => inbox.queueContactReply(request, actors.admin), /Configure Resend/); } finally { process.env.RESEND_API_KEY = originalKey; }
  await client.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin if NEW.entity_id='${item.submissionId}' and NEW.action='contact.reply_queued' then raise exception 'forced reply failure'; end if; return NEW; end $$; create trigger ${trigger} before insert on activity_logs for each row execute function ${trigger}()`);
  try { await assert.rejects(() => inbox.queueContactReply(request, actors.admin), (error) => /forced reply failure/.test(String(error.cause))); }
  finally { await client.query(`drop trigger ${trigger} on activity_logs; drop function ${trigger}()`); }
  assert.equal((await client.query("select * from contact_replies where enquiry_id=$1", [item.submissionId])).rowCount, 0);
  assert.equal((await client.query("select * from notification_outbox where recipient_email=$1 and template_key='contact.reply'", [item.email])).rows.filter((entry) => !outboxIds.includes(entry.id)).length, 0);
  assert.equal((await row(item.submissionId)).version, 0);
});

test("legacy import deduplicates staff fanout, preserves originals and requires an explicit recipient", async () => {
  const originalIds = (await client.query("insert into messages(recipient_id,subject,body,context_type) values($1,$3,$4,'contact'),($2,$3,$4,'contact') returning id", [actors.admin.profileId, actors.editor.profileId, key + " legacy", "Original contact with signed footer: Visitor (legacy@example.invalid)"])).rows.map((item) => item.id); legacyIds.push(...originalIds);
  const migration = readFileSync("supabase/migrations/20261112070652_add_staff_contact_inbox.sql", "utf8");
  const importSql = migration.split("-- BEGIN LEGACY CONTACT IMPORT")[1].split("-- END LEGACY CONTACT IMPORT")[0];
  await client.query(importSql); await client.query(importSql);
  const rows = (await client.query("select * from contact_enquiries where legacy_message_id=any($1::int[])", [originalIds])).rows; assert.equal(rows.length, 1); enquiryIds.push(rows[0].id);
  assert.equal(rows[0].email, null); assert.equal(rows[0].source, "legacy"); assert.equal((await client.query("select * from messages where id=any($1::int[])", [originalIds])).rowCount, 2);
  const request = reply({ submissionId: rows[0].id, email: "" }); assert.match((await inbox.queueContactReply(request, actors.admin)).error, /Confirm a valid/);
  assert.ok((await inbox.queueContactReply({ ...request, recipientEmail: "legacy@example.invalid" }, actors.admin)).ok);
  outboxIds.push((await client.query("select outbox_id from contact_replies where enquiry_id=$1", [rows[0].id])).rows[0].outbox_id);
});

after(async () => {
  if (client) {
    const validIds = enquiryIds.filter((id) => contact.isUuid(id));
    await client.query("delete from contact_enquiries where id=any($1::uuid[])", [validIds]);
    await client.query("delete from email_events where outbox_id=any($1::int[])", [outboxIds]); await client.query("delete from notification_outbox where id=any($1::int[])", [outboxIds]);
    await client.query("delete from notifications where id=any($1::int[])", [notificationIds]);
    await client.query("delete from activity_logs where entity_id=any($1::text[])", [validIds]); await client.query("delete from messages where id=any($1::int[])", [legacyIds]);
    await client.query("delete from users where email like $1", [key + "-%"]); await client.end();
  }
  await pool?.end();
});
