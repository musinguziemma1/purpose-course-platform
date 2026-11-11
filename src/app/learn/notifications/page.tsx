import Link from "next/link";
import { Bell, CheckCheck, Mail, MessageSquare, MailOpen } from "lucide-react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, notifications, profiles } from "@/db/schema";
import { getPreferences } from "@/lib/notifications";
import { getAchievements } from "@/db/analytics";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { updateNotificationPreference } from "@/app/actions/platform";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications" };

export default async function LearnerNotificationsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [notificationRows, messageRows, preferences, achievements] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.recipientId, user.profileId)).orderBy(desc(notifications.createdAt)).limit(40),
    db
      .select({ message: messages, senderName: profiles.fullName })
      .from(messages)
      .leftJoin(profiles, eq(messages.senderId, profiles.id))
      .where(eq(messages.recipientId, user.profileId))
      .orderBy(desc(messages.createdAt))
      .limit(20),
    getPreferences(user.profileId),
    getAchievements(user.profileId),
  ]);

  const unread = notificationRows.filter((row) => !row.isRead).length;
  const earned = achievements.filter((row) => row.awardedAt);
  const points = earned.reduce((sum, row) => sum + row.achievement.points, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Notifications & messages</h1>
          <p className="text-[12.5px] text-stone-600">
            One inbox for mentor feedback, assessment results, session reminders and community replies — plus direct
            messages from your faculty.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-xl border border-navy/10 bg-paper px-3.5 py-2 text-center">
            <p className="font-serif text-lg text-navy">{unread}</p>
            <p className="text-[9px] uppercase tracking-[0.08em] text-stone-500">unread</p>
          </span>
          <span className="rounded-xl border border-navy/10 bg-paper px-3.5 py-2 text-center">
            <p className="font-serif text-lg text-navy">{earned.length}</p>
            <p className="text-[9px] uppercase tracking-[0.08em] text-stone-500">achievements</p>
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-4">
          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <Bell className="h-3.5 w-3.5 text-gold-dark" /> In-app notifications
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-stone-500">
                <CheckCheck className="h-3 w-3" /> {notificationRows.length} total
              </span>
            </div>
            <ul className="divide-y divide-navy/8">
              {notificationRows.length === 0 ? (
                <li className="px-5 py-8 text-center text-[12.5px] text-stone-500">
                  Nothing yet. Notifications arrive when a mentor reviews your work, an assessment is graded or someone
                  replies in a community.
                </li>
              ) : (
                notificationRows.map((row) => (
                  <li key={row.id} className={row.isRead ? "" : "bg-gold/5"}>
                    <Link href={row.href ?? "/learn"} className="block px-5 py-3 hover:bg-cream/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12.5px] font-medium text-navy">{row.title}</p>
                        <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-400">{relativeTime(row.createdAt)}</span>
                      </div>
                      {row.body ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-600">{row.body}</p> : null}
                      <p className="mt-1 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.08em] text-stone-400">
                        <span className="rounded-full bg-cream px-1.5 py-0.5">{row.type}</span>
                        <span className="rounded-full bg-cream px-1.5 py-0.5">{row.channel}</span>
                        {row.templateKey ? <span className="rounded-full bg-cream px-1.5 py-0.5">{row.templateKey}</span> : null}
                        {!row.isRead ? <span className="rounded-full bg-gold/25 px-1.5 py-0.5 text-gold-dark">unread</span> : null}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <MessageSquare className="h-3.5 w-3.5 text-gold-dark" /> Direct messages
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {messageRows.length === 0 ? (
                <li className="px-5 py-6 text-[12px] text-stone-500">No messages yet.</li>
              ) : (
                messageRows.map(({ message, senderName }) => (
                  <li key={message.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12.5px] font-medium text-navy">{message.subject}</p>
                      <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-400">{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-700">{message.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-stone-400">from {senderName ?? "Purpose Course"}</p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="inline-flex items-center justify-between gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <span>Achievements</span>
                <span className="text-gold-dark">{points} pts</span>
              </p>
            </div>
            <ul className="grid gap-2 p-4 sm:grid-cols-2">
              {achievements.map(({ achievement, awardedAt }) => (
                <li
                  key={achievement.id}
                  className={`rounded-lg border px-3 py-2 ${awardedAt ? "border-gold/40 bg-gold/10" : "border-navy/10 bg-cream/30 opacity-70"}`}
                >
                  <p className="text-[11.5px] font-semibold text-navy">{achievement.name}</p>
                  <p className="text-[10px] leading-relaxed text-stone-600">{achievement.description}</p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-stone-500">
                    {awardedAt ? `awarded ${formatDateTime(awardedAt)}` : achievement.criteria}
                  </p>
                </li>
              ))}
            </ul>
            <Link href="/learn/certificates" className="flex items-center justify-between border-t border-navy/8 px-5 py-2.5 text-[11px] font-semibold text-gold-dark">
              Certificates <span>→</span>
            </Link>
          </div>
        </div>

        <div className="admin-card overflow-hidden xl:sticky xl:top-6">
          <div className="flex items-center gap-2 border-b border-navy/10 px-5 py-3">
            <MailOpen className="h-3.5 w-3.5 text-gold-dark" />
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Delivery preferences</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {preferences.map((preference) => (
              <li key={preference.category} className="px-5 py-2.5">
                <form action={updateNotificationPreference} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="category" value={preference.category} />
                  <p className="min-w-0 flex-1 text-[12px] capitalize text-navy">{preference.category}</p>
                  {([
                    ["inApp", "In-app", preference.inApp],
                    ["email", "Email", preference.email],
                    ["push", "Push", preference.push],
                  ] as const).map(([name, label, checked]) => (
                    <label key={name} className="inline-flex items-center gap-1 text-[10px] text-stone-600">
                      <input type="checkbox" name={name} defaultChecked={checked} className="h-3 w-3 rounded border-navy/30" />
                      {label}
                    </label>
                  ))}
                  <button type="submit" className="rounded-full border border-navy/15 px-2 py-0.5 text-[10px] font-semibold text-navy hover:bg-cream">
                    Save
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="border-t border-navy/8 bg-cream/40 px-5 py-2.5 text-[10px] leading-relaxed text-stone-500">
            <Mail className="mr-1 inline h-3 w-3" /> Email and push are queued to the platform outbox and respect these
            settings. In-app notifications appear in the bell in the header.
          </p>
        </div>
      </div>
    </div>
  );
}
