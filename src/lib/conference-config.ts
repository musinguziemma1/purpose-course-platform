type Environment = Record<string, string | undefined>;

/** Production rooms need an authenticated relay; an external meeting remains usable without one. */
export function conferenceConfiguration(env: Environment = process.env) {
  const urls = (env.TURN_URL ?? "").split(",").map(value => value.trim()).filter(Boolean);
  const validUrls = urls.length > 0 && urls.length <= 8 && urls.every(value => {
    const match = /^turns?:([a-z0-9.-]+)(?::(\d{1,5}))?(?:\?transport=(udp|tcp))?$/i.exec(value);
    return Boolean(match && (!match[2] || (Number(match[2]) > 0 && Number(match[2]) <= 65535)));
  });
  const username = env.TURN_USERNAME?.trim(), credential = env.TURN_CREDENTIAL?.trim();
  const relay = validUrls && username && credential ? { urls, username, credential } : null;
  return { enabled: env.CONFERENCE_ENABLED !== "false" && (env.NODE_ENV !== "production" || Boolean(relay)), relay };
}

export const nativeConferenceAvailable = () => conferenceConfiguration().enabled;
