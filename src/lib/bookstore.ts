import { createHmac } from "node:crypto";
import { isIP } from "node:net";
export * from "@/lib/bookstore-shared";

export function storeRateKey(headers: Pick<Headers, "get">) {
  const secret = process.env.STORE_RATE_LIMIT_SECRET ?? process.env.CONTACT_RATE_LIMIT_SECRET ?? process.env.CRON_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure a store rate-limit secret of at least 32 characters.");
  const address = process.env.VERCEL === "1" ? headers.get("x-forwarded-for")?.split(",")[0]?.trim() : "local";
  if (process.env.VERCEL === "1" && (!address || !isIP(address))) throw new Error("Trusted client address is unavailable.");
  return createHmac("sha256", secret).update(address ?? "local").digest("hex");
}
