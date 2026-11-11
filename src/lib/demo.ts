/** Review identities and account provisioning are confined to local development. */
export function isDemoEnabled() {
  if (process.env.NODE_ENV === "production" || process.env.PURPOSE_DEMO_OPEN !== "true") return false;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL ?? "").hostname);
  } catch {
    return false;
  }
}
