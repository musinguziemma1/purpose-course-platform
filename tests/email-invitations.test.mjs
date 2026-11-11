import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const key = randomUUID(), password = "A strong invitation test phrase!", actors = {}, messageIds = [];
let client, invitations, delivery, mail, pool, webhook, jobs;
const email = (suffix) => `${key}-${suffix}@example.invalid`;
async function invite(suffix, actor = actors.admin, roleSlug = "student") {
  const result = await invitations.createInvitation({ email: email(suffix), fullName: "Invited fixture", roleSlug }, actor);
  assert.ok(result.ok, result.error);
  const row = (await client.query("select * from notification_outbox where invitation_id=$1", [result.id])).rows[0];
  return { id: result.id, row, token: mail.decryptEmail(row.request_ciphertext).text.match(/#([\w-]{43})/)[1] };
}
async function queued(suffix = randomUUID()) {
  return (await client.query("insert into notification_outbox(profile_id,channel,template_key,subject,body) values($1,'email','account.role_changed',$2,'Your workspace is ready.\n\nOpen: /learn') returning *", [actors.learner.profileId, key + suffix])).rows[0];
}
const send = async (id, transport) => delivery.deliverQueuedEmails({ id, limit: 1, transport });
const row = async (id) => (await client.query("select * from notification_outbox where id=$1", [id])).rows[0];
const accepted = () => { const id = randomUUID(); messageIds.push(id); return { id }; };

before(async () => {
  const env = dotenv.parse(readFileSync(".env")), uri = new URL(env.DATABASE_URL);
  assert.ok(uri.hostname === "127.0.0.1" && uri.port === "54329", "Email fixtures require project-local PostgreSQL.");
  Object.assign(process.env, { DATABASE_URL: env.DATABASE_URL, RESEND_API_KEY: "test-provider-disabled", RESEND_FROM_EMAIL: "Purpose Course <accounts@example.invalid>", APP_URL: "https://purpose.example.invalid", EMAIL_OUTBOX_ENCRYPTION_KEY: randomBytes(32).toString("base64"), CRON_SECRET: randomBytes(32).toString("hex"), RESEND_WEBHOOK_SECRET: "whsec_" + randomBytes(32).toString("base64") });
  invitations = await import("../src/db/invitations.ts"); delivery = await import("../src/db/email-delivery.ts"); mail = await import("../src/lib/email.ts"); pool = (await import("../src/db/index.ts")).pool;
  webhook = await import("../src/app/api/webhooks/resend/route.ts"); jobs = await import("../src/app/api/jobs/email/route.ts");
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  for (const [name, slug] of [["admin", "super_admin"], ["manager", "platform_admin"], ["learner", "student"]]) {
    const userId = (await client.query("insert into users(email,password_hash) values($1,'unused') returning id", [email(name)])).rows[0].id;
    const role = (await client.query("select * from roles where slug=$1", [slug])).rows[0];
    const profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) values($1,$2,$3,$3) returning id", [userId, role.id, `${key}-${name}`])).rows[0].id;
    actors[name] = { profileId, userId, roleSlug: slug, permissions: role.permissions };
  }
});

test("invitations enforce current role authority, input and provider configuration", async () => {
  assert.match((await invitations.createInvitation({ email: email("denied"), fullName: "Fixture", roleSlug: "student" }, actors.learner)).error, /Administrator/);
  assert.match((await invitations.createInvitation({ email: email("denied"), fullName: "Fixture", roleSlug: "super_admin" }, actors.manager)).error, /Administrator/);
  assert.match((await invitations.createInvitation({ email: email("learner"), fullName: "Fixture", roleSlug: "student" }, actors.admin)).error, /already exists/);
  const original = process.env.APP_URL; process.env.APP_URL = "https://attacker.invalid/redirect?next=bad";
  await assert.rejects(() => invitations.createInvitation({ email: email("invalid-origin"), fullName: "Fixture", roleSlug: "student" }, actors.admin), /canonical HTTPS origin/);
  process.env.APP_URL = original;
});

test("activation uses protected single-use tokens and creates no automatic course enrollment", async () => {
  const item = await invite("activate");
  const stored = (await client.query("select * from account_invitations where id=$1", [item.id])).rows[0];
  assert.equal(stored.token_hash.length, 64); assert.ok(!JSON.stringify(stored).includes(item.token)); assert.ok(!JSON.stringify(item.row).includes(item.token));
  assert.equal((await client.query("select id from users where email=$1", [email("activate")])).rowCount, 0);
  assert.match((await invitations.acceptInvitation(item.token, "short")).error, /15 characters/);
  const attempts = await Promise.all([invitations.acceptInvitation(item.token, password), invitations.acceptInvitation(item.token, password)]);
  assert.equal(attempts.filter((attempt) => attempt.ok).length, 1);
  const account = (await client.query("select u.*,p.id as profile_id from users u join profiles p on p.user_id=u.id where u.email=$1", [email("activate")])).rows[0];
  const security = await import("../scripts/password-security.mjs"); assert.ok(security.verifyPassword(password, account.password_hash));
  assert.equal((await client.query("select * from org_memberships where profile_id=$1", [account.profile_id])).rowCount, 1);
  assert.equal((await client.query("select * from enrollments where profile_id=$1", [account.profile_id])).rowCount, 0);
  assert.equal((await row(item.row.id)).request_ciphertext, null);
});

test("replacement, revocation, expiry and withdrawn inviter permissions block redemption", async () => {
  const old = await invite("replace"), replacement = await invite("replace");
  assert.ok((await invitations.acceptInvitation(old.token, password)).error);
  assert.equal((await row(old.row.id)).status, "cancelled");
  assert.equal(await invitations.revokeInvitation(replacement.id, actors.learner), false);
  assert.equal(await invitations.revokeInvitation(replacement.id, actors.admin), true);
  assert.ok((await invitations.acceptInvitation(replacement.token, password)).error);
  const expired = await invite("expire"); await client.query("update account_invitations set expires_at=now()-interval '1 minute' where id=$1", [expired.id]);
  assert.ok((await invitations.acceptInvitation(expired.token, password)).error);
  let called = false; await send(expired.row.id, async () => { called = true; return accepted(); }); assert.equal(called, false);
  const withdrawn = await invite("withdrawn", actors.manager);
  await client.query("update profiles set role_id=(select id from roles where slug='student') where id=$1", [actors.manager.profileId]);
  assert.match((await invitations.acceptInvitation(withdrawn.token, password)).error, /no longer authorized/);
  await client.query("update profiles set role_id=(select id from roles where slug='platform_admin') where id=$1", [actors.manager.profileId]);
});

test("late activation failure rolls back credentials, membership and token consumption", async () => {
  const item = await invite("rollback");
  const trigger = `email_fixture_${key.replaceAll("-", "")}`;
  await client.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin if NEW.entity_id = '${item.id}' and NEW.action = 'people.invitation_accepted' then raise exception 'forced invitation failure'; end if; return NEW; end $$; create trigger ${trigger} before insert on activity_logs for each row execute function ${trigger}()`);
  try { await assert.rejects(() => invitations.acceptInvitation(item.token, password), (error) => /forced invitation failure/.test(String(error.cause))); }
  finally { await client.query(`drop trigger ${trigger} on activity_logs; drop function ${trigger}()`); }
  assert.equal((await client.query("select * from users where email=$1", [email("rollback")])).rowCount, 0);
  assert.equal((await client.query("select accepted_at from account_invitations where id=$1", [item.id])).rows[0].accepted_at, null);
  assert.ok((await invitations.acceptInvitation(item.token, password)).ok);
});

test("concurrent delivery claims send once and distinguish provider acceptance from delivery", async () => {
  const item = await queued(), receipt = accepted(); let calls = 0;
  const transport = async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 50)); return receipt; };
  await Promise.all([send(item.id, transport), send(item.id, transport)]);
  assert.equal(calls, 1); assert.equal((await row(item.id)).status, "accepted"); assert.equal((await row(item.id)).delivered_at, null);
  await send(item.id, transport); assert.equal(calls, 1);
});

test("uncertain retries preserve the encrypted provider request and idempotency key", async () => {
  const item = await queued(), requests = [], keys = [];
  await send(item.id, async (request, idempotency) => { requests.push(request); keys.push(idempotency); return { error: "Simulated transport timeout", retryable: true }; });
  assert.equal((await row(item.id)).status, "queued");
  await client.query("update notification_outbox set scheduled_at=now(),body='Changed after attempt' where id=$1", [item.id]);
  const oldSender = process.env.RESEND_FROM_EMAIL; process.env.RESEND_FROM_EMAIL = "Another <different@example.invalid>";
  await send(item.id, async (request, idempotency) => { requests.push(request); keys.push(idempotency); return accepted(); });
  process.env.RESEND_FROM_EMAIL = oldSender;
  assert.deepEqual(requests[0], requests[1]); assert.equal(keys[0], keys[1]); assert.match(requests[0].text, /https:\/\/purpose.example.invalid\/learn/);
  assert.equal((await row(item.id)).attempts, 2);
});

test("expired leases recover, while old or exhausted uncertain deliveries require review", async () => {
  const item = await queued(); await client.query("update notification_outbox set status='processing',locked_until=now()-interval '1 minute' where id=$1", [item.id]);
  await send(item.id, async () => accepted()); assert.equal((await row(item.id)).status, "accepted");
  for (const [hours, attempts] of [[24, 1], [1, 8]]) {
    const blocked = await queued(); await client.query("update notification_outbox set first_attempt_at=now()-($2::int*interval '1 hour'),attempts=$3 where id=$1", [blocked.id, hours, attempts]);
    let called = false; await send(blocked.id, async () => { called = true; return accepted(); });
    assert.equal(called, false); assert.equal((await row(blocked.id)).status, "needs_review");
  }
});

test("delivery respects inactive recipients, email opt-out, address changes and provider errors", async () => {
  const optout = await queued(); await client.query("insert into notification_preferences(profile_id,category,email) values($1,'account',false) on conflict(profile_id,category) do update set email=false", [actors.learner.profileId]);
  await send(optout.id, async () => { throw Error("Opted-out email must not be sent"); }); assert.equal((await row(optout.id)).status, "cancelled");
  await client.query("delete from notification_preferences where profile_id=$1", [actors.learner.profileId]);
  const inactive = await queued(); await client.query("update users set is_active=false where id=$1", [actors.learner.userId]);
  await send(inactive.id, async () => { throw Error("Inactive account must not be sent email"); }); assert.equal((await row(inactive.id)).status, "cancelled");
  await client.query("update users set is_active=true where id=$1", [actors.learner.userId]);
  const changed = await queued(); await client.query("update notification_outbox set recipient_email='another@example.invalid' where id=$1", [changed.id]);
  await send(changed.id, async () => { throw Error("Changed address must not receive private email"); }); assert.equal((await row(changed.id)).status, "cancelled");
  const failure = await queued(); await send(failure.id, async () => ({ error: "Simulated HTTP 403", retryable: false })); assert.equal((await row(failure.id)).status, "failed"); assert.equal((await row(failure.id)).sent_at, null);
});

test("callbacks arriving before acceptance are reconciled, deduplicated and never regress terminal status", async () => {
  const item = await queued(), receipt = accepted(), eventId = randomUUID();
  const event = { type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: receipt.id } };
  await send(item.id, async () => { await delivery.recordEmailWebhook(eventId, event); return receipt; });
  assert.equal((await row(item.id)).status, "delivered");
  await delivery.recordEmailWebhook(eventId, event);
  assert.equal((await client.query("select * from email_events where provider_event_id=$1", [eventId])).rowCount, 1);
  await delivery.recordEmailWebhook(randomUUID(), { ...event, type: "email.sent" }); assert.equal((await row(item.id)).status, "delivered");
  await delivery.recordEmailWebhook(randomUUID(), { ...event, type: "email.bounced" });
  await delivery.recordEmailWebhook(randomUUID(), event); assert.equal((await row(item.id)).status, "bounced");
});

test("webhook signature, raw body and timestamp are verified; unauthenticated jobs cannot send", async () => {
  const item = await queued(), receipt = accepted(); await send(item.id, async () => receipt);
  const payload = JSON.stringify({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: receipt.id } });
  const id = `msg_${randomUUID()}`, timestamp = String(Math.floor(Date.now() / 1000));
  const signature = (body, time = timestamp) => "v1," + createHmac("sha256", Buffer.from(process.env.RESEND_WEBHOOK_SECRET.slice(6), "base64")).update(`${id}.${time}.${body}`).digest("base64");
  const request = (body, time = timestamp, sig = signature(payload)) => new Request("https://purpose.example.invalid/api/webhooks/resend", { method: "POST", headers: { "svix-id": id, "svix-timestamp": time, "svix-signature": sig }, body });
  assert.equal((await webhook.POST(request(payload + " "))).status, 400);
  const expired = String(Number(timestamp) - 600); assert.equal((await webhook.POST(request(payload, expired, signature(payload, expired)))).status, 400);
  assert.equal((await row(item.id)).status, "accepted");
  assert.equal((await webhook.POST(request(payload))).status, 200); assert.equal((await row(item.id)).status, "delivered");
  assert.equal((await jobs.POST(new Request("https://purpose.example.invalid/api/jobs/email", { method: "POST" }))).status, 401);
});

test("Resend transport supplies authorization and stable idempotency, and never reports failed requests as accepted", async () => {
  const originalFetch = globalThis.fetch, request = { from: "accounts@example.invalid", to: ["recipient@example.invalid"], subject: "Fixture", text: "Fixture" };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.resend.com/emails"); assert.equal(options.headers.Authorization, "Bearer test-provider-disabled"); assert.equal(options.headers["Idempotency-Key"], "fixture-message"); assert.deepEqual(JSON.parse(options.body), request);
      return Response.json({ id: "receipt-fixture" });
    };
    assert.deepEqual(await delivery.sendWithResend(request, "fixture-message"), { id: "receipt-fixture" });
    for (const [status, retryable] of [[429, true], [503, true], [403, false]]) {
      globalThis.fetch = async () => new Response("Provider details must not reach logs", { status });
      const result = await delivery.sendWithResend(request, "fixture-message"); assert.equal(result.retryable, retryable); assert.ok(!result.id); assert.ok(!result.error.includes("Provider details"));
    }
    globalThis.fetch = async () => { throw Error("Network failed"); }; assert.equal((await delivery.sendWithResend(request, "fixture-message")).retryable, true);
  } finally { globalThis.fetch = originalFetch; }
});

test("stored activation email cannot be decrypted after ciphertext tampering or key replacement", () => {
  const cipher = mail.encryptEmail({ from: "accounts@example.invalid", to: ["recipient@example.invalid"], subject: "Fixture", text: "Private activation token" });
  const parts = cipher.split("."); parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
  assert.throws(() => mail.decryptEmail(parts.join(".")));
  const original = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY; process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  assert.throws(() => mail.decryptEmail(cipher)); process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = original;
});

after(async () => {
  if (client) {
    await client.query("delete from email_events where outbox_id in (select id from notification_outbox where subject like $1 or invitation_id in (select id from account_invitations where email like $2)) or provider_message_id=any($3::varchar[])", [key + "%", key + "-%", messageIds]);
    await client.query("delete from activity_logs where actor_id in (select p.id from profiles p join users u on u.id=p.user_id where u.email like $1) or entity_id in (select id::text from account_invitations where email like $1)", [key + "-%"]);
    await client.query("delete from account_invitations where email like $1", [key + "-%"]);
    await client.query("delete from users where email like $1", [key + "-%"]);
    await client.end();
  }
  await pool?.end();
});
