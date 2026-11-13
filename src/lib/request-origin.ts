/** Next may normalize request.url to localhost behind a proxy. Origin is
 * checked against configured app identity or the browser-facing trusted host. */
export function isSameOriginRequest(request: Pick<Request, "url" | "headers">, env: NodeJS.ProcessEnv = process.env) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin) return false;
    if (env.APP_URL && parsed.origin === new URL(env.APP_URL).origin) return true;
    const host = env.VERCEL === "1" ? request.headers.get("x-forwarded-host") ?? request.headers.get("host") : request.headers.get("host");
    const protocol = env.VERCEL === "1" ? "https:" : new URL(request.url).protocol;
    return Boolean(host && parsed.host === host && parsed.protocol === protocol);
  } catch { return false; }
}
