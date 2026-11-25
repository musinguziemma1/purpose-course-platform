import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Award, BookOpen, CalendarRange, Compass, GraduationCap, Target, TrendingUp, UserCheck, Users } from "lucide-react";
import { getLearningReport } from "@/db/learning-metrics";
import { requireAdminPage } from "@/lib/page-access";
import { Label, Select } from "@/components/ui/field";
import { Gauge, GlassMeter } from "@/components/admin/console/instruments";
import { ConsoleHeader, MetricTile, Panel, keyClass } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learning analytics" };
const percent = (completed: number, total: number) =>
  total ? `${Math.round((completed / total) * 100)}%` : "—";
const ratio = (completed: number, total: number) => (total ? (completed / total) * 100 : null);
const dayOfMonth = (iso: string) => String(Number(iso.slice(8, 10)) || iso);

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const actor = await requireAdminPage("/admin/analytics");
  const query = await searchParams;
  const cohortId = query.cohort ? Number(query.cohort) : null;
  const report = await getLearningReport(actor, cohortId);
  if (!report) notFound();
  const { summary: s, courses, cohorts, daily, weekly } = report;
  const selected = cohorts.find((cohort) => cohort.id === cohortId);
  const maxActions = Math.max(1, ...daily.map((day) => day.actions));
  const maxWeekly = Math.max(1, ...weekly.map((week) => week.active));
  const change =
    s.improvement === null
      ? "—"
      : `${s.improvement > 0 ? "+" : ""}${s.improvement}`;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {actor.isDemoAccount ? <p className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-navy">Demo account: this learning report shows practice learners. Normal staff reports exclude their activity.</p> : null}
      <ConsoleHeader
        eyebrow="Purpose Course"
        title="Learning analytics"
        description="Enrolment, published lesson progress, assessment results and recorded learning activity. Inactive accounts, staff activity and demonstration events are excluded."
      >
        <form action="/admin/analytics" method="get" className="flex flex-wrap items-end gap-3 rounded-2xl bg-cream/55 p-3 shadow-[inset_0_1px_3px_rgba(10,26,48,0.14)] sm:p-4">
          <div className="min-w-0 flex-1">
            <Label htmlFor="analytics-cohort">Report scope</Label>
            <Select id="analytics-cohort" name="cohort" defaultValue={cohortId ?? ""}>
              <option value="">All active learner accounts</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name} · {cohort.learners} active members
                </option>
              ))}
            </Select>
          </div>
          <button type="submit" className={keyClass("navy")}>
            <Compass aria-hidden /> Apply scope
          </button>
        </form>
        <p className="mt-3 text-sm font-semibold text-navy" role="status">
          {selected ? `Scope: ${selected.name} · active learner memberships only` : "Scope: all active learner accounts"}
        </p>
      </ConsoleHeader>

      <section aria-label="Rates" className="admin-card k-riveted grid gap-8 px-5 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <Gauge
          label="Lesson completion"
          value={ratio(s.completed, s.opportunities)}
          tone="gold"
          caption={`${s.completed} of ${s.opportunities} learner–lesson opportunities. Unstarted lessons remain in the denominator.`}
        />
        <Gauge
          label="Course award rate"
          value={ratio(s.courseAwards, s.coursePairs)}
          tone="source"
          caption={`${s.courseAwards} valid course awards across ${s.coursePairs} learner–course pairs with published lessons.`}
        />
        <Gauge
          label="Assessment pass rate"
          value={ratio(s.passed, s.attempts)}
          tone="navy"
          caption={`${s.passed} passes from ${s.attempts} submitted attempts in the current enrolled curriculum. Voided attempts excluded.`}
        />
        <Gauge
          label="Development goals"
          value={ratio(s.achievedGoals, s.goals)}
          tone="destiny"
          caption={`${s.achievedGoals} achieved of ${s.goals} active or achieved goals. Cancelled goals are excluded.`}
        />
      </section>

      <section aria-label="Learning measures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile label="Learner accounts" value={s.learners} icon={Users} hint="Active accounts with the student role in this scope." />
        <MetricTile label="Active learners · 30 days" value={s.activeLearners} icon={UserCheck} tone="source" hint="Distinct learners with a recorded learning action in the last 30 days." />
        <MetricTile label="Valid certificates" value={s.certificates} icon={GraduationCap} tone="gold" hint="Issued course and level certificates; revoked certificates excluded." />
        <MetricTile
          label="Assessment change"
          value={change}
          icon={TrendingUp}
          tone="potential"
          hint={`Percentage points, mean change from first to latest submission per learner and assessment with the same stored question set and pass mark. ${s.comparisons} comparable series.`}
        />
        <MetricTile label="Average submitted score" value={s.average === null ? "—" : `${s.average}%`} icon={Target} tone="destiny" hint="Across all submitted attempts in scope." />
        <MetricTile label="Active mentor assignments" value={s.mentors} icon={Award} tone="amber" hint="Mentors currently assigned to learners in scope." />
      </section>

      <Panel title="Progress by published course" icon={BookOpen} description="Each learner is counted once per course granted by an enrolled or completed level enrolment.">
        {courses.length ? (
          <ul className="divide-y divide-navy/8">
            {courses.map((course, index) => (
              <li key={course.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-navy">{course.title}</h3>
                  <span className="text-[13px] text-stone-600">
                    {course.learners} learners · {course.awarded} course awards
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-[1fr_auto] items-center gap-3">
                  <GlassMeter value={course.completed} max={course.total} index={index} />
                  <span className="numeric w-12 text-right text-[14px] font-semibold text-navy">{percent(course.completed, course.total)}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-stone-600">
                  {course.completed}/{course.total} lesson opportunities completed
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-5 text-sm text-stone-600">No published courses are assigned to enrolled learners in this scope.</p>
        )}
      </Panel>

      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Recorded activity · 14 days"
          icon={Activity}
          description="Dates use Africa/Kampala. Columns count learning actions, including completion, reopening, assessment and award events."
          bodyClassName="p-5"
        >
          <ol className="k-columns" aria-label="Learning actions per day">
            {daily.map((day, index) => (
              <li key={day.date} className="k-column" title={`${day.date}: ${day.actions} actions · ${day.active} learners`}>
                <span className="sr-only">
                  {day.date}: {day.actions} actions, {day.active} learners
                </span>
                <span
                  aria-hidden
                  className="k-column-bar"
                  data-empty={day.actions === 0 ? "" : undefined}
                  style={{ "--i": index, "--v": `${(day.actions / maxActions) * 100}%` } as CSSProperties}
                />
              </li>
            ))}
          </ol>
          <div aria-hidden className="mt-2 grid grid-flow-col gap-1.5 px-3 text-center text-[11px] font-semibold text-stone-500" style={{ gridAutoColumns: "minmax(0, 1fr)" }}>
            {daily.map((day) => (
              <span key={day.date}>{dayOfMonth(day.date)}</span>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-stone-600">
            Busiest day: <strong className="text-navy">{maxActions === 1 && !daily.some((day) => day.actions) ? "none yet" : `${maxActions} actions`}</strong> ·{" "}
            {daily.reduce((sum, day) => sum + day.actions, 0)} actions in total
          </p>
        </Panel>
        <Panel title="Weekly active learners" icon={CalendarRange} description="Calendar weeks start Monday in Africa/Kampala. The current week is partial; these are activity counts, not a retention rate.">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-navy">
                  Week beginning
                </th>
                <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-bold uppercase tracking-[0.1em] text-navy">
                  Learners
                </th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((week, index) => (
                <tr key={week.date} className="border-t border-navy/8">
                  <td className="px-5 py-2.5">
                    <time dateTime={week.date}>{week.date}</time>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center justify-end gap-3">
                      <GlassMeter value={week.active} max={maxWeekly} tone="navy" size="sm" index={index} className="w-20" />
                      <span className="numeric w-8 text-right font-semibold text-navy">{week.active}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <aside className="admin-card p-5 text-sm leading-relaxed text-stone-600">
        <h2 className="font-semibold text-navy">Reading this report</h2>
        <p className="mt-2">
          A dash means there is no denominator or no comparable score series.
          Progress is based on published lessons and current eligible
          enrolments. Activity uses recorded learning events and excludes
          entries marked as seed data. Time spent learning, satisfaction,
          dropout and retention require separate measurements and are not
          inferred here.
        </p>
        <Link href="/admin/programme" className={keyClass("paper", "sm", "mt-3")}>
          Open programme control
        </Link>
      </aside>
    </div>
  );
}
