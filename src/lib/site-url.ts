export function publicOrigin(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.APP_URL?.trim();
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const url = new URL(configured || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"));
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("APP_URL must be an HTTPS origin (local HTTP is allowed for review).");
  }
  return url.origin;
}

export function publicUrl(path: string) {
  return new URL(path, publicOrigin()).toString();
}
