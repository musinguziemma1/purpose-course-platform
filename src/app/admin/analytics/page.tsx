import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearningReport } from "@/db/learning-metrics";
import { requireAdminPage } from "@/lib/page-access";
import { Label, Select } from "@/components/ui/field";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learning analytics" };
const percent = (completed: number, total: number) =>
  total ? `${Math.round((completed / total) * 100)}%` : "—";

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
  const change =
    s.improvement === null
      ? "—"
      : `${s.improvement > 0 ? "+" : ""}${s.improvement}`;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
          Purpose Course
        </p>
        <h1 className="mt-2 font-serif text-3xl text-navy">
          Learning analytics
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
          Enrolment, published lesson progress, assessment results and recorded
          learning activity. Inactive accounts, staff activity and demonstration
          events are excluded.
        </p>
      </header>
      <form
        action="/admin/analytics"
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-navy/10 bg-paper p-4"
      >
        <div className="min-w-0 flex-1">
          <Label htmlFor="analytics-cohort">Report scope</Label>
          <Select
            id="analytics-cohort"
            name="cohort"
            defaultValue={cohortId ?? ""}
          >
            <option value="">All active learner accounts</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} · {cohort.learners} active members
              </option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-paper"
        >
          Apply scope
        </button>
      </form>
      <p className="text-sm font-semibold text-navy" role="status">
        {selected
          ? `Scope: ${selected.name} · active learner memberships only`
          : "Scope: all active learner accounts"}
      </p>
      <section
        aria-label="Learning measures"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {[
          {
            label: "Learner accounts",
            value: s.learners,
            detail: "Active accounts with the student role in this scope.",
          },
          {
            label: "Active learners · 30 days",
            value: s.activeLearners,
            detail:
              "Distinct learners with a recorded learning action in the last 30 days.",
          },
          {
            label: "Lesson completion",
            value: percent(s.completed, s.opportunities),
            detail: `${s.completed} of ${s.opportunities} learner–lesson opportunities. Unstarted lessons remain in the denominator.`,
          },
          {
            label: "Course award rate",
            value: percent(s.courseAwards, s.coursePairs),
            detail: `${s.courseAwards} valid course awards across ${s.coursePairs} learner–course pairs with published lessons.`,
          },
          {
            label: "Valid certificates",
            value: s.certificates,
            detail:
              "Issued course and level certificates; revoked certificates excluded.",
          },
          {
            label: "Assessment pass rate",
            value: percent(s.passed, s.attempts),
            detail: `${s.passed} passes from ${s.attempts} submitted attempts in the current enrolled curriculum. Voided attempts excluded.`,
          },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-navy/10 bg-paper p-5"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              {card.label}
            </h2>
            <p className="mt-3 font-serif text-3xl text-navy">{card.value}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-600">
              {card.detail}
            </p>
          </article>
        ))}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-navy/10 bg-paper p-5">
          <h2 className="font-serif text-xl text-navy">Assessment change</h2>
          <p className="mt-3 font-serif text-3xl text-navy">
            {change}
            <span className="ml-2 font-sans text-sm text-stone-600">
              percentage points
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Mean change from first to latest submission for each learner and
            assessment with the same stored question set and pass mark.{" "}
            {s.comparisons} comparable series.
          </p>
          <p className="mt-3 text-sm text-stone-600">
            Average submitted score:{" "}
            <strong>{s.average === null ? "—" : `${s.average}%`}</strong>
          </p>
        </section>
        <section className="rounded-xl border border-navy/10 bg-paper p-5">
          <h2 className="font-serif text-xl text-navy">Development goals</h2>
          <p className="mt-3 font-serif text-3xl text-navy">
            {percent(s.achievedGoals, s.goals)}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            {s.achievedGoals} achieved of {s.goals} active or achieved goals.
            Cancelled goals are excluded.
          </p>
          <p className="mt-3 text-sm text-stone-600">
            Active mentor assignments: <strong>{s.mentors}</strong>
          </p>
        </section>
      </div>
      <section className="overflow-hidden rounded-xl border border-navy/10 bg-paper">
        <div className="p-5">
          <h2 className="font-serif text-xl text-navy">
            Progress by published course
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Each learner is counted once per course granted by an enrolled or
            completed level enrolment.
          </p>
        </div>
        <ul className="divide-y divide-navy/10">
          {courses.map((course) => (
            <li key={course.id} className="p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold text-navy">{course.title}</h3>
                <span className="text-sm text-stone-600">
                  {course.learners} learners · {course.awarded} course awards
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-600">
                {course.completed}/{course.total} lesson opportunities completed
                · {percent(course.completed, course.total)}
              </p>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-cream"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-gold"
                  style={{
                    width: course.total
                      ? `${(course.completed / course.total) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        {!courses.length ? (
          <p className="px-5 pb-5 text-sm text-stone-600">
            No published courses are assigned to enrolled learners in this
            scope.
          </p>
        ) : null}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-navy/10 bg-paper p-5">
          <h2 className="font-serif text-xl text-navy">
            Recorded activity · 14 days
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Dates use Africa/Kampala. Bars count learning actions, including
            completion, reopening, assessment and award events.
          </p>
          <ul className="mt-4 space-y-2">
            {daily.map((day) => (
              <li key={day.date} className="flex items-center gap-3 text-xs">
                <time
                  dateTime={day.date}
                  className="w-20 shrink-0 text-stone-600"
                >
                  {day.date}
                </time>
                <div
                  className="h-2 min-w-0 flex-1 rounded-full bg-cream"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-navy/70"
                    style={{ width: `${(day.actions / maxActions) * 100}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-stone-600">
                  {day.actions} actions · {day.active} learners
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-navy/10 bg-paper p-5">
          <h2 className="font-serif text-xl text-navy">
            Weekly active learners
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Calendar weeks start Monday in Africa/Kampala. The current week is
            partial; these are activity counts, not a retention rate.
          </p>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="py-2 font-semibold text-navy">
                  Week beginning
                </th>
                <th
                  scope="col"
                  className="py-2 text-right font-semibold text-navy"
                >
                  Learners
                </th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((week) => (
                <tr key={week.date} className="border-t border-navy/10">
                  <td className="py-2">
                    <time dateTime={week.date}>{week.date}</time>
                  </td>
                  <td className="py-2 text-right">{week.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <aside className="rounded-xl border border-navy/10 bg-paper p-5 text-sm leading-relaxed text-stone-600">
        <h2 className="font-semibold text-navy">Reading this report</h2>
        <p className="mt-2">
          A dash means there is no denominator or no comparable score series.
          Progress is based on published lessons and current eligible
          enrolments. Activity uses recorded learning events and excludes
          entries marked as seed data. Time spent learning, satisfaction,
          dropout and retention require separate measurements and are not
          inferred here.
        </p>
        <Link
          href="/admin/programme"
          className="mt-3 inline-block font-semibold text-navy underline underline-offset-4"
        >
          Open programme control
        </Link>
      </aside>
    </div>
  );
}
