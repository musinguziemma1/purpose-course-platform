import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const CONTACT_STATUSES = ["new", "in_progress", "resolved"] as const;
export const isUuid = (value: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export const validContactEmail = (value: string) => value.length <= 255 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

export function contactRateKey(headers: Pick<Headers, "get">) {
  const secret = process.env.CONTACT_RATE_LIMIT_SECRET ?? process.env.CRON_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure a contact rate-limit secret of at least 32 characters.");
  // Vercel overwrites this header. Other deployments must configure a trusted proxy.
  const address = process.env.VERCEL === "1" ? headers.get("x-forwarded-for")?.split(",")[0]?.trim() : "local";
  if (process.env.VERCEL === "1" && (!address || !isIP(address))) throw new Error("Trusted client address is unavailable.");
  return createHmac("sha256", secret).update(address ?? "local").digest("hex");
}
