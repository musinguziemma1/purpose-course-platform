import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, CheckCheck, Clock, Inbox, Library, Mail, MailOpen, Route } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailEvents, notificationOutbox, profiles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { NOTIFICATION_CATEGORIES, TEMPLATES } from "@/lib/notifications";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { emailConfigurationError } from "@/lib/email";
import { EmailDeliveryForm } from "@/components/admin/email-delivery-form";
import { Led, type LedTone } from "@/components/admin/console/instruments";
import { ConsoleHeader, MetricTile, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications" };

const outboxLed = (status: string): LedTone =>
  status === "delivered" || status === "sent" ? "green" : status === "queued" ? "gold" : status === "failed" ? "red" : "off";
const eventLed = (event: string): LedTone =>
  event === "sent" || event === "delivered" ? "green" : event === "opened" ? "gold" : event === "bounced" || event === "failed" ? "red" : "off";

export default async function AdminNotificationsPage() {
  await requireAdminPage("/admin/notifications");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, "notifications.manage") && !can(user, "people.manage")) redirect("/admin");

  const [outbox, emailRows] = await Promise.all([
    db
      .select({ outbox: notificationOutbox, recipient: profiles.fullName })
      .from(notificationOutbox)
      .leftJoin(profiles, eq(notificationOutbox.profileId, profiles.id))
      .orderBy(desc(notificationOutbox.createdAt))
      .limit(50),
    db
      .select({ event: emailEvents, recipient: profiles.fullName })
      .from(emailEvents)
      .leftJoin(profiles, eq(emailEvents.profileId, profiles.id))
      .orderBy(desc(emailEvents.createdAt))
      .limit(30),
  ]);

  const queued = outbox.filter((row) => row.outbox.status === "queued").length;
  const sent = outbox.filter((row) => row.outbox.status === "delivered").length;
  const templates = Object.values(TEMPLATES);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Messaging"
        title="Notification service"
        description={
          <>
            One reusable service fans a single event out to in-app rows and a channel outbox, respecting each learner&apos;s preferences. {templates.length} templates across{" "}
            {NOTIFICATION_CATEGORIES.length} categories.
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Templates" value={templates.length} icon={Bell} />
        <MetricTile label="Queued" value={queued} icon={Clock} tone="gold" led={queued ? { tone: "amber", pulse: true } : undefined} />
        <MetricTile label="Delivered" value={sent} icon={CheckCheck} tone="source" />
        <MetricTile label="Email events" value={emailRows.length} icon={Mail} tone="destiny" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Panel title="Outbox queue" icon={Inbox} description="Latest 50 messages. Accepted means Resend received the request; delivered requires a signed provider callback.">
          <div className="border-b border-navy/8 px-5 py-3">
            <EmailDeliveryForm error={emailConfigurationError()} />
          </div>
          <ul className="k-stagger divide-y divide-navy/8">
            {outbox.map(({ outbox: row, recipient }, index) => (
              <li key={row.id} style={staggerStyle(index)} className="flex gap-3 px-5 py-3">
                <Led tone={outboxLed(row.status)} className="mt-1.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-navy">{row.subject}</p>
                    <span className="ui-badge rounded-full border border-navy/10 bg-cream px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-700">
                      {row.channel} · {row.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-stone-600">
                    {recipient ?? row.recipientEmail ?? "unknown"} · <span className="k-mono text-[11.5px]">{row.templateKey}</span> · {relativeTime(row.createdAt)}
                  </p>
                  <p className="text-[12px] text-stone-600">
                    Attempts: {row.attempts}
                    {row.error ? <span className="text-rose-700"> · {row.error}</span> : ""}
                  </p>
                </div>
              </li>
            ))}
            {outbox.length === 0 ? <li className="px-5 py-6 text-[13px] text-stone-600">Outbox is empty.</li> : null}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title="Template registry" icon={Library}>
            <ul className="divide-y divide-navy/8">
              {templates.map((template) => (
                <li key={template.key} className="px-5 py-2.5">
                  <p className="k-mono text-navy">{template.key}</p>
                  <p className="text-[12px] text-stone-600">
                    {template.category} · {template.defaultChannels.join(", ")} · “{template.title({})}”
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Email lifecycle" icon={MailOpen}>
            <ul className="k-stagger divide-y divide-navy/8">
              {emailRows.map(({ event, recipient }, index) => (
                <li key={event.id} style={staggerStyle(index)} className="flex flex-wrap items-center gap-2.5 px-5 py-2.5">
                  <Led tone={eventLed(event.event)} />
                  <span className="w-16 text-[11.5px] font-bold uppercase tracking-[0.08em] text-navy">{event.event}</span>
                  <p className="min-w-0 flex-1 truncate text-[13px] text-stone-700">{event.detail ?? event.provider}</p>
                  <span className="text-[12px] text-stone-500">
                    {recipient ?? "—"} · {formatDateTime(event.createdAt)}
                  </span>
                </li>
              ))}
              {emailRows.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No email events yet.</li> : null}
            </ul>
          </Panel>

          <Panel title="Channel roadmap" icon={Route} bodyClassName="px-5 py-4 text-[13.5px] leading-relaxed text-stone-700">
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5">
                <Led tone="green" className="mt-1.5" /> In-app notifications are available.
              </li>
              <li className="flex items-start gap-2.5">
                <Led tone="gold" className="mt-1.5" /> Email requires a verified Resend sender, API key, signed webhook and scheduled worker.
              </li>
              <li className="flex items-start gap-2.5">
                <Led tone="off" className="mt-1.5" /> Push delivery is not configured.
              </li>
            </ul>
            <Link href="/learn/notifications" className={keyClass("paper", "sm", "mt-4")}>
              See the learner inbox <ArrowRight aria-hidden />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
