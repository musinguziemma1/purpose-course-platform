import { pathToFileURL } from "node:url";

export async function probeProduction(origin, request = fetch) {
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Use the canonical HTTPS production origin.");
  const checks = [];
  for (const [name, path] of [["database health", "/api/health"], ["event calendar", "/api/events"], ["sign in", "/login"]]) {
    let ok = false, status = null;
    try {
      const response = await request(url.origin + path, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
      status = response.status;
      ok = status === 200 && (path !== "/api/health" || (await response.json()).ok === true);
      await response.body?.cancel().catch(() => {});
    } catch { /* Do not log untrusted error text or response bodies. */ }
    checks.push({ name, ok, status });
  }
  return { ok: checks.every(check => check.ok), checkedAt: new Date().toISOString(), checks };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await probeProduction(process.env.PRODUCTION_ORIGIN ?? "https://purpose-course-platform.vercel.app");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
