import { createHmac } from "node:crypto";

type Environment = Record<string, string | undefined>;

export type RelayConfiguration = {
  urls: string[];
  /** "ephemeral" signs short-lived credentials with a shared secret (coturn `use-auth-secret`). */
  mode: "ephemeral" | "static";
  username?: string;
  credential?: string;
  secret?: string;
};

export type ClientIceServer = { urls: string | string[]; username?: string; credential?: string };

const TURN_URL = /^turns?:([a-z0-9.-]+)(?::(\d{1,5}))?(?:\?transport=(udp|tcp))?$/i;
const STUN_URL = /^stun:([a-z0-9.-]+)(?::(\d{1,5}))?$/i;
const MIN_SECRET_LENGTH = 32;
export const RELAY_CREDENTIAL_TTL_SECONDS = 6 * 60 * 60;

function parseUrls(value: string | undefined, pattern: RegExp) {
  const urls = (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const valid = urls.length > 0 && urls.length <= 8 && urls.every((url) => {
    const match = pattern.exec(url);
    return Boolean(match && (!match[2] || (Number(match[2]) > 0 && Number(match[2]) <= 65535)));
  });
  return valid ? urls : null;
}

/**
 * Production rooms require the project's authenticated TURN relay. Prefer a
 * shared secret so browsers only ever receive short-lived, per-user relay
 * credentials; a static username/password remains supported for existing relays.
 */
export function conferenceConfiguration(env: Environment = process.env) {
  const urls = parseUrls(env.TURN_URL, TURN_URL);
  const secret = env.TURN_SECRET?.trim();
  const username = env.TURN_USERNAME?.trim(), credential = env.TURN_CREDENTIAL?.trim();
  let relay: RelayConfiguration | null = null;
  if (urls && secret && secret.length >= MIN_SECRET_LENGTH) relay = { urls, mode: "ephemeral", secret };
  else if (urls && !secret && username && credential) relay = { urls, mode: "static", username, credential };
  const stun = parseUrls(env.STUN_URLS, STUN_URL);
  return { enabled: env.CONFERENCE_ENABLED !== "false" && (env.NODE_ENV !== "production" || Boolean(relay)), relay, stun };
}

/** coturn REST-API credentials: username `<expiry>:<identity>`, password HMAC-SHA1(secret, username). */
export function relayCredentials(relay: RelayConfiguration, identity: string, now = Date.now(), ttlSeconds = RELAY_CREDENTIAL_TTL_SECONDS): ClientIceServer {
  if (relay.mode === "static") return { urls: relay.urls, username: relay.username, credential: relay.credential };
  const expiry = Math.floor(now / 1000) + ttlSeconds;
  const username = `${expiry}:${identity.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) || "participant"}`;
  const password = createHmac("sha1", relay.secret ?? "").update(username).digest("base64");
  return { urls: relay.urls, username, credential: password };
}

/** ICE servers for one authorized participant. Never send the shared secret itself. */
export function participantIceServers(identity: string, env: Environment = process.env): ClientIceServer[] {
  const { relay, stun } = conferenceConfiguration(env);
  return [...(stun ? [{ urls: stun }] : []), ...(relay ? [relayCredentials(relay, identity)] : [])];
}

export const nativeConferenceAvailable = () => conferenceConfiguration().enabled;
