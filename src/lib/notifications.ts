import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationOutbox, notificationPreferences, notifications } from "@/db/schema";

export const NOTIFICATION_CATEGORIES = [
  "mentorship",
  "learning",
  "community",
  "assessments",
  "sessions",
  "account",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationTemplate = {
  key: string;
  category: NotificationCategory;
  title: (vars: Record<string, string | number>) => string;
  body: (vars: Record<string, string | number>) => string;
  href: (vars: Record<string, string | number>) => string;
  defaultChannels: ("in_app" | "email" | "push")[];
};

export const TEMPLATES: Record<string, NotificationTemplate> = {
  "mentor.reviewed_reflection": {
    key: "mentor.reviewed_reflection",
    category: "mentorship",
    title: () => "Your mentor reviewed your reflection",
    body: (vars) => `${vars.mentorName ?? "Your mentor"} responded to “${vars.title ?? "your reflection"}”.`,
    href: () => "/learn/reflections",
    defaultChannels: ["in_app", "email"],
  },
  "mentor.goal_set": {
    key: "mentor.goal_set",
    category: "mentorship",
    title: () => "A new development goal was set",
    body: (vars) => `${vars.mentorName ?? "Your mentor"} set “${vars.title ?? "a goal"}” with a review date.`,
    href: () => "/learn/goals",
    defaultChannels: ["in_app", "email"],
  },
  "mentor.flagged": {
    key: "mentor.flagged",
    category: "mentorship",
    title: () => "Your mentor would like to check in",
    body: (vars) => vars.reason ? String(vars.reason) : "Your mentor has flagged a follow-up conversation.",
    href: () => "/learn/mentor",
    defaultChannels: ["in_app", "email"],
  },
  "learning.lesson_available": {
    key: "learning.lesson_available",
    category: "learning",
    title: () => "New lesson available",
    body: (vars) => `“${vars.title ?? "A new lesson"}” is now unlocked in ${vars.course ?? "your course"}.`,
    href: (vars) => String(vars.href ?? "/learn/courses"),
    defaultChannels: ["in_app"],
  },
  "learning.assessment_result": {
    key: "learning.assessment_result",
    category: "assessments",
    title: (vars) => (vars.passed ? "Assessment passed" : "Assessment needs another attempt"),
    body: (vars) => `You scored ${vars.score}% on “${vars.title}” (pass mark ${vars.passMark}%).`,
    href: () => "/learn/assessments",
    defaultChannels: ["in_app", "email"],
  },
  "learning.instrument_ready": {
    key: "learning.instrument_ready",
    category: "assessments",
    title: () => "Your assessment result is ready",
    body: (vars) => `“${vars.title}” scored ${vars.score} in the ${vars.band} band.`,
    href: () => "/learn/instruments",
    defaultChannels: ["in_app"],
  },
  "learning.certificate": {
    key: "learning.certificate",
    category: "learning",
    title: () => "Certificate issued",
    body: (vars) => `Your certificate for “${vars.title}” is ready to download.`,
    href: () => "/learn/certificates",
    defaultChannels: ["in_app", "email"],
  },
  "community.reply": {
    key: "community.reply",
    category: "community",
    title: () => "Someone replied to your discussion",
    body: (vars) => `${vars.author ?? "A member"} replied in “${vars.title}”.`,
    href: (vars) => String(vars.href ?? "/community"),
    defaultChannels: ["in_app"],
  },
  "community.mention": {
    key: "community.mention",
    category: "community",
    title: () => "You were mentioned",
    body: (vars) => `${vars.author ?? "A member"} mentioned you in ${vars.title}.`,
    href: () => "/community",
    defaultChannels: ["in_app"],
  },
  "session.reminder": {
    key: "session.reminder",
    category: "sessions",
    title: () => "Your live session is coming up",
    body: (vars) => `“${vars.title}” starts ${vars.when}.`,
    href: (vars) => String(vars.href ?? "/learn/live"),
    defaultChannels: ["in_app", "email", "push"],
  },
  "session.attendance_marked": {
    key: "session.attendance_marked",
    category: "sessions",
    title: () => "Attendance recorded",
    body: (vars) => `You were marked ${vars.status} for “${vars.title}”.`,
    href: () => "/learn/cohort",
    defaultChannels: ["in_app"],
  },
  "contact.message_received": {
    key: "contact.message_received",
    category: "account",
    title: () => "New website enquiry",
    body: (vars) => `${vars.from ?? "A visitor"}: ${vars.subject ?? "a new message"}`,
    href: () => "/admin",
    defaultChannels: ["in_app", "email"],
  },
  "account.role_changed": {
    key: "account.role_changed",
    category: "account",
    title: () => "Your access level changed",
    body: (vars) => `An administrator set your role to ${vars.roleName}.`,
    href: (vars) => String(vars.href ?? "/learn"),
    defaultChannels: ["in_app", "email"],
  },
};

export type NotifyInput = {
  recipientIds: string[];
  templateKey: keyof typeof TEMPLATES | string;
  vars?: Record<string, string | number>;
  channels?: ("in_app" | "email" | "push" | "sms")[];
  dedupeKey?: string;
  type?: "review" | "publish" | "community" | "system";
};

/**
 * Reusable notification service.
 * One call fans out to in-app rows and a channel outbox, respecting each
 * recipient's per-category preferences.
 */
export async function notify(input: NotifyInput) {
  const template = TEMPLATES[input.templateKey];
  if (!template || input.recipientIds.length === 0) return { delivered: 0, queued: 0 };

  const vars = { ...(input.vars ?? {}) };
  const title = template.title(vars);
  const body = template.body(vars);
  const href = template.href(vars);
  const channels = input.channels ?? template.defaultChannels;

  const preferences = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.category, template.category));
  const preferenceByProfile = new Map(preferences.map((row) => [row.profileId, row]));

  let delivered = 0;
  let queued = 0;

  for (const recipientId of Array.from(new Set(input.recipientIds))) {
    const pref = preferenceByProfile.get(recipientId);
    const allowInApp = pref ? pref.inApp : true;
    const allowEmail = pref ? pref.email : true;
    const allowPush = pref ? pref.push : false;

    if (channels.includes("in_app") && allowInApp) {
      await db.insert(notifications).values({
        recipientId,
        type: input.type ?? "system",
        title,
        body,
        href,
        channel: "in_app",
        templateKey: template.key,
        metadata: vars,
        dedupeKey: input.dedupeKey ?? null,
      });
      delivered += 1;
    }

    for (const channel of ["email", "push"] as const) {
      const allowed = channel === "email" ? allowEmail : allowPush;
      if (!channels.includes(channel) || !allowed) continue;
      await db.insert(notificationOutbox).values({
        profileId: recipientId,
        channel,
        templateKey: template.key,
        subject: title,
        body: `${body}${href ? `\n\nOpen: ${href}` : ""}`,
        payload: vars,
      });
      queued += 1;
    }
  }

  return { delivered, queued };
}

export async function getPreferences(profileId: string) {
  const rows = await db.select().from(notificationPreferences).where(eq(notificationPreferences.profileId, profileId));
  const byCategory = new Map(rows.map((row) => [row.category, row]));
  return NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    inApp: byCategory.get(category)?.inApp ?? true,
    email: byCategory.get(category)?.email ?? true,
    push: byCategory.get(category)?.push ?? false,
    digest: byCategory.get(category)?.digest ?? "instant",
  }));
}

export async function savePreference(input: {
  profileId: string;
  category: string;
  inApp: boolean;
  email: boolean;
  push: boolean;
}) {
  await db
    .insert(notificationPreferences)
    .values({
      profileId: input.profileId,
      category: input.category,
      inApp: input.inApp,
      email: input.email,
      push: input.push,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.profileId, notificationPreferences.category],
      set: { inApp: input.inApp, email: input.email, push: input.push, updatedAt: new Date() },
    });
}

export async function getOutbox(limit = 40) {
  return db.select().from(notificationOutbox).orderBy(notificationOutbox.createdAt).limit(limit);
}

export async function markOutboxSent(id: number) {
  await db
    .update(notificationOutbox)
    .set({ status: "sent", sentAt: new Date() })
    .where(and(eq(notificationOutbox.id, id), eq(notificationOutbox.status, "queued")));
}
