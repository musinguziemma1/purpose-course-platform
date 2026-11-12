import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountInvitations, emailEvents, notificationOutbox, notificationPreferences, profiles, users } from "@/db/schema";
import { decryptEmail, emailConfiguration, encryptEmail, type EmailRequest } from "@/lib/email";
import { TEMPLATES } from "@/lib/notifications";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Outbox = typeof notificationOutbox.$inferSelect;
type SendResult = { id: string } | { error: string; retryable: boolean };
type Transport = (request: EmailRequest, key: string) => Promise<SendResult>;
const RETRY_WINDOW = 23 * 60 * 60 * 1000; // Resend retains idempotency keys for 24 hours.

export async function sendWithResend(request: EmailRequest, key: string): Promise<SendResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${emailConfiguration().apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(request), signal: AbortSignal.timeout(12_000), redirect: "error" });
    if (!response.ok) return { error: `Resend returned HTTP ${response.status}.`, retryable: response.status === 429 || response.status === 408 || response.status >= 500 };
    const result = await response.json();
    if (typeof result.id !== "string" || result.id.length > 96) return { error: "Resend returned an incomplete response; delivery requires reconciliation.", retryable: true };
    return { id: result.id };
  } catch { return { error: "Resend request did not complete; delivery is unconfirmed.", retryable: true }; }
}

async function claim(id?: number) {
  const config = emailConfiguration();
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(notificationOutbox).where(and(eq(notificationOutbox.channel, "email"), id ? eq(notificationOutbox.id, id) : undefined, sql`(${notificationOutbox.status} = 'queued' and ${notificationOutbox.scheduledAt} <= clock_timestamp()) or (${notificationOutbox.status} = 'processing' and ${notificationOutbox.lockedUntil} < clock_timestamp())`)).orderBy(notificationOutbox.scheduledAt).for("update", { skipLocked: true }).limit(1);
    if (!row) return null;
    const now = new Date((await tx.execute(sql`select clock_timestamp() as now`)).rows[0].now as string);
    const stop = async (status: string, error: string) => {
      await tx.update(notificationOutbox).set({ status, error, lockedUntil: null, leaseToken: null }).where(eq(notificationOutbox.id, row.id));
      return { stopped: true as const, id: row.id, status };
    };
    if (row.firstAttemptAt && (now.getTime() - row.firstAttemptAt.getTime() >= RETRY_WINDOW || row.attempts >= 8)) return stop("needs_review", "Automatic retries stopped to avoid duplicate delivery. Reconcile with Resend before resending.");
    if (row.invitationId) {
      const [invitation] = await tx.select().from(accountInvitations).where(eq(accountInvitations.id, row.invitationId)).limit(1);
      if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= now) return stop("cancelled", "Invitation is no longer active.");
    } else if (row.templateKey === "account.invitation") return stop("cancelled", "Invitation is no longer available.");
    let recipient = row.recipientEmail;
    if (row.profileId) {
      const [account] = await tx.select({ email: users.email, active: users.isActive, demo: users.isDemoAccount }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).where(eq(profiles.id, row.profileId)).limit(1);
      if (!account?.active) return stop("cancelled", "Recipient account is inactive or unavailable.");
      if (account.demo) return stop("cancelled", "Practice accounts do not receive outbound email.");
      if (recipient && recipient !== account.email) return stop("cancelled", "Recipient address changed.");
      recipient = account.email;
      const category = TEMPLATES[row.templateKey]?.category;
      if (category) {
        const [preference] = await tx.select({ email: notificationPreferences.email, digest: notificationPreferences.digest }).from(notificationPreferences).where(and(eq(notificationPreferences.profileId, row.profileId), eq(notificationPreferences.category, category))).limit(1);
        if (preference && (!preference.email || preference.digest !== "instant")) return stop("cancelled", "Recipient disabled instant email for this category.");
      }
    }
    if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) return stop("failed", "No valid recipient address.");
    let request: EmailRequest;
    try { request = row.requestCiphertext ? decryptEmail(row.requestCiphertext) : { from: config.from, to: [recipient], subject: row.subject, text: row.body.replace(/Open: (\/(?!\/)[^\s]*)/g, (_match, path) => `Open: ${config.origin}${path}`) }; }
    catch { return stop("needs_review", "Stored request cannot be decrypted. Restore the original encryption key before retrying."); }
    if (request.to.length !== 1 || request.to[0] !== recipient) return stop("cancelled", "Stored recipient no longer matches this notification.");
    const leaseToken = randomUUID();
    await tx.update(notificationOutbox).set({ status: "processing", leaseToken, lockedUntil: sql`clock_timestamp() + interval '2 minutes'`, firstAttemptAt: row.firstAttemptAt ?? now, attempts: row.attempts + 1, recipientEmail: recipient, requestCiphertext: row.requestCiphertext ?? encryptEmail(request), error: null }).where(eq(notificationOutbox.id, row.id));
    return { stopped: false as const, row, leaseToken, request };
  });
}

const priority: Record<string, number> = { accepted: 0, delivered: 1, failed: 2, suppressed: 3, bounced: 4, complained: 5 };
async function applyEvent(tx: Tx, row: Outbox, event: string, occurredAt: Date) {
  const status = event === "email.sent" ? "accepted" : event.slice(6);
  if (priority[status] === undefined || (priority[row.status] ?? -1) > priority[status]) return;
  await tx.update(notificationOutbox).set({ status, deliveredAt: status === "delivered" ? occurredAt : row.deliveredAt, sentAt: row.sentAt ?? occurredAt }).where(eq(notificationOutbox.id, row.id));
}

export async function deliverQueuedEmails(options: { limit?: number; id?: number; transport?: Transport } = {}) {
  emailConfiguration();
  const results: { id: number; status: string }[] = [];
  for (let count = 0; count < Math.min(options.limit ?? 3, 3); count++) {
    const item = await claim(options.id);
    if (!item) break;
    if (item.stopped) { results.push({ id: item.id, status: item.status }); continue; }
    const outcome = await (options.transport ?? sendWithResend)(item.request, `purpose-outbox/${item.row.id}`);
    const status = await db.transaction(async (tx) => {
      if ("id" in outcome) await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${outcome.id}, 8513))`);
      const [row] = await tx.select().from(notificationOutbox).where(and(eq(notificationOutbox.id, item.row.id), eq(notificationOutbox.leaseToken, item.leaseToken), eq(notificationOutbox.status, "processing"))).for("update").limit(1);
      if (!row) return "changed";
      if ("error" in outcome) {
        const retry = outcome.retryable && row.attempts < 8;
        const next = retry ? "queued" : outcome.retryable ? "needs_review" : "failed";
        await tx.update(notificationOutbox).set({ status: next, error: outcome.error, leaseToken: null, lockedUntil: null, scheduledAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** row.attempts) * 1000) }).where(eq(notificationOutbox.id, row.id));
        await tx.insert(emailEvents).values({ outboxId: row.id, profileId: row.profileId, provider: "resend", event: retry ? "retry_scheduled" : next, detail: outcome.error });
        return next;
      }
      await tx.update(notificationOutbox).set({ status: "accepted", providerId: outcome.id, sentAt: new Date(), leaseToken: null, lockedUntil: null, error: null }).where(eq(notificationOutbox.id, row.id));
      await tx.insert(emailEvents).values({ outboxId: row.id, profileId: row.profileId, provider: "resend", event: "accepted", providerMessageId: outcome.id, detail: "Resend accepted the message for delivery." });
      // A signed webhook can arrive before the HTTP response is persisted.
      const pending = await tx.select().from(emailEvents).where(and(eq(emailEvents.provider, "resend"), eq(emailEvents.providerMessageId, outcome.id))).orderBy(emailEvents.createdAt);
      for (const event of pending.filter((event) => event.providerEventId)) {
        await tx.update(emailEvents).set({ outboxId: row.id, profileId: row.profileId }).where(eq(emailEvents.id, event.id));
        const [latest] = await tx.select().from(notificationOutbox).where(eq(notificationOutbox.id, row.id));
        await applyEvent(tx, latest, event.event, event.createdAt);
      }
      return "accepted";
    });
    results.push({ id: item.row.id, status });
    if (options.id) break;
  }
  return results;
}

export async function recordEmailWebhook(eventId: string, event: { type: string; created_at: string; data: { email_id: string } }) {
  if (!/^email\.(sent|delivered|bounced|complained|failed|suppressed|delivery_delayed|opened|clicked)$/.test(event.type)) return;
  const occurredAt = new Date(event.created_at);
  if (!eventId || eventId.length > 160 || typeof event.data?.email_id !== "string" || event.data.email_id.length > 96 || Number.isNaN(occurredAt.getTime())) throw new Error("Invalid email event.");
  await db.transaction(async (tx) => {
    // Serialize with response persistence, including the early-webhook race.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${event.data.email_id}, 8513))`);
    const [row] = await tx.select().from(notificationOutbox).where(eq(notificationOutbox.providerId, event.data.email_id)).for("update").limit(1);
    const inserted = await tx.insert(emailEvents).values({ providerEventId: eventId, providerMessageId: event.data.email_id, outboxId: row?.id, profileId: row?.profileId, provider: "resend", event: event.type, createdAt: occurredAt }).onConflictDoNothing({ target: emailEvents.providerEventId }).returning({ id: emailEvents.id });
    if (inserted.length && row) await applyEvent(tx, row, event.type, occurredAt);
  });
}
