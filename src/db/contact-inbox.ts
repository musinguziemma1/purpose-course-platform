import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, contactEnquiries, contactReplies, notificationOutbox, notifications, profiles, roles, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { CONTACT_STATUSES, isUuid, validContactEmail } from "@/lib/contact";
import { emailConfiguration, encryptEmail } from "@/lib/email";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ContactState = { ok?: boolean; error?: string; message?: string };
export type ContactInput = { submissionId: string; fullName: string; email: string; subject: string; body: string; website?: string };
const received = { ok: true, message: "Thank you. Your enquiry has been received by the Purpose Course team. We will use the email address you provided if a reply is needed." };

async function authorize(tx: Tx, actor: SessionUser | null) {
  if (!actor || actor.isDemo) return false;
  const [current] = await tx.select({ roleSlug: roles.slug, permissions: roles.permissions }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).innerJoin(roles, eq(profiles.roleId, roles.id)).where(and(eq(profiles.id, actor.profileId), eq(users.isActive, true))).for("share", { of: profiles }).limit(1);
  return can(current, "contact.manage");
}

export async function submitContactEnquiry(input: ContactInput, sender: SessionUser | null, rateKey: string): Promise<ContactState> {
  if (input.website) return received;
  const fullName = input.fullName.trim(), email = input.email.trim().toLowerCase(), subject = input.subject.trim(), body = input.body.trim().replaceAll("\r\n", "\n");
  if (!isUuid(input.submissionId) || !/^[a-f0-9]{64}$/.test(rateKey)) return { error: "Refresh this page before sending your enquiry." };
  if (!fullName || fullName.length > 160) return { error: "Use a name of up to 160 characters." };
  if (!validContactEmail(email)) return { error: "Enter a valid email address." };
  if (subject.length < 4 || subject.length > 240) return { error: "Use a subject of 4 to 240 characters." };
  if (body.length < 30 || body.length > 10000) return { error: "Use a message of 30 to 10,000 characters." };
  const fingerprint = createHash("sha256").update(JSON.stringify([fullName, email, subject, body])).digest("hex");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${rateKey}, 8520))`);
    const [existing] = await tx.select({ fingerprint: contactEnquiries.fingerprint }).from(contactEnquiries).where(eq(contactEnquiries.id, input.submissionId)).limit(1);
    if (existing) return existing.fingerprint === fingerprint ? received : { error: "Refresh this page before sending a different enquiry." };
    const [duplicate] = await tx.select({ id: contactEnquiries.id }).from(contactEnquiries).where(and(eq(contactEnquiries.rateKey, rateKey), eq(contactEnquiries.fingerprint, fingerprint), sql`${contactEnquiries.createdAt} >= clock_timestamp() - interval '10 minutes'`)).limit(1);
    if (duplicate) return received;
    const [recent] = await tx.select({ count: sql<number>`count(*)::int` }).from(contactEnquiries).where(and(eq(contactEnquiries.rateKey, rateKey), sql`${contactEnquiries.createdAt} >= clock_timestamp() - interval '1 hour'`));
    if (recent.count >= 5) return { error: "Too many enquiries were sent recently. Please try again later." };
    const inserted = await tx.insert(contactEnquiries).values({ id: input.submissionId, fullName, email, subject, body, fingerprint, rateKey, senderProfileId: sender && !sender.isDemo ? sender.profileId : null }).onConflictDoNothing({ target: contactEnquiries.id }).returning({ id: contactEnquiries.id });
    if (!inserted.length) return { error: "This submission was already used. Refresh and try again." };
    const recipients = await tx.select({ id: profiles.id }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).innerJoin(roles, eq(profiles.roleId, roles.id)).where(and(eq(users.isActive, true), sql`(${roles.permissions} @> '["contact.manage"]'::jsonb or ${roles.slug} in ('super_admin','platform_admin'))`));
    if (recipients.length) await tx.insert(notifications).values(recipients.map((recipient) => ({ recipientId: recipient.id, type: "system" as const, title: "New website enquiry", body: "An enquiry is waiting in the staff contact inbox.", href: `/admin/contact/${input.submissionId}`, templateKey: "contact.message_received" })));
    await tx.insert(activityLogs).values({ actorId: sender && !sender.isDemo ? sender.profileId : null, action: "contact.received", entityType: "contact_enquiry", entityId: input.submissionId, description: "Received a website enquiry." });
    return received;
  });
}

export async function getContactInbox(actor: SessionUser | null, status?: string, page = 1) {
  return db.transaction(async (tx) => {
    if (!(await authorize(tx, actor))) return [];
    return tx.select({ id: contactEnquiries.id, fullName: contactEnquiries.fullName, email: contactEnquiries.email, subject: contactEnquiries.subject, status: contactEnquiries.status, source: contactEnquiries.source, createdAt: contactEnquiries.createdAt, assignedName: profiles.fullName }).from(contactEnquiries).leftJoin(profiles, eq(contactEnquiries.assignedToId, profiles.id)).where(CONTACT_STATUSES.includes(status as typeof CONTACT_STATUSES[number]) ? eq(contactEnquiries.status, status!) : undefined).orderBy(desc(contactEnquiries.createdAt), desc(contactEnquiries.id)).limit(50).offset((Math.max(1, Math.min(10000, Math.trunc(page) || 1)) - 1) * 50);
  });
}

export async function getContactEnquiry(id: string, actor: SessionUser | null) {
  if (!isUuid(id)) return null;
  return db.transaction(async (tx) => {
    if (!(await authorize(tx, actor))) return null;
    const [enquiry] = await tx.select().from(contactEnquiries).where(eq(contactEnquiries.id, id)).limit(1);
    if (!enquiry) return null;
    const replies = await tx.select({ id: contactReplies.id, body: contactReplies.body, recipientEmail: contactReplies.recipientEmail, createdAt: contactReplies.createdAt, authorName: profiles.fullName, deliveryStatus: notificationOutbox.status, error: notificationOutbox.error }).from(contactReplies).innerJoin(notificationOutbox, eq(contactReplies.outboxId, notificationOutbox.id)).leftJoin(profiles, eq(contactReplies.authorId, profiles.id)).where(eq(contactReplies.enquiryId, id)).orderBy(contactReplies.createdAt);
    return { enquiry, replies };
  });
}

export async function updateContactEnquiry(input: { id: string; version: number; status: string; claim: boolean }, actor: SessionUser | null): Promise<ContactState> {
  if (!isUuid(input.id) || !Number.isInteger(input.version) || !CONTACT_STATUSES.includes(input.status as typeof CONTACT_STATUSES[number])) return { error: "Choose a valid enquiry and status." };
  return db.transaction(async (tx) => {
    if (!(await authorize(tx, actor))) return { error: "Contact inbox permission required." };
    const [enquiry] = await tx.select().from(contactEnquiries).where(eq(contactEnquiries.id, input.id)).for("update").limit(1);
    if (!enquiry) return { error: "Enquiry not found." };
    if (enquiry.version !== input.version) return { error: "This enquiry changed in another window. Refresh before updating it." };
    await tx.update(contactEnquiries).set({ status: input.status, assignedToId: input.claim ? actor!.profileId : enquiry.assignedToId, resolvedAt: input.status === "resolved" ? new Date() : null, version: enquiry.version + 1, updatedAt: new Date() }).where(eq(contactEnquiries.id, input.id));
    await tx.insert(activityLogs).values({ actorId: actor!.profileId, action: "contact.status_updated", entityType: "contact_enquiry", entityId: input.id, description: `Changed enquiry status from ${enquiry.status} to ${input.status}${input.claim ? " and took ownership" : ""}.` });
    return { ok: true, message: "Enquiry updated." };
  });
}

export async function queueContactReply(input: { id: string; replyId: string; body: string; recipientEmail: string }, actor: SessionUser | null): Promise<ContactState> {
  if (!isUuid(input.id) || !isUuid(input.replyId)) return { error: "Refresh before sending a reply." };
  const body = input.body.trim(), recipientEmail = input.recipientEmail.trim().toLowerCase();
  if (body.length < 10 || body.length > 10000) return { error: "Use a reply of 10 to 10,000 characters." };
  if (!validContactEmail(recipientEmail)) return { error: "Confirm a valid recipient email address." };
  return db.transaction(async (tx) => {
    if (!(await authorize(tx, actor))) return { error: "Contact inbox permission required." };
    const [enquiry] = await tx.select().from(contactEnquiries).where(eq(contactEnquiries.id, input.id)).for("update").limit(1);
    if (!enquiry) return { error: "Enquiry not found." };
    if (enquiry.email && enquiry.email !== recipientEmail) return { error: "The recipient must match the enquiry's email address." };
    const [previous] = await tx.select().from(contactReplies).where(eq(contactReplies.id, input.replyId)).limit(1);
    if (previous) return previous.enquiryId === input.id && previous.authorId === actor!.profileId && previous.body === body && previous.recipientEmail === recipientEmail ? { ok: true, message: "This reply is already queued. Check its delivery status below." } : { error: "This reply was already used. Refresh to compose another." };
    const config = emailConfiguration();
    const [outbox] = await tx.insert(notificationOutbox).values({ recipientEmail, channel: "email", templateKey: "contact.reply", subject: `Re: ${enquiry.subject}`.slice(0, 240), body: "Staff reply (message protected).", requestCiphertext: encryptEmail({ from: config.from, to: [recipientEmail], subject: `Re: ${enquiry.subject}`.slice(0, 240), text: `${body}\n\nPurpose Course team` }) }).returning({ id: notificationOutbox.id });
    await tx.insert(contactReplies).values({ id: input.replyId, enquiryId: input.id, authorId: actor!.profileId, body, recipientEmail, outboxId: outbox.id });
    await tx.update(contactEnquiries).set({ status: "in_progress", resolvedAt: null, assignedToId: actor!.profileId, version: enquiry.version + 1, updatedAt: new Date() }).where(eq(contactEnquiries.id, input.id));
    await tx.insert(activityLogs).values({ actorId: actor!.profileId, action: "contact.reply_queued", entityType: "contact_enquiry", entityId: input.id, description: "Queued a staff reply for Resend delivery." });
    return { ok: true, message: "Reply queued for Resend. Delivery status is shown below; queuing does not confirm delivery." };
  });
}
