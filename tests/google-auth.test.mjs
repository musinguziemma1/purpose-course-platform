import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { createHash, createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

const google = await import("../src/lib/google-auth.ts");
const clientId = "1234567890-fixture.apps.googleusercontent.com";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "fixture-key", alg: "RS256", use: "sig" };
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });

function token(claims, { kid = "fixture-key", key = privateKey, alg = "RS256" } = {}) {
  const header = Buffer.from(JSON.stringify({ alg, kid, typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createSign("RSA-SHA256").update(`${header}.${body}`).sign(key).toString("base64url");
  return `${header}.${body}.${signature}`;
}
const now = Date.UTC(2026, 10, 24, 12);
const valid = (overrides = {}) => ({ iss: "https://accounts.google.com", aud: clientId, sub: "1100", email: "Ada@Example.org", email_verified: true, nonce: "n-1", iat: now / 1000, exp: now / 1000 + 3600, ...overrides });
const verifyWith = (idToken, keys = async () => [jwk]) => google.verifyIdToken(idToken, { clientId, nonce: "n-1", keys, now });

test("configuration requires a real client id and secret", () => {
  assert.equal(google.googleConfiguration({}), null);
  assert.equal(google.googleConfiguration({ GOOGLE_CLIENT_ID: "not-a-client", GOOGLE_CLIENT_SECRET: "x".repeat(24) }), null);
  assert.deepEqual(google.googleConfiguration({ GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: "GOCSPX-fixture-secret" }), { clientId, clientSecret: "GOCSPX-fixture-secret" });
});

test("the authorization request uses PKCE S256, state and nonce", () => {
  const { flow, challenge } = google.startFlow("/learn/journey");
  assert.equal(challenge, createHash("sha256").update(flow.verifier).digest("base64url"));
  const url = new URL(google.authorizationUrl({ clientId, redirectUri: "https://purpose.example/api/auth/google/callback", state: flow.state, nonce: flow.nonce, challenge }));
  assert.equal(url.origin + url.pathname, google.GOOGLE_AUTH_ENDPOINT);
  for (const [name, value] of Object.entries({ client_id: clientId, response_type: "code", scope: "openid email profile", state: flow.state, nonce: flow.nonce, code_challenge_method: "S256", code_challenge: challenge })) assert.equal(url.searchParams.get(name), value);
  assert.equal(google.redirectUriFor("https://purpose.example/some/page"), "https://purpose.example/api/auth/google/callback");
});

test("the flow cookie is tamper-evident, expires and only redirects inside the site", () => {
  const { flow } = google.startFlow("https://evil.example/");
  assert.equal(flow.next, "", "Off-site next targets are dropped.");
  const sealed = google.sealFlow({ ...flow, next: "/learn" }, "secret-one-secret-one");
  assert.equal(google.openFlow(sealed, "secret-one-secret-one").next, "/learn");
  assert.equal(google.openFlow(sealed, "a-different-secret!!"), null);
  assert.equal(google.openFlow(sealed.replace(/^./, (c) => (c === "a" ? "b" : "a")), "secret-one-secret-one"), null);
  assert.equal(google.openFlow(sealed, "secret-one-secret-one", (flow.exp + 1) * 1000), null, "Expired flows are rejected.");
  assert.equal(google.statesMatch(flow.state, flow.state), true);
  assert.equal(google.statesMatch(flow.state, "forged"), false);
  assert.equal(google.statesMatch(flow.state, null), false);
  for (const bad of ["//evil.example", "/\\evil", "/login", "javascript:alert(1)"]) assert.equal(google.safeNextPath(bad), "", bad);
});

test("ID tokens are accepted only when signed by Google for this app and this sign-in", async () => {
  const claims = await verifyWith(token(valid()));
  assert.deepEqual([claims.sub, claims.email], ["1100", "ada@example.org"], "Emails are normalised to lower case.");
  await assert.rejects(verifyWith(token(valid(), { key: other.privateKey })), /signature/);
  await assert.rejects(verifyWith(token(valid({ aud: "someone-else.apps.googleusercontent.com" }))), /another application/);
  await assert.rejects(verifyWith(token(valid({ iss: "https://evil.example" }))), /issuer/);
  await assert.rejects(verifyWith(token(valid({ nonce: "replayed" }))), /nonce/);
  await assert.rejects(verifyWith(token(valid({ exp: now / 1000 - 120 }))), /expired/);
  await assert.rejects(verifyWith(token(valid({ email_verified: false }))), /verified/);
  await assert.rejects(verifyWith(token(valid(), { alg: "HS256" })), /algorithm/);
  await assert.rejects(verifyWith(token(valid(), { kid: "unknown" })), /signing key/);
  let refreshed = false;
  const rotated = await verifyWith(token(valid()), async (refresh) => { if (refresh) { refreshed = true; return [jwk]; } return []; });
  assert.ok(refreshed && rotated.sub === "1100", "Keys are refetched once when Google rotates them.");
});

test("the code exchange sends the PKCE verifier and reports Google errors", async () => {
  let sent;
  const ok = async (url, init) => { sent = { url, body: new URLSearchParams(init.body) }; return new Response(JSON.stringify({ id_token: "id.token.value" }), { status: 200 }); };
  const config = { clientId, clientSecret: "GOCSPX-fixture-secret" };
  assert.equal(await google.exchangeCode({ code: "c", verifier: "v", redirectUri: "https://p.example/api/auth/google/callback", config }, ok), "id.token.value");
  assert.equal(sent.url, google.GOOGLE_TOKEN_ENDPOINT);
  assert.deepEqual([sent.body.get("code_verifier"), sent.body.get("grant_type")], ["v", "authorization_code"]);
  const denied = async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
  await assert.rejects(google.exchangeCode({ code: "c", verifier: "v", redirectUri: "x", config }, denied), /invalid_grant/);
});

let client, accounts, appPool;
const key = randomUUID(), users = [];
before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const url = new URL(env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54329", "Account fixtures require local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  accounts = await import("../src/db/google-sign-in.ts");
  appPool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  for (const [name, active] of [["active", true], ["disabled", false]]) {
    const userId = (await client.query("insert into users(email,password_hash,is_active) values($1,'unused-test-hash',$2) returning id", [`${key}-${name}@example.invalid`, active])).rows[0].id;
    users.push(userId);
    await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,$2,$3 from roles where slug='student'", [userId, name, `${key}-${name}`]);
  }
});

test("Google signs in existing active accounts only, matched by email", async () => {
  const match = await accounts.accountForGoogleEmail(`  ${key}-ACTIVE@example.invalid `);
  assert.deepEqual(match, { status: "ok", userId: users[0] });
  assert.deepEqual(await accounts.accountForGoogleEmail(`${key}-disabled@example.invalid`), { status: "inactive" });
  assert.deepEqual(await accounts.accountForGoogleEmail(`${key}-nobody@example.invalid`), { status: "no-account" }, "Google never creates accounts; admissions still need staff approval.");
  assert.equal(await accounts.workspaceHomeForUser(users[0]), "/account?complete=1", "Incomplete profiles finish their profile first.");
  await accounts.recordGoogleSignIn(users[0]);
  assert.equal((await client.query("select count(*)::int as n from activity_logs where action='auth.google_sign_in' and entity_id=$1", [users[0]])).rows[0].n, 1);
});

after(async () => {
  if (client) {
    await client.query("delete from activity_logs where action='auth.google_sign_in' and entity_id = any($1::text[])", [users]);
    if (users.length) await client.query("delete from users where id = any($1::uuid[])", [users]);
    await client.end();
  }
  if (appPool) await appPool.end();
});

test("a Google-verified applicant is carried to the application form only untampered and briefly", () => {
  const sealed = google.sealApplicant({ name: "Ada Lovelace", email: "ada@example.org" }, "client-secret-fixture");
  assert.deepEqual(Object.keys(google.openApplicant(sealed, "client-secret-fixture")).sort(), ["email", "exp", "name"]);
  assert.equal(google.openApplicant(sealed, "client-secret-fixture").email, "ada@example.org");
  assert.equal(google.openApplicant(sealed, "another-secret"), null);
  assert.equal(google.openApplicant(sealed.replace(/^./, (c) => (c === "a" ? "b" : "a")), "client-secret-fixture"), null);
  assert.equal(google.openApplicant(sealed, "client-secret-fixture", Date.now() + (google.APPLICANT_SECONDS + 5) * 1000), null);
  // A flow cookie can never be replayed as an applicant cookie (different MAC domain).
  const { flow } = google.startFlow("/learn", "apply");
  assert.equal(flow.intent, "apply");
  assert.equal(google.openApplicant(google.sealFlow(flow, "client-secret-fixture"), "client-secret-fixture"), null);
  assert.equal(google.startFlow("/learn", "something-else").flow.intent, undefined);
});
