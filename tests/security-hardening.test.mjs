import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

let client, throttle, csv, newsletter, appPool;
const key = randomUUID();
const emails = [`${key}-a@example.invalid`, `${key}-b@example.invalid`, `${key}-c@example.invalid`];
const rateKey = randomBytes(32).toString("hex");

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Security fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.APP_URL = "https://purpose-course.example";
  throttle = await import("../src/db/login-throttle.ts");
  csv = await import("../src/lib/csv.ts");
  newsletter = await import("../src/app/api/newsletter/route.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
});

test("repeated failed sign-ins lock that account for a while; success clears it", async () => {
  const [first, second] = emails.map(throttle.hashLoginEmail);
  assert.equal(throttle.hashLoginEmail("  MiXeD@Example.Invalid "), throttle.hashLoginEmail("mixed@example.invalid"));
  for (let attempt = 0; attempt < throttle.MAX_FAILURES_PER_EMAIL; attempt += 1) {
    assert.equal(await throttle.loginBlocked({ emailHash: first, rateKey: null }), false);
    await throttle.recordLoginAttempt({ emailHash: first, rateKey: null, succeeded: false });
  }
  assert.equal(await throttle.loginBlocked({ emailHash: first, rateKey: null }), true);
  assert.equal(await throttle.loginBlocked({ emailHash: second, rateKey: null }), false, "Other accounts are unaffected.");
  await throttle.recordLoginAttempt({ emailHash: first, rateKey: null, succeeded: true });
  assert.equal(await throttle.loginBlocked({ emailHash: first, rateKey: null }), false, "A successful sign-in clears earlier failures.");
  const stored = await client.query("select email_hash from auth_attempts where email_hash=$1 limit 1", [first]);
  assert.equal(stored.rows[0].email_hash.length, 64, "Only a hash of the email is stored.");
});

test("one connection guessing across many accounts is limited too", async () => {
  const third = throttle.hashLoginEmail(emails[2]);
  for (let attempt = 0; attempt < throttle.MAX_FAILURES_PER_ADDRESS; attempt += 1) {
    await throttle.recordLoginAttempt({ emailHash: throttle.hashLoginEmail(`${key}-spray-${attempt}@example.invalid`), rateKey, succeeded: false });
  }
  assert.equal(await throttle.loginBlocked({ emailHash: third, rateKey }), true);
  assert.equal(await throttle.loginBlocked({ emailHash: third, rateKey: null }), false);
  await client.query("update auth_attempts set created_at=now()-interval '2 days' where rate_key=$1", [rateKey]);
  assert.ok((await throttle.purgeLoginAttempts()) >= throttle.MAX_FAILURES_PER_ADDRESS, "Old attempts are purged by maintenance.");
});

test("CSV export neutralises spreadsheet formulas", () => {
  assert.equal(csv.csvCell("=HYPERLINK(\"http://x\")"), `"'=HYPERLINK(""http://x"")"`);
  for (const value of ["+1", "-2", "@cmd", "\tx"]) assert.ok(csv.csvCell(value).startsWith(`"'`), value);
  assert.equal(csv.csvRow(["Ada", null, 3]), `"Ada","","3"`);
});

test("newsletter sign-ups are same-origin and never overwrite an existing subscriber", async () => {
  const email = `${key}-news@example.invalid`;
  const post = (body, origin = "https://purpose-course.example") => newsletter.POST(new Request("http://127.0.0.1/api/newsletter", {
    method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body),
  }));
  assert.equal((await post({ email }, "https://attacker.example")).status, 403);
  assert.equal((await post({ email, fullName: "Ada Original", principle: "Identity" })).status, 200);
  assert.equal((await post({ email, fullName: "=Attacker" })).status, 200);
  const row = (await client.query("select full_name, principle from subscribers where email=$1", [email])).rows[0];
  assert.deepEqual(row, { full_name: "Ada Original", principle: "identity" });
  assert.equal((await post({ email: "not-an-email" })).status, 422);
});

after(async () => {
  if (client) {
    await client.query("delete from auth_attempts where email_hash = any($1::text[]) or rate_key=$2", [[...emails, ...Array.from({ length: 25 }, (_, index) => `${key}-spray-${index}@example.invalid`)].map((email) => throttle.hashLoginEmail(email)), rateKey]);
    await client.query("delete from subscribers where email like $1", [`${key}%`]);
    await client.end();
  }
  if (appPool) await appPool.end();
});
