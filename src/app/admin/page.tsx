import { UpcomingEvents } from "@/components/academy/upcoming-events";
import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Download,
  FileCheck2,
  Mail,
  PenLine,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { getDashboardStats } from "@/db/queries";
import { getAcademyOverview } from "@/db/academy";
import { getSessionUser, canPublishArticles } from "@/lib/auth";
import { workspaceLabelForRole } from "@/lib/roles";
import { relativeTime, STATUS_META, WORKFLOW_STEPS } from "@/lib/utils";
import { quickPublishDue } from "@/app/actions/publishing";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Stat } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  await requireAdminPage("/admin");
  const [user, stats, academy] = await Promise.all([
    getSessionUser(),
    getDashboardStats(),
    getAcademyOverview().catch(() => null),
  ]);
  const canPublish = canPublishArticles(user);

  const cards = [
    { label: "Published articles", value: stats.statusMap.published ?? 0, icon: BookOpen, tone: "text-source bg-source/10" },
    { label: "In the editorial pipeline", value: (stats.statusMap.submitted ?? 0) + (stats.statusMap.in_review ?? 0) + (stats.statusMap.approved ?? 0), icon: FileCheck2, tone: "text-gold-dark bg-gold/15" },
    { label: "Scheduled", value: stats.statusMap.scheduled ?? 0, icon: CalendarClock, tone: "text-[#5a3a8a] bg-[#5a3a8a]/10" },
    { label: "Newsletter subscribers", value: stats.subscribers, icon: Mail, tone: "text-navy bg-navy/8" },
    { label: "Resource downloads", value: stats.downloads, icon: Download, tone: "text-[#155e63] bg-[#155e63]/10" },
    { label: "Academy waitlist", value: stats.enrollments, icon: Users, tone: "text-[#b98a1f] bg-[#b98a1f]/10" },
  ];

  return (
    <div className="space-y-6">
      <UpcomingEvents />
      <PageHeader
        eyebrow={`${workspaceLabelForRole(user?.roleSlug)} · ${user?.roleName ?? "Staff"}`}
        title={`Good to see you, ${user?.fullName.split(" ")[0] ?? "there"}.`}
        description={`${stats.totalArticles} articles in the system · ${stats.reviewQueue.length} waiting on an editorial decision.`}
        meta={
          <>
            <Badge variant="gold" dot>{stats.reviewQueue.length} in review</Badge>
            <Badge variant="muted">{stats.subscribers} subscribers</Badge>
            <Badge variant="success">{stats.statusMap.published ?? 0} published</Badge>
          </>
        }
        actions={
          <>

            {canPublish ? (
              <form action={quickPublishDue}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-navy/15 bg-paper px-4 text-[12.5px] font-medium text-navy hover:bg-cream"
                >
                  <Sparkles className="h-3.5 w-3.5 text-gold-dark" /> Publish due articles
                </button>
              </form>
            ) : null}
            <Link
              href="/admin/articles/new"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-4 text-[12.5px] font-semibold text-paper hover:bg-navy-700"
            >
              <Plus className="h-4 w-4" /> New article
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <Stat
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.label.includes("Published") ? "source" : card.label.includes("Scheduled") ? "purple" : "gold"}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Waiting on the desk</p>
              <p className="text-[11px] text-stone-500">Oldest first — clear the queue from the top.</p>
            </div>
            <Link href="/admin/reviews" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-navy hover:text-gold-dark">
              Review queue <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-navy/8">
            {stats.reviewQueue.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-stone-500">Nothing waiting. The desk is clear.</li>
            ) : (
              stats.reviewQueue.map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/articles/${item.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-cream/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[15px] text-navy">{item.title}</p>
                      <p className="text-[11px] text-stone-500">
                        {item.authorName} · updated {relativeTime(item.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-5">
          <div className="admin-card p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Pipeline snapshot</p>
            <ul className="mt-3 space-y-2">
              {WORKFLOW_STEPS.map((step) => {
                const value = stats.statusMap[step] ?? 0;
                const total = Math.max(stats.totalArticles, 1);
                return (
                  <li key={step} className="flex items-center gap-2.5">
                    <span className="w-24 text-[11px] text-stone-600">{STATUS_META[step].label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                      <span
                        className="block h-full rounded-full bg-gold"
                        style={{ width: `${Math.min(100, (value / total) * 100)}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-[11px] font-semibold text-navy">{value}</span>
                  </li>
                );
              })}
              <li className="flex items-center gap-2.5 border-t border-navy/8 pt-2">
                <span className="w-24 text-[11px] text-stone-600">Revisions</span>
                <span className="text-[11px] text-stone-500">requested</span>
                <span className="ml-auto text-[11px] font-semibold text-navy">{stats.statusMap.revision_requested ?? 0}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-24 text-[11px] text-stone-600">Rejected</span>
                <span className="text-[11px] text-stone-500">with comments</span>
                <span className="ml-auto text-[11px] font-semibold text-navy">{stats.statusMap.rejected ?? 0}</span>
              </li>
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Recent activity</p>
              <Link href="/admin/activity" className="text-[11.5px] font-semibold text-navy hover:text-gold-dark">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {stats.recentActivity.slice(0, 5).map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-[12px] leading-relaxed text-stone-700">{entry.description}</p>
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-stone-400">
                    {entry.actorName ?? "System"} · {relativeTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {user?.roleSlug === "admin" && academy ? (
        <div className="rounded-xl border border-navy/10 bg-navy p-5 text-paper">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-gold">Academy oversight</p>
              <p className="mt-1 font-serif text-xl">The learning side of the platform</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/people"
                className="inline-flex h-8 items-center rounded-full border border-white/20 px-3 text-[11px] font-medium text-paper/80 hover:border-gold hover:text-gold"
              >
                People & access
              </Link>
              <Link
                href="/mentor"
                className="inline-flex h-8 items-center rounded-full border border-white/20 px-3 text-[11px] font-medium text-paper/80 hover:border-gold hover:text-gold"
              >
                Mentor desk
              </Link>
              <Link
                href="/learn"
                className="inline-flex h-8 items-center rounded-full bg-gold px-3 text-[11px] font-semibold text-ink"
              >
                Student portal
              </Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Students", academy.students],
              ["Mentors", academy.mentors],
              ["Coaching sessions", academy.coachingSessions],
              ["Awaiting review", academy.submissionsAwaitingReview],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="font-serif text-xl text-paper">{value}</p>
                <p className="text-[9.5px] uppercase tracking-[0.1em] text-paper/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/articles/new", icon: PenLine, title: "Write something", body: "Start a new draft and record the first revision." },
          { href: "/admin/reviews", icon: FileCheck2, title: "Review queue", body: "Approve, request revisions or reject with feedback." },
          { href: "/admin/students", icon: Users, title: "Audience", body: "Subscribers, downloads and the Academy waitlist." },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="admin-card group flex items-start gap-3 p-4 transition-colors hover:border-gold/50">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream text-gold-dark">
              <action.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-navy">{action.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-600">{action.body}</p>
            </div>
            <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-dark" />
          </Link>
        ))}
      </div>
    </div>
  );
}
