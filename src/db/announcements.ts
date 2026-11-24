import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, announcements, cohortMembers, cohorts, notifications, profiles, roles, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { currentActor } from "@/db/actor";
import { can } from "@/lib/rbac";
import { whenSchemaReady } from "@/db/schema-readiness";

const PENDING_ERROR = "Announcements are still being set up on this site. Apply the pending database migration, then try again.";

export const AUDIENCES = ["everyone", "learners", "mentors", "staff", "cohort"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABELS: Record<Audience, string> = {
  everyone: "Everyone", learners: "All learners", mentors: "Mentors and instructors", staff: "Staff", cohort: "One cohort",
};
const AUDIENCE_ROLES: Record<Exclude<Audience, "everyone" | "cohort">, string[]> = {
  learners: ["student"],
  mentors: ["mentor", "instructor"],
  staff: ["super_admin", "platform_admin", "program_manager", "editor", "author", "moderator"],
};

export type AnnouncementState = { ok?: boolean; error?: string; message?: string };
type Actor = { roleSlug: string; permissions?: string[] } | null | undefined;

export function canManageAnnouncements(actor: Actor) {
  return can(actor, "content.publish") || can(actor, "notifications.manage");
}

/** Internal paths or HTTPS links only; never javascript: or protocol-relative URLs. */
export function safeAnnouncementHref(value: string) {
  const href = value.trim();
  if (!href) return null;
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href.slice(0, 240);
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? url.toString().slice(0, 240) : undefined;
  } catch {
    return undefined;
  }
}

/** Which audiences include this viewer (cohort membership is checked in SQL). */
function viewerAudiences(viewer: SessionUser) {
  const list: Audience[] = ["everyone"];
  for (const [audience, slugs] of Object.entries(AUDIENCE_ROLES)) if (slugs.includes(viewer.roleSlug)) list.push(audience as Audience);
  return list;
}

export async function getActiveAnnouncements(viewer: SessionUser | null, limit = 3) {
  if (!viewer) return [];
  const now = new Date();
  return whenSchemaReady("Announcements", () => db.select({ id: announcements.id, title: announcements.title, body: announcements.body, href: announcements.href, pinned: announcements.pinned, publishedAt: announcements.publishedAt })
    .from(announcements)
    .where(and(
      eq(announcements.status, "published"),
      or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
      or(
        inArray(announcements.audience, viewerAudiences(viewer)),
        and(eq(announcements.audience, "cohort"), sql`exists (select 1 from ${cohortMembers} where ${cohortMembers.cohortId} = ${announcements.cohortId} and ${cohortMembers.profileId} = ${viewer.profileId} and ${cohortMembers.status} = 'active')`),
      ),
    ))
    .orderBy(desc(announcements.pinned), desc(announcements.publishedAt))
    .limit(limit), []);
}

export async function listAnnouncements(viewer: SessionUser | null) {
  if (!canManageAnnouncements(viewer)) return null;
  const cohortRows = await db.select({ id: cohorts.id, name: cohorts.name }).from(cohorts).where(inArray(cohorts.status, ["draft", "planned", "active"])).orderBy(asc(cohorts.name));
  const rows = await whenSchemaReady("Announcements", () =>
    db.select({ announcement: announcements, author: profiles.fullName, cohortName: cohorts.name })
      .from(announcements).leftJoin(profiles, eq(announcements.authorId, profiles.id)).leftJoin(cohorts, eq(announcements.cohortId, cohorts.id))
      .orderBy(asc(sql`case ${announcements.status} when 'draft' then 0 when 'published' then 1 else 2 end`), desc(announcements.updatedAt)).limit(100), null);
  return { rows: rows ?? [], cohorts: cohortRows, ready: rows !== null };
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function recipientsFor(tx: Transaction, audience: Audience, cohortId: number | null) {
  const active = and(eq(users.isActive, true), eq(users.isDemoAccount, false));
  if (audience === "cohort") {
    if (!cohortId) return [];
    return tx.select({ id: profiles.id }).from(cohortMembers).innerJoin(profiles, eq(cohortMembers.profileId, profiles.id)).innerJoin(users, eq(profiles.userId, users.id))
      .where(and(eq(cohortMembers.cohortId, cohortId), eq(cohortMembers.status, "active"), active))
      .orderBy(profiles.id);
  }
  const query = tx.select({ id: profiles.id }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).innerJoin(roles, eq(profiles.roleId, roles.id));
  // A fixed order means concurrent publishes lock recipient profiles in the same sequence (no deadlocks).
  return (audience === "everyone" ? query.where(active) : query.where(and(active, inArray(roles.slug, AUDIENCE_ROLES[audience])))).orderBy(profiles.id);
}

export async function saveAnnouncement(input: Record<string, string>, viewer: SessionUser | null, publish: boolean): Promise<AnnouncementState> {
  const id = Number(input.id || 0), version = Number(input.version || 0);
  const title = (input.title ?? "").trim(), body = (input.body ?? "").trim().replaceAll("\r\n", "\n");
  const audience = input.audience as Audience;
  const cohortId = audience === "cohort" ? Number(input.cohortId) : null;
  const href = safeAnnouncementHref(input.href ?? "");
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (title.length < 4 || title.length > 160) return { error: "Write a title of 4 to 160 characters." };
  if (body.length < 10 || body.length > 4000) return { error: "Write a message of 10 to 4,000 characters." };
  if (!AUDIENCES.includes(audience)) return { error: "Choose who should see this announcement." };
  if (audience === "cohort" && (!Number.isInteger(cohortId) || !cohortId)) return { error: "Choose the cohort for this announcement." };
  if (href === undefined) return { error: "Links must be a page on this site (starting with /) or an https:// address." };
  if (expiresAt && (Number.isNaN(expiresAt.valueOf()) || expiresAt.getTime() <= Date.now())) return { error: "Choose an expiry date in the future, or leave it empty." };
  if (!Number.isInteger(id) || id < 0 || !Number.isInteger(version) || version < 0) return { error: "Refresh the page before saving." };

  return whenSchemaReady<AnnouncementState>("Announcements", () => db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (!actor || !canManageAnnouncements(actor)) return { error: "You do not have permission to publish announcements." };
    if (cohortId) {
      const [cohort] = await tx.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
      if (!cohort) return { error: "That cohort no longer exists." };
    }
    const values = { title, body, audience, cohortId, href: href ?? null, pinned: input.pinned === "on", expiresAt, updatedAt: new Date() };
    let announcementId = id;
    let wasPublished = false;
    if (id) {
      const [current] = await tx.select().from(announcements).where(eq(announcements.id, id)).for("update").limit(1);
      if (!current) return { error: "That announcement no longer exists." };
      if (current.version !== version) return { error: "Someone else changed this announcement. Refresh before saving." };
      if (current.status === "archived") return { error: "Archived announcements cannot be edited." };
      wasPublished = current.status === "published";
      await tx.update(announcements).set({ ...values, version: current.version + 1, ...(publish && !wasPublished ? { status: "published", publishedAt: new Date() } : {}) }).where(eq(announcements.id, id));
    } else {
      const [created] = await tx.insert(announcements).values({ ...values, authorId: actor.profileId, ...(publish ? { status: "published", publishedAt: new Date() } : {}) }).returning({ id: announcements.id });
      announcementId = created.id;
    }
    let reached = 0;
    if (publish && !wasPublished) {
      const recipients = await recipientsFor(tx, audience, cohortId);
      if (recipients.length) {
        await tx.insert(notifications).values(recipients.map((recipient) => ({
          recipientId: recipient.id, type: "system" as const, title: `Announcement: ${title}`.slice(0, 200), body: body.slice(0, 500),
          href: href ?? null, templateKey: "announcement.published", dedupeKey: `announcement:${announcementId}:${recipient.id}`,
        })));
      }
      reached = recipients.length;
    }
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: publish && !wasPublished ? "announcement.published" : "announcement.saved", entityType: "announcement", entityId: String(announcementId), description: `${publish && !wasPublished ? "Published" : "Saved"} the announcement “${title}”${publish && !wasPublished ? ` to ${reached} people` : ""}.` });
    return { ok: true, message: publish && !wasPublished ? `Published to ${reached} ${reached === 1 ? "person" : "people"}.` : "Announcement saved." };
  }), { error: PENDING_ERROR });
}

export async function archiveAnnouncement(id: number, version: number, viewer: SessionUser | null): Promise<AnnouncementState> {
  if (!Number.isInteger(id) || !Number.isInteger(version)) return { error: "Refresh the page and try again." };
  return whenSchemaReady<AnnouncementState>("Announcements", () => db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (!actor || !canManageAnnouncements(actor)) return { error: "You do not have permission to manage announcements." };
    const [current] = await tx.select().from(announcements).where(eq(announcements.id, id)).for("update").limit(1);
    if (!current) return { error: "That announcement no longer exists." };
    if (current.version !== version) return { error: "Someone else changed this announcement. Refresh first." };
    await tx.update(announcements).set({ status: "archived", version: current.version + 1, updatedAt: new Date() }).where(eq(announcements.id, id));
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "announcement.archived", entityType: "announcement", entityId: String(id), description: `Archived the announcement “${current.title}”.` });
    return { ok: true, message: "Announcement archived." };
  }), { error: PENDING_ERROR });
}
