import Link from "next/link";
import { ArrowRight, Award, Bell, Mail, MailOpen, MessageSquare } from "lucide-react";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { messages, notifications, profiles } from "@/db/schema";
import { getPreferences } from "@/lib/notifications";
import { getAchievements } from "@/db/analytics";
import { getSessionUser } from "@/lib/auth";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { Chip, LeatherFigures, LearnHero, Panel, WaxSeal } from "@/components/learn/kit";
import { PreferenceList } from "@/components/learn/preference-list";

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
      .where(and(eq(messages.recipientId, user.profileId), sql`${messages.contextType} is distinct from 'contact'`))
      .orderBy(desc(messages.createdAt))
      .limit(20),
    getPreferences(user.profileId),
    getAchievements(user.profileId),
  ]);

  const unread = notificationRows.filter((row) => !row.isRead).length;
  const earned = achievements.filter((row) => row.awardedAt);
  const points = earned.reduce((sum, row) => sum + row.achievement.points, 0);

  return (
    <div className="space-y-7">
      <LearnHero
        size="md"
        eyebrow="One inbox"
        title="Notifications & messages"
        description="One inbox for mentor feedback, assessment results, session reminders and community replies — plus direct messages from your faculty."
        aside={
          <LeatherFigures
            items={[
              { label: "Unread", value: unread },
              { label: "Achievements", value: earned.length },
              { label: "Points", value: points },
            ]}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-6">
          <Panel
            title="In-app notifications"
            icon={Bell}
            action={<Chip>{notificationRows.length} total</Chip>}
            bodyClassName="px-3 pb-3 pt-2 sm:px-4"
          >
            <ul className="lk-ledger">
              {notificationRows.length === 0 ? (
                <li className="px-2 py-8 text-center text-[14px] text-stone-600">
                  Nothing yet. Notifications arrive when a mentor reviews your work, an assessment is graded or someone replies in a community.
                </li>
              ) : (
                notificationRows.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={row.href ?? "/learn"}
                      className={cn(
                        "flex gap-3 rounded-xl px-2 py-3.5 transition-colors duration-150 hover:bg-[rgba(201,162,39,0.07)]",
                        !row.isRead && "bg-[rgba(201,162,39,0.06)]",
                      )}
                    >
                      {/* A wax dot marks what you have not opened yet. */}
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                          row.isRead
                            ? "border border-[rgba(18,42,77,0.2)] bg-[#f1ead9] shadow-[inset_0_1px_2px_rgba(10,26,48,0.2)]"
                            : "bg-[radial-gradient(circle_at_35%_30%,#d65a63,#9b2c35_60%,#561017)] shadow-[0_1px_2px_rgba(86,16,23,0.5)]",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className={cn("text-[14px] text-navy", row.isRead ? "font-medium" : "font-semibold")}>{row.title}</span>
                          <span className="text-[12px] text-stone-600">{relativeTime(row.createdAt)}</span>
                        </span>
                        {row.body ? <span className="mt-0.5 block text-[14px] leading-relaxed text-stone-600">{row.body}</span> : null}
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <Chip>{row.type}</Chip>
                          <Chip>{row.channel}</Chip>
                          {row.templateKey ? <Chip>{row.templateKey}</Chip> : null}
                          {!row.isRead ? <Chip tone="gold">unread</Chip> : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </Panel>

          <Panel title="Direct messages" icon={MessageSquare}>
            {messageRows.length === 0 ? (
              <p className="text-[14px] text-stone-600">No messages yet.</p>
            ) : (
              <ul className="space-y-4">
                {messageRows.map(({ message, senderName }) => (
                  // A letter: an airmail edge, the subject as its heading and a postmark date.
                  <li
                    key={message.id}
                    className="relative overflow-hidden rounded-xl border border-[rgba(120,96,52,0.18)] bg-[#fffcf3] p-4 pt-5 shadow-[0_1px_1px_rgba(60,44,16,0.07)]"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(135deg,#9b2c35_0_10px,#fffcf3_10px_16px,#1b3a63_16px_26px,#fffcf3_26px_32px)]"
                    />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-serif text-[1.05rem] text-navy">{message.subject}</p>
                      <span className="rounded-full border border-dashed border-[rgba(18,42,77,0.3)] px-2.5 py-0.5 text-[12px] text-stone-600">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-stone-700">{message.body}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                      <Mail aria-hidden className="h-3.5 w-3.5" /> From {senderName ?? "Purpose Course"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Achievements"
            icon={Award}
            action={<Chip tone="gold">{points} pts</Chip>}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {achievements.map(({ achievement, awardedAt }) => (
                <li key={achievement.id} className={cn("flex items-start gap-3 p-3", awardedAt ? "lk-paper" : "lk-well")}>
                  <WaxSeal tone="gold" size={46} muted={!awardedAt} />
                  <div className="min-w-0">
                    <p className={cn("text-[14px] font-semibold", awardedAt ? "text-navy" : "text-stone-600")}>{achievement.name}</p>
                    <p className="text-[13px] leading-relaxed text-stone-600">{achievement.description}</p>
                    <p className="mt-1 text-[12px] uppercase tracking-[0.08em] text-stone-600">
                      {awardedAt ? `Awarded ${formatDateTime(awardedAt)}` : achievement.criteria}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/learn/certificates" className="lk-link mt-4">
              Certificates <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Panel>
        </div>

        <Panel title="Delivery preferences" icon={MailOpen} className="xl:sticky xl:top-24" bodyClassName="px-3 pb-2 pt-2 sm:px-4">
          <PreferenceList preferences={preferences} />
          <p className="lk-well mt-2 px-3 py-2.5 text-[13px] leading-relaxed text-stone-600">
            Email and push are queued to the platform outbox and respect these settings. In-app notifications appear in the bell in the header.
          </p>
        </Panel>
      </div>
    </div>
  );
}
