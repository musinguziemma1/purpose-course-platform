import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { db } from "@/db";
import { analyticsReports, profiles } from "@/db/schema";
import { getAuditTrail, getEngagementTrend, getPlatformAnalytics, getProgrammeAnalytics, getRetention } from "@/db/analytics";
import { getCohortPerformance } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Learning analytics" };

const RISK_TONE: Record<string, string> = {
  excellent: "bg-source/10 text-source",
  on_track: "bg-cream text-stone-600",
  at_risk: "bg-amber-100 text-amber-900",
  critical: "bg-rose-100 text-rose-800",
};

export default async function AdminAnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, "analytics.view") && !can(user, "academy.oversee") && !can(user, "people.manage")) redirect("/admin");

  const [platform, programme, performance, trend, retention, audit, people, reports] = await Promise.all([
    getPlatformAnalytics(),
    getProgrammeAnalytics(),
    getCohortPerformance(),
    getEngagementTrend(14),
    getRetention(),
    getAuditTrail(8),
    db.select({ id: profiles.id, fullName: profiles.fullName, title: profiles.title }).from(profiles).limit(8),
    db.select().from(analyticsReports).orderBy(analyticsReports.scope),
  ]);

  const activeCohort = programme.cohorts.find((cohort) => cohort.status === "active") ?? programme.cohorts[0];
  const maxMinutes = Math.max(...trend.map((row) => row.minutes), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">Enterprise analytics</p>
          <h1 className="mt-1.5 font-serif text-2xl text-navy">Learning intelligence</h1>
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-stone-600">
            Platform, programme and individual measures drawn from live data — enrolment, completion, assessment
            improvement, goal achievement, mentor engagement and dropout.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/programme" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-3.5 text-[11.5px] font-medium text-navy hover:bg-cream">
            <CalendarDays className="h-3.5 w-3.5" /> Programme control
          </Link>
          <Link href="/search" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3.5 text-[11.5px] font-semibold text-paper hover:bg-navy-700">
            <Search className="h-3.5 w-3.5" /> Search platform
          </Link>
        </div>
      </div>

      <section>
        <h2 className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
          <BarChart3 className="h-3.5 w-3.5 text-gold-dark" /> Platform level
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Registered users", value: platform.users, icon: Users },
            { label: "Active learners (30d)", value: platform.activeLearners, icon: Activity },
            { label: "Lesson completion", value: `${platform.completionRate}%`, icon: BookOpen },
            { label: "Course completion", value: `${platform.courseCompletion}%`, icon: GraduationCap },
            { label: "Certificates", value: platform.certificates, icon: TrendingUp },
            { label: "Assessment pass rate", value: `${platform.assessmentPassRate}%`, icon: Target },
          ].map((card) => (
            <div key={card.label} className="admin-card p-3.5">
              <card.icon className="h-4 w-4 text-gold-dark" />
              <p className="mt-2 font-serif text-xl text-navy">{card.value}</p>
              <p className="text-[9.5px] uppercase leading-tight tracking-[0.08em] text-stone-500">{card.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="admin-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Principle coverage across the curriculum</p>
            <span className="text-[10px] uppercase tracking-[0.08em] text-stone-500">all learners</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {platform.principles.map((principle) => (
              <li key={principle.principle}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12px] font-medium text-navy">
                    {principle.principle} <span className="text-[10px] font-normal text-stone-500">· {principle.question}</span>
                  </p>
                  <span className="text-[10.5px] font-semibold text-gold-dark">{principle.percent}%</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="meter h-2 flex-1">
                    <span style={{ width: `${principle.percent}%` }} />
                  </span>
                  <span className="text-[9.5px] text-stone-500">
                    {principle.completed}/{principle.lessons}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-card p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Engagement trend (14 days)</p>
          <div className="mt-3 flex h-28 items-end gap-1">
            {trend.length === 0 ? (
              <p className="text-[11.5px] text-stone-500">No engagement snapshots yet.</p>
            ) : (
              trend.map((row) => (
                <div key={row.date} className="flex flex-1 flex-col items-center gap-1" title={`${row.date}: ${row.minutes} min · ${row.active} active`}>
                  <span className="w-full rounded-t bg-navy/70" style={{ height: `${(row.minutes / maxMinutes) * 96}px` }} />
                  <span className="text-[7.5px] text-stone-400">{row.date.slice(8)}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-navy/8 pt-2 text-center">
            {[
              { label: "Minutes", value: trend.reduce((sum, row) => sum + row.minutes, 0) },
              { label: "Lessons", value: trend.reduce((sum, row) => sum + row.lessons, 0) },
              { label: "Retention w1", value: `${retention.slice(-1)[0]?.learners ?? 0}` },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-serif text-base text-navy">{stat.value}</p>
                <p className="text-[8.5px] uppercase tracking-[0.08em] text-stone-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
          <CalendarDays className="h-3.5 w-3.5 text-gold-dark" /> Programme level
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="admin-card p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Cohort performance</p>
            {activeCohort ? (
              <>
                <p className="mt-1 font-serif text-[14px] text-navy">{activeCohort.name}</p>
                <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                  {formatDate(activeCohort.startsAt, "short")} → {formatDate(activeCohort.endsAt, "short")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex-1 overflow-hidden rounded-full bg-cream">
                    <span className="block h-2 rounded-full bg-gold" style={{ width: `${Math.min(100, Math.round((activeCohort.learners / Math.max(activeCohort.capacity, 1)) * 100))}%` }} />
                  </span>
                  <span className="text-[10px] text-stone-600">{activeCohort.learners}/{activeCohort.capacity}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {performance.slice(0, 5).map((student) => (
                    <li key={student.profileId} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-navy">{student.fullName}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold uppercase ${RISK_TONE[student.risk]}`}>
                        {student.averageScore === null ? "no scores" : `${student.averageScore}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[11.5px] text-stone-500">No cohorts yet.</p>
            )}
          </div>

          <div className="admin-card p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Assessment improvement</p>
            <p className="mt-2 font-serif text-3xl text-navy">
              {platform.assessmentImprovement === null ? "—" : `${platform.assessmentImprovement > 0 ? "+" : ""}${platform.assessmentImprovement}`}
            </p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">points, last 7 days vs prior</p>
            <ul className="mt-2 space-y-1 text-[11px] text-stone-600">
              <li>Attempts: <strong className="text-navy">{platform.assessmentAttempts}</strong></li>
              <li>Average score: <strong className="text-navy">{platform.assessmentAverage ?? "—"}</strong></li>
              <li>Pass rate: <strong className="text-navy">{platform.assessmentPassRate}%</strong></li>
              <li>Active cohorts: <strong className="text-navy">{platform.activeCohorts}</strong></li>
            </ul>
          </div>

          <div className="admin-card p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Goals & mentorship</p>
            <p className="mt-2 font-serif text-3xl text-navy">{programme.goals.achievedRate}%</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">goal achievement</p>
            <ul className="mt-2 space-y-1 text-[11px] text-stone-600">
              <li>Goals: <strong className="text-navy">{programme.goals.total}</strong> ({programme.goals.active} active)</li>
              <li>Mentor assignments: <strong className="text-navy">{programme.mentorAssignments}</strong></li>
              <li>Mentoring notes: <strong className="text-navy">{programme.mentoringNotes}</strong></li>
              <li>Satisfaction index: <strong className="text-navy">{programme.satisfaction}</strong></li>
            </ul>
          </div>
        </div>

        <div className="admin-card mt-3 overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Content engagement & dropout by course</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {programme.dropout.map((course) => (
              <li key={course.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <p className="min-w-0 flex-1 truncate text-[12px] text-navy">{course.title}</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-stone-500">
                  completion {course.completion}%
                </span>
                <span className="inline-flex min-w-40 items-center gap-1.5">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                    <span className="block h-full rounded-full bg-source" style={{ width: `${course.completion}%` }} />
                  </span>
                  <span className="text-[10px] font-semibold text-rose-600">{course.dropout}% dropout</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
          <Users className="h-3.5 w-3.5 text-gold-dark" /> Individual level
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {performance.slice(0, 2).map((student) => (
            <div key={student.profileId} className="admin-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-serif text-[15px] text-navy">{student.fullName}</p>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{student.levelName ?? "Learner"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${RISK_TONE[student.risk]}`}>{student.risk.replace("_", " ")}</span>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-stone-600">
                <li>Lessons: <strong className="text-navy">{student.lessonsCompleted}/{student.lessonsTotal}</strong></li>
                <li>Average score: <strong className="text-navy">{student.averageScore ?? "—"}</strong></li>
                <li>Group work: <strong className="text-navy">{student.groupScore ?? "—"}</strong></li>
                <li>Certificates: <strong className="text-navy">{student.certificates}</strong></li>
              </ul>
              {student.attention.length > 0 ? (
                <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-[10.5px] leading-relaxed text-amber-900">
                  {student.attention.slice(0, 2).join(" · ")}
                </p>
              ) : (
                <p className="mt-1.5 rounded-md bg-source/5 px-2 py-1 text-[10.5px] text-source">On track — no follow-up required.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
          <BarChart3 className="h-3.5 w-3.5 text-gold-dark" /> Report catalogue (M&amp;E definitions)
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {reports.map((report) => (
            <div key={report.id} className="admin-card p-4">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-gold-dark">{report.scope}</p>
              <p className="mt-0.5 font-serif text-[14px] text-navy">{report.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-600">{report.definition}</p>
              <p className="mt-1 font-mono text-[9.5px] text-stone-400">{report.queryRef}</p>
            </div>
          ))}
          {reports.length === 0 ? <p className="admin-card p-4 text-[12px] text-stone-500">No report definitions yet.</p> : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-dark" /> Audit trail
            </p>
            <Link href="/admin/activity" className="text-[10.5px] font-semibold text-gold-dark hover:underline">
              Full log <ArrowRight className="ml-1 inline h-2.5 w-2.5" />
            </Link>
          </div>
          <ul className="divide-y divide-navy/8">
            {audit.changes.map((row, index) => (
              <li key={index} className="px-5 py-2">
                <p className="text-[11.5px] text-navy">
                  {(row.change as { table?: string }).table} · {(row.change as { type?: string }).type} · {(row.change as { record?: string }).record}
                </p>
                <p className="text-[10px] text-stone-500">{row.actor ?? "system"}</p>
              </li>
            ))}
            {audit.changes.length === 0 ? <li className="px-5 py-3 text-[11.5px] text-stone-500">No data changes recorded yet.</li> : null}
          </ul>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Top platform events</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {platform.topEvents.map((event) => (
              <li key={event.name} className="flex items-center justify-between gap-2 px-5 py-2">
                <p className="text-[11.5px] text-navy">{event.name}</p>
                <span className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.08em] text-stone-500">
                  {event.module} <span className="rounded-full bg-cream px-1.5 py-0.5 font-semibold text-navy">{event.value}</span>
                </span>
              </li>
            ))}
            {platform.topEvents.length === 0 ? <li className="px-5 py-3 text-[11.5px] text-stone-500">No events yet.</li> : null}
          </ul>
          <div className="border-t border-navy/8 bg-cream/40 px-5 py-2.5">
            <p className="text-[10px] leading-relaxed text-stone-500">
              {people.length} people in the directory · {platform.articlePipeline.published}/{platform.articlePipeline.total} articles published ·{" "}
              {platform.threads} discussions · {platform.replies} replies
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
