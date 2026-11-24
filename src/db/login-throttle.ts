import { createHash } from "node:crypto";
import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";
import { whenSchemaReady } from "@/db/schema-readiness";

export const LOGIN_WINDOW_MINUTES = 15;
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_ADDRESS = 20;

export const hashLoginEmail = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

const recentFailures = () => and(eq(authAttempts.succeeded, false), gt(authAttempts.createdAt, sql`now() - make_interval(mins => ${LOGIN_WINDOW_MINUTES})`));

/** True when this account or connection has failed too often recently. Never blocks while the table is pending. */
export async function loginBlocked(input: { emailHash: string; rateKey: string | null }) {
  return whenSchemaReady("Sign-in throttling", async () => {
    const [byEmail] = await db.select({ value: count() }).from(authAttempts).where(and(recentFailures(), eq(authAttempts.emailHash, input.emailHash)));
    if (Number(byEmail?.value ?? 0) >= MAX_FAILURES_PER_EMAIL) return true;
    if (!input.rateKey) return false;
    const [byAddress] = await db.select({ value: count() }).from(authAttempts).where(and(recentFailures(), eq(authAttempts.rateKey, input.rateKey)));
    return Number(byAddress?.value ?? 0) >= MAX_FAILURES_PER_ADDRESS;
  }, false);
}

/** Records the outcome; a success clears that account's earlier failures. */
export async function recordLoginAttempt(input: { emailHash: string; rateKey: string | null; succeeded: boolean }) {
  await whenSchemaReady("Sign-in throttling", async () => {
    if (input.succeeded) await db.delete(authAttempts).where(and(eq(authAttempts.emailHash, input.emailHash), eq(authAttempts.succeeded, false)));
    await db.insert(authAttempts).values({ emailHash: input.emailHash, rateKey: input.rateKey, succeeded: input.succeeded });
  }, undefined);
}

/** Maintenance: attempts are only useful for a short window. */
export async function purgeLoginAttempts() {
  return whenSchemaReady("Sign-in throttling", async () => {
    const removed = await db.delete(authAttempts).where(lt(authAttempts.createdAt, sql`now() - interval '1 day'`)).returning({ id: authAttempts.id });
    return removed.length;
  }, 0);
}
