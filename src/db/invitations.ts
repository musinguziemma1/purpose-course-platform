import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountInvitations, activityLogs, authSessions, notificationOutbox, orgMemberships, organizations, profiles, roles, users } from "@/db/schema";
import { canAssignRole } from "@/lib/admin-access";
import type { SessionUser } from "@/lib/auth";
import { emailConfiguration, encryptEmail } from "@/lib/email";
import { hashPassword, passwordError } from "../../scripts/password-security.mjs";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function issuer(tx: Tx, profileId: string | null) {
  if (!profileId) return null;
  const [actor] = await tx.select({ roleSlug: roles.slug, permissions: roles.permissions }).from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId)).innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(eq(profiles.id, profileId), eq(users.isActive, true))).for("share", { of: profiles }).limit(1);
  return actor ?? null;
}

export async function createInvitation(input: { email: string; fullName: string; roleSlug: string }, actor: SessionUser) {
  if (!canAssignRole(actor, "guest", input.roleSlug) || actor.isDemo) return { error: "Administrator access is required for that role." };
  const email = input.email.trim().toLowerCase(), fullName = input.fullName.trim();
  if (email.length > 255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!fullName || fullName.length > 160) return { error: "Enter the person's full name (up to 160 characters)." };
  const config = emailConfiguration();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${email}, 8512))`);
    const current = await issuer(tx, actor.profileId);
    if (!canAssignRole(current, "guest", input.roleSlug)) return { error: "Your invitation permissions changed. Refresh and try again." };
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return { error: "That account already exists. Use account recovery or change its role in the directory." };
    const [role] = await tx.select().from(roles).where(eq(roles.slug, input.roleSlug)).limit(1);
    if (!role || role.slug === "guest") return { error: "Choose a valid workspace role." };
    const [organization] = await tx.select().from(organizations).where(eq(organizations.status, "active")).orderBy(asc(organizations.id)).limit(1);
    if (!organization) return { error: "Configure the launch organization before inviting people." };
    const old = await tx.update(accountInvitations).set({ revokedAt: new Date() })
      .where(and(eq(accountInvitations.email, email), isNull(accountInvitations.acceptedAt), isNull(accountInvitations.revokedAt))).returning({ id: accountInvitations.id });
    for (const invitation of old) await tx.update(notificationOutbox).set({ status: sql`case when ${notificationOutbox.status} = 'processing' then 'processing' else 'cancelled' end`, requestCiphertext: null, error: "Invitation replaced." }).where(and(eq(notificationOutbox.invitationId, invitation.id), sql`${notificationOutbox.status} in ('queued','processing','needs_review')`));
    const token = randomBytes(32).toString("base64url"), id = randomUUID();
    const [invitation] = await tx.insert(accountInvitations).values({ id, email, fullName, roleId: role.id, organizationId: organization.id, invitedById: actor.profileId, tokenHash: tokenHash(token), expiresAt: sql`clock_timestamp() + interval '48 hours'` }).returning();
    // A URL fragment keeps the bearer token out of server access logs and referrers.
    const url = `${config.origin}/accept-invitation#${token}`;
    await tx.insert(notificationOutbox).values({ invitationId: id, recipientEmail: email, channel: "email", templateKey: "account.invitation", subject: "Your Purpose Course invitation", body: "Account activation invitation (link protected).", requestCiphertext: encryptEmail({ from: config.from, to: [email], subject: "Your Purpose Course invitation", text: `Hello ${fullName},\n\nYou have been invited to Purpose Course as ${role.name}. Set your password to activate your account:\n\n${url}\n\nThis link expires in 48 hours. If you were not expecting this invitation, you can ignore it.` }) });
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "people.invitation_created", entityType: "invitation", entityId: id, description: `Queued a ${role.name} invitation for ${email}.` });
    return { ok: true as const, id: invitation.id, message: `Invitation for ${email} queued for Resend delivery. It expires in 48 hours.` };
  });
}

export async function acceptInvitation(token: string, password: string) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return { error: "This invitation is invalid or no longer available." };
  const invalid = passwordError(password); if (invalid) return { error: invalid };
  const digest = tokenHash(token), passwordHash = hashPassword(password);
  return db.transaction(async (tx) => {
    // Match creation's lock order so replacement and redemption cannot deadlock.
    const [lookup] = await tx.select({ email: accountInvitations.email }).from(accountInvitations).where(eq(accountInvitations.tokenHash, digest)).limit(1);
    if (!lookup) return { error: "This invitation is invalid or no longer available." };
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lookup.email}, 8512))`);
    const [invitation] = await tx.select().from(accountInvitations).where(and(eq(accountInvitations.tokenHash, digest), isNull(accountInvitations.acceptedAt), isNull(accountInvitations.revokedAt), sql`${accountInvitations.expiresAt} > clock_timestamp()`)).for("update").limit(1);
    if (!invitation) return { error: "This invitation is invalid or has expired. Ask your administrator for a new one." };
    const [role] = await tx.select().from(roles).where(eq(roles.id, invitation.roleId)).limit(1);
    const current = await issuer(tx, invitation.invitedById);
    if (!role || !canAssignRole(current, "guest", role.slug)) return { error: "This invitation is no longer authorized. Ask your administrator for a new one." };
    const [organization] = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.status, "active")).orderBy(asc(organizations.id)).limit(1);
    if (organization?.id !== invitation.organizationId) return { error: "This invitation's organization is no longer available." };
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, invitation.email)).limit(1);
    if (existing) return { error: "That account already exists. Sign in or contact your administrator for recovery." };
    const [account] = await tx.insert(users).values({ email: invitation.email, passwordHash, isActive: true }).returning({ id: users.id });
    const [profile] = await tx.insert(profiles).values({ userId: account.id, roleId: role.id, fullName: invitation.fullName, slug: `member-${randomUUID()}`, organizationId: invitation.organizationId }).returning({ id: profiles.id });
    await tx.insert(orgMemberships).values({ organizationId: invitation.organizationId, profileId: profile.id, roleSlug: role.slug, status: "active" });
    await tx.delete(authSessions).where(eq(authSessions.userId, account.id));
    await tx.update(accountInvitations).set({ acceptedAt: sql`clock_timestamp()` }).where(eq(accountInvitations.id, invitation.id));
    await tx.update(notificationOutbox).set({ requestCiphertext: null }).where(eq(notificationOutbox.invitationId, invitation.id));
    await tx.insert(activityLogs).values({ actorId: profile.id, action: "people.invitation_accepted", entityType: "invitation", entityId: invitation.id, description: "Activated an invited account." });
    // Enrollment remains a separate, explicit staff decision.
    return { ok: true as const };
  });
}

export async function revokeInvitation(id: string, actor: SessionUser) {
  if (actor.isDemo || !/^[a-f0-9-]{36}$/i.test(id)) return false;
  return db.transaction(async (tx) => {
    const [invitation] = await tx.select({ email: accountInvitations.email }).from(accountInvitations).where(eq(accountInvitations.id, id)).limit(1);
    if (!invitation) return false;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${invitation.email}, 8512))`);
    const [target] = await tx.select({ roleSlug: roles.slug }).from(accountInvitations).innerJoin(roles, eq(accountInvitations.roleId, roles.id)).where(and(eq(accountInvitations.id, id), isNull(accountInvitations.acceptedAt), isNull(accountInvitations.revokedAt))).for("update", { of: accountInvitations }).limit(1);
    if (!target || !canAssignRole(await issuer(tx, actor.profileId), "guest", target.roleSlug)) return false;
    await tx.update(accountInvitations).set({ revokedAt: new Date() }).where(eq(accountInvitations.id, id));
    await tx.update(notificationOutbox).set({ status: sql`case when ${notificationOutbox.status} = 'processing' then 'processing' else 'cancelled' end`, requestCiphertext: null, error: "Invitation revoked." }).where(and(eq(notificationOutbox.invitationId, id), sql`${notificationOutbox.status} in ('queued','processing','needs_review')`));
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "people.invitation_revoked", entityType: "invitation", entityId: id, description: "Revoked a pending invitation." });
    return true;
  });
}
