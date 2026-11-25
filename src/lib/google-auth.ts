import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify, type JsonWebKey } from "node:crypto";

/**
 * Sign in with Google (OpenID Connect authorization-code flow with PKCE).
 * Google only proves who the person is; it never creates Purpose Course
 * accounts. A verified Google email signs in the matching active account.
 */

type Environment = Record<string, string | undefined>;
export type GoogleConfiguration = { clientId: string; clientSecret: string };
export type GoogleClaims = { sub: string; email: string; name?: string; picture?: string };
export type FlowState = { state: string; verifier: string; nonce: string; next: string; exp: number; intent?: "apply" };
export type GoogleApplicant = { name: string; email: string; exp: number };

export const GOOGLE_STATE_COOKIE = "pc_google_oauth";
/** Verified name and email carried to the application form when a Google address has no account. */
export const GOOGLE_APPLICANT_COOKIE = "pc_google_applicant";
export const APPLICANT_SECONDS = 30 * 60;
export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const FLOW_SECONDS = 10 * 60;

const base64url = (value: Buffer | string) => Buffer.from(value).toString("base64url");
const random = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function googleConfiguration(env: Environment = process.env): GoogleConfiguration | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim(), clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId) || clientSecret.length < 16) return null;
  return { clientId, clientSecret };
}

export const googleSignInAvailable = () => googleConfiguration() !== null;

/** Same allow-list as password sign-in: only known workspace paths, never another origin. */
export function safeNextPath(next: string | null | undefined) {
  const value = String(next ?? "");
  return /^\/(?:learn|mentor|admin|account|community|events)(?:[/?#]|$)/.test(value) && !/[\\\r\n]/.test(value) ? value : "";
}

export function redirectUriFor(origin: string) {
  return `${new URL(origin).origin}/api/auth/google/callback`;
}

export function startFlow(next: string, intent?: string): { flow: FlowState; challenge: string } {
  const flow: FlowState = { state: random(), verifier: random(48), nonce: random(), next: safeNextPath(next), exp: Math.floor(Date.now() / 1000) + FLOW_SECONDS, ...(intent === "apply" ? { intent: "apply" as const } : {}) };
  return { flow, challenge: base64url(createHash("sha256").update(flow.verifier).digest()) };
}

export function authorizationUrl(input: { clientId: string; redirectUri: string; state: string; nonce: string; challenge: string }) {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: input.clientId, redirect_uri: input.redirectUri, response_type: "code", scope: "openid email profile",
    state: input.state, nonce: input.nonce, code_challenge: input.challenge, code_challenge_method: "S256", prompt: "select_account",
  }).toString();
  return url.toString();
}

/** The flow cookie is readable by the browser that started the flow only, and tamper-evident. */
export function sealFlow(flow: FlowState, secret: string) {
  const body = base64url(JSON.stringify(flow));
  return `${body}.${base64url(createHmac("sha256", secret).update(body).digest())}`;
}

export function openFlow(value: string | undefined, secret: string, now = Date.now()): FlowState | null {
  if (!value) return null;
  const [body, mac, extra] = value.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const flow = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as FlowState;
    if (typeof flow.state !== "string" || typeof flow.verifier !== "string" || typeof flow.nonce !== "string" || typeof flow.exp !== "number") return null;
    return flow.exp * 1000 > now ? { ...flow, next: safeNextPath(flow.next) } : null;
  } catch {
    return null;
  }
}

export function sealApplicant(applicant: { name: string; email: string }, secret: string, now = Date.now()) {
  const body = base64url(JSON.stringify({ name: applicant.name.slice(0, 160), email: applicant.email, exp: Math.floor(now / 1000) + APPLICANT_SECONDS }));
  return `${body}.${base64url(createHmac("sha256", `applicant:${secret}`).update(body).digest())}`;
}

/** Returns the Google-verified applicant only for an untampered, unexpired cookie. */
export function openApplicant(value: string | undefined, secret: string, now = Date.now()): GoogleApplicant | null {
  if (!value) return null;
  const [body, mac, extra] = value.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = createHmac("sha256", `applicant:${secret}`).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const applicant = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as GoogleApplicant;
    if (typeof applicant.email !== "string" || typeof applicant.name !== "string" || typeof applicant.exp !== "number") return null;
    return applicant.exp * 1000 > now ? applicant : null;
  } catch {
    return null;
  }
}

export function statesMatch(expected: string, received: string | null) {
  if (!received) return false;
  const a = Buffer.from(expected), b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Jwk = JsonWebKey & { kid?: string; alg?: string };
let cachedKeys: { keys: Jwk[]; fetchedAt: number } | null = null;

export async function googleSigningKeys(fetcher: typeof fetch = fetch, refresh = false) {
  if (!refresh && cachedKeys && Date.now() - cachedKeys.fetchedAt < 60 * 60 * 1000) return cachedKeys.keys;
  const response = await fetcher(GOOGLE_JWKS_ENDPOINT, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Google signing keys are unavailable.");
  const data = (await response.json()) as { keys?: Jwk[] };
  cachedKeys = { keys: Array.isArray(data.keys) ? data.keys : [], fetchedAt: Date.now() };
  return cachedKeys.keys;
}

/** Verifies an ID token's RS256 signature and every claim this application relies on. */
export async function verifyIdToken(idToken: string, input: { clientId: string; nonce: string; keys: (refresh: boolean) => Promise<Jwk[]>; now?: number }): Promise<GoogleClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token.");
  const [rawHeader, rawPayload, rawSignature] = parts;
  const header = JSON.parse(Buffer.from(rawHeader, "base64url").toString("utf8")) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unexpected ID token algorithm.");
  let jwk = (await input.keys(false)).find((key) => key.kid === header.kid);
  if (!jwk) jwk = (await input.keys(true)).find((key) => key.kid === header.kid); // Google rotated its keys
  if (!jwk) throw new Error("Unknown ID token signing key.");
  const valid = verify("RSA-SHA256", Buffer.from(`${rawHeader}.${rawPayload}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(rawSignature, "base64url"));
  if (!valid) throw new Error("ID token signature is invalid.");
  const claims = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8")) as Record<string, unknown>;
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!ISSUERS.has(String(claims.iss))) throw new Error("ID token issuer is not Google.");
  if (!audiences.includes(input.clientId)) throw new Error("ID token was issued for another application.");
  if (typeof claims.exp !== "number" || claims.exp + 60 < now) throw new Error("ID token has expired.");
  if (typeof claims.iat === "number" && claims.iat - 300 > now) throw new Error("ID token is not valid yet.");
  if (claims.nonce !== input.nonce) throw new Error("ID token nonce does not match this sign-in.");
  if (claims.email_verified !== true || typeof claims.email !== "string" || !claims.email.includes("@")) throw new Error("Google has not verified this email address.");
  if (typeof claims.sub !== "string" || !claims.sub) throw new Error("ID token has no subject.");
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: typeof claims.name === "string" ? claims.name : undefined, picture: typeof claims.picture === "string" ? claims.picture : undefined };
}

/** Server-to-server code exchange; the client secret never reaches the browser. */
export async function exchangeCode(input: { code: string; verifier: string; redirectUri: string; config: GoogleConfiguration }, fetcher: typeof fetch = fetch) {
  const response = await fetcher(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: input.code, client_id: input.config.clientId, client_secret: input.config.clientSecret, redirect_uri: input.redirectUri, grant_type: "authorization_code", code_verifier: input.verifier }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!response.ok || !data.id_token) throw new Error(`Google token exchange failed${data.error ? `: ${data.error}` : ""}.`);
  return data.id_token;
}
