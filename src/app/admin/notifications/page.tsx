import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Mail, CheckCheck, Clock } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailEvents, notificationOutbox, profiles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { NOTIFICATION_CATEGORIES, TEMPLATES } from "@/lib/notifications";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { emailConfigurationError } from "@/lib/email";
import { EmailDeliveryForm } from "@/components/admin/email-delivery-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notifications" };

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
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Notification service</h1>
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-stone-600">
          One reusable service fans a single event out to in-app rows and a channel outbox, respecting each learner&apos;s
          preferences. {templates.length} templates across {NOTIFICATION_CATEGORIES.length} categories.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Templates", value: templates.length, icon: Bell },
          { label: "Queued", value: queued, icon: Clock },
          { label: "Delivered", value: sent, icon: CheckCheck },
          { label: "Email events", value: emailRows.length, icon: Mail },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Outbox queue</p>
            <p className="text-[10.5px] text-stone-500">Latest 50 messages. Accepted means Resend received the request; delivered requires a signed provider callback.</p>
            <EmailDeliveryForm error={emailConfigurationError()} />
          </div>
          <ul className="divide-y divide-navy/8">
            {outbox.map(({ outbox: row, recipient }) => (
              <li key={row.id} className="px-5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-navy">{row.subject}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${row.status === "sent" ? "bg-source/10 text-source" : "bg-cream text-stone-600"}`}>
                    {row.channel} · {row.status}
                  </span>
                </div>
                <p className="text-[10px] text-stone-500">
                  {recipient ?? row.recipientEmail ?? "unknown"} · {row.templateKey} · {relativeTime(row.createdAt)}
                </p>
                <p className="text-[10px] text-stone-500">Attempts: {row.attempts}{row.error ? ` · ${row.error}` : ""}</p>
              </li>
            ))}
            {outbox.length === 0 ? <li className="px-5 py-6 text-[12px] text-stone-500">Outbox is empty.</li> : null}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Template registry</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {templates.map((template) => (
                <li key={template.key} className="px-5 py-2">
                  <p className="font-mono text-[10.5px] text-navy">{template.key}</p>
                  <p className="text-[10px] text-stone-500">
                    {template.category} · {template.defaultChannels.join(", ")} · “{template.title({})}”
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Email lifecycle</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {emailRows.map(({ event, recipient }) => (
                <li key={event.id} className="flex flex-wrap items-center gap-2 px-5 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${event.event === "sent" ? "bg-source/10 text-source" : event.event === "opened" ? "bg-gold/15 text-gold-dark" : "bg-cream text-stone-600"}`}>
                    {event.event}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[11px] text-stone-700">{event.detail ?? event.provider}</p>
                  <span className="text-[9.5px] text-stone-400">{recipient ?? "—"} · {formatDateTime(event.createdAt)}</span>
                </li>
              ))}
              {emailRows.length === 0 ? <li className="px-5 py-4 text-[12px] text-stone-500">No email events yet.</li> : null}
            </ul>
          </div>

          <div className="rounded-xl border border-navy/10 bg-cream/40 p-4 text-[11px] leading-relaxed text-stone-600">
            <p className="font-semibold text-navy">Channel roadmap</p>
            <p className="mt-1">In-app notifications are available. Email requires a verified Resend sender, API key, signed webhook and scheduled worker. Push delivery is not configured.</p>
            <Link href="/learn/notifications" className="mt-2 inline-flex font-semibold text-gold-dark hover:underline">
              See the learner inbox →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
