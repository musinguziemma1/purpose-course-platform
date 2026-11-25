import { UpcomingEvents } from "@/components/academy/upcoming-events";
import { AnnouncementsStrip } from "@/components/site/announcements-strip";
import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  Download,
  FileCheck2,
  Inbox,
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
import { GlassMeter, Led, Odometer } from "@/components/admin/console/instruments";
import { ConsoleEmpty, Dome, MetricTile, Panel, Plate, keyClass, staggerStyle, type DomeTone } from "@/components/admin/console/surfaces";

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
  const published = stats.statusMap.published ?? 0;
  const pipeline = (stats.statusMap.submitted ?? 0) + (stats.statusMap.in_review ?? 0) + (stats.statusMap.approved ?? 0);

  const cards: { label: string; value: number; icon: typeof BookOpen; tone: DomeTone }[] = [
    { label: "Published articles", value: published, icon: BookOpen, tone: "source" },
    { label: "In the editorial pipeline", value: pipeline, icon: FileCheck2, tone: "gold" },
    { label: "Scheduled", value: stats.statusMap.scheduled ?? 0, icon: CalendarClock, tone: "potential" },
    { label: "Newsletter subscribers", value: stats.subscribers, icon: Mail, tone: "navy" },
    { label: "Resource downloads", value: stats.downloads, icon: Download, tone: "destiny" },
    { label: "Academy waitlist", value: stats.enrollments, icon: Users, tone: "amber" },
  ];

  return (
    <div className="space-y-6">
      <section className="k-leather p-6 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div className="min-w-0">
            <Plate>
              {workspaceLabelForRole(user?.roleSlug)} · {user?.roleName ?? "Staff"}
            </Plate>
            <h1 className="mt-4 font-serif text-[2rem] leading-[1.08] tracking-tight text-paper sm:text-[2.45rem]">
              Good to see you, <span className="text-gold-soft">{user?.fullName.split(" ")[0] ?? "there"}</span>.
            </h1>
            <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-paper/75">
              {stats.totalArticles} articles in the system · {stats.reviewQueue.length} waiting on an editorial decision.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/admin/articles/new" className={keyClass("brass")}>
                <Plus aria-hidden /> New article
              </Link>
              {canPublish ? (
                <form action={quickPublishDue}>
                  <button type="submit" className={keyClass("ghost")}>
                    <Sparkles aria-hidden /> Publish due articles
                  </button>
                </form>
              ) : null}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              { label: "In review", value: stats.reviewQueue.length, led: stats.reviewQueue.length > 0 },
              { label: "Subscribers", value: stats.subscribers, led: false },
              { label: "Published", value: published, led: false },
            ].map((counter) => (
              <div key={counter.label} className="k-leather-tile flex flex-col items-center px-2 py-3.5 text-center">
                <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-paper/65">
                  {counter.led ? <Led tone="amber" pulse /> : <Led tone="green" />}
                  {counter.label}
                </dt>
                <dd className="mt-2.5 text-[1.45rem] sm:text-[1.7rem]">
                  <Odometer value={counter.value} wheels />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <AnnouncementsStrip />
      <UpcomingEvents />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <MetricTile key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Panel
          title="Waiting on the desk"
          description="Oldest first — clear the queue from the top."
          icon={Inbox}
          action={
            <Link href="/admin/reviews" className={keyClass("paper", "sm")}>
              Review queue <ArrowRight aria-hidden />
            </Link>
          }
        >
          {stats.reviewQueue.length === 0 ? (
            <ConsoleEmpty bare icon={Inbox} title="The desk is clear." description="Nothing is waiting on an editorial decision." />
          ) : (
            <ul className="k-stagger divide-y divide-navy/8">
              {stats.reviewQueue.map((item, index) => (
                <li key={item.id} style={staggerStyle(index)}>
                  <Link href={`/admin/articles/${item.id}`} className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-cream/60">
                    <Led tone={item.status === "submitted" ? "amber" : item.status === "approved" ? "green" : "gold"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[16px] text-navy">{item.title}</p>
                      <p className="text-[12.5px] text-stone-600">
                        {item.authorName} · updated {relativeTime(item.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                    <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-gold-dark" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Pipeline snapshot" icon={BarChart3} bodyClassName="px-5 py-4">
            <ul className="space-y-3">
              {WORKFLOW_STEPS.map((step, index) => {
                const value = stats.statusMap[step] ?? 0;
                return (
                  <li key={step} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3">
                    <span className="text-[12.5px] text-stone-600">{STATUS_META[step].label}</span>
                    <GlassMeter value={value} max={Math.max(stats.totalArticles, 1)} tone={step === "published" ? "source" : "gold"} index={index} />
                    <span className="numeric text-right text-[13px] font-semibold text-navy">{value}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-2.5 border-t border-navy/8 pt-4">
              {[
                ["Revisions requested", stats.statusMap.revision_requested ?? 0],
                ["Rejected with comments", stats.statusMap.rejected ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-cream/60 px-3 py-2.5 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">
                  <dt className="text-[12px] text-stone-600">{label}</dt>
                  <dd className="mt-1 text-[1.2rem] text-navy">
                    <Odometer value={Number(value)} />
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Recent activity"
            icon={Activity}
            action={
              <Link href="/admin/activity" className={keyClass("paper", "sm")}>
                View all
              </Link>
            }
          >
            <ul className="k-ledger k-stagger">
              {stats.recentActivity.slice(0, 5).map((entry, index) => (
                <li key={entry.id} style={staggerStyle(index)} className="flex gap-3 py-3 pl-[1.45rem] pr-5">
                  <span className="mt-1 k-rivet" aria-hidden />
                  <div className="min-w-0 pl-6">
                    <p className="text-[13px] leading-relaxed text-stone-700">{entry.description}</p>
                    <p className="mt-0.5 text-[11.5px] uppercase tracking-[0.1em] text-stone-500">
                      {entry.actorName ?? "System"} · {relativeTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
              {stats.recentActivity.length === 0 ? <li className="px-5 py-6 text-[13px] text-stone-600">No activity recorded yet.</li> : null}
            </ul>
          </Panel>
        </div>
      </div>

      {user?.roleSlug === "admin" && academy ? (
        <section className="k-leather p-6 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Plate>Academy oversight</Plate>
              <h2 className="mt-3 font-serif text-[1.5rem] text-paper">The learning side of the platform</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/people" className={keyClass("ghost", "sm")}>
                People & access
              </Link>
              <Link href="/mentor" className={keyClass("ghost", "sm")}>
                Mentor desk
              </Link>
              <Link href="/learn" className={keyClass("brass", "sm")}>
                Student portal <ArrowRight aria-hidden />
              </Link>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Students", academy.students],
              ["Mentors", academy.mentors],
              ["Coaching sessions", academy.coachingSessions],
              ["Awaiting review", academy.submissionsAwaitingReview],
            ].map(([label, value]) => (
              <div key={String(label)} className="k-leather-tile px-4 py-3.5">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/60">{label}</dt>
                <dd className="mt-2 text-[1.6rem]">
                  <Odometer value={Number(value)} wheels />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/articles/new", icon: PenLine, tone: "gold" as const, title: "Write something", body: "Start a new draft and record the first revision." },
          { href: "/admin/reviews", icon: FileCheck2, tone: "navy" as const, title: "Review queue", body: "Approve, request revisions or reject with feedback." },
          { href: "/admin/students", icon: Users, tone: "destiny" as const, title: "Audience", body: "Subscribers, downloads and the Academy waitlist." },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="admin-card group flex items-start gap-3.5 p-5">
            <Dome icon={action.icon} tone={action.tone} />
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-navy">{action.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-stone-600">{action.body}</p>
            </div>
            <ArrowRight aria-hidden className="ml-auto mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-gold-dark" />
          </Link>
        ))}
      </div>
    </div>
  );
}
