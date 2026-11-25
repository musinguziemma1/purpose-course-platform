import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Award, ClipboardCheck, Gauge as GaugeIcon, History, LifeBuoy, ListChecks, Plus, Target } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { courseLevels, courseModules, courses } from "@/db/schema";
import { getAssessmentAdminList, getAssessmentResults, getCohortPerformance } from "@/db/assessments";
import { canManageAssessments, getSessionUser } from "@/lib/auth";
import { AssessmentForm } from "@/components/academy/assessment-forms";
import { updatePassMark } from "@/app/actions/assessments";
import { formatDateTime } from "@/lib/utils";
import { GlassMeter, Led } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, MetricTile, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessments" };

export default async function AdminAssessmentsPage() {
  await requireAdminPage("/admin/academy/assessments");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManageAssessments(user)) redirect("/admin/academy");

  const [list, levels, courseRows, moduleRows, performance, recent] = await Promise.all([
    getAssessmentAdminList(),
    db.select().from(courseLevels).orderBy(asc(courseLevels.sortOrder)),
    db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(asc(courses.sortOrder)),
    db.select({ id: courseModules.id, title: courseModules.title }).from(courseModules).orderBy(asc(courseModules.sortOrder)),
    getCohortPerformance(),
    getAssessmentResults().then((rows) => rows.slice(0, 8)),
  ]);

  const totalAttempts = list.reduce((sum, row) => sum + Number(row.attemptCount), 0);
  const averageScore = totalAttempts ? Math.round(list.reduce((sum, row) => sum + Number(row.averageScore ?? 0) * Number(row.attemptCount), 0) / totalAttempts) : null;
  const needingSupport = performance.filter((student) => student.risk === "at_risk" || student.risk === "critical");

  return (
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/academy", label: "Academy builder" }}
        eyebrow="Assessment engine"
        title="Assessments"
        description="Session quizzes (5 questions) and level exams (20 questions), auto-graded on submission. Pass marks are configured per level — 80% by default."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Assessments" value={list.length} icon={ClipboardCheck} />
        <MetricTile label="Questions" value={list.reduce((sum, row) => sum + Number(row.questionCount), 0)} icon={Target} tone="gold" />
        <MetricTile label="Attempts" value={totalAttempts} icon={History} tone="destiny" />
        <MetricTile label="Average score" value={averageScore === null ? "—" : `${averageScore}%`} icon={Award} tone="source" />
      </div>

      <Panel title="Level pass marks" icon={GaugeIcon} riveted description="The score a learner needs to pass each level's exams and quizzes." bodyClassName="px-5 pb-6 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {levels.map((level) => (
            <form key={level.id} action={updatePassMark} className="flex items-end gap-2 rounded-2xl bg-cream/60 p-3 shadow-[inset_0_1px_3px_rgba(10,26,48,0.14)]">
              <input type="hidden" name="levelId" value={level.id} />
              <label className="flex-1">
                <span className="block text-[13px] font-medium text-navy">{level.name}</span>
                <span className="relative mt-1.5 block">
                  <input
                    name="passMark"
                    type="number"
                    min={50}
                    max={100}
                    defaultValue={level.passMark}
                    aria-label={`${level.name} pass mark (percent)`}
                    className="numeric h-10 w-full rounded-lg border pl-3 pr-8 text-[16px] font-semibold text-navy sm:text-[14px]"
                  />
                  <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-stone-500">%</span>
                </span>
              </label>
              <button type="submit" className={keyClass("navy", "sm")}>
                Save
              </button>
            </form>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="space-y-5">
          {list.length ? (
            <ul className="k-stagger space-y-3" aria-label="Assessments">
              {list.map((row, index) => (
                <li key={row.assessment.id} style={staggerStyle(index)} className="admin-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-gold-dark">
                        {row.assessment.kind === "level" ? "Level exam" : "Session quiz"}
                        <span className="ui-badge rounded-full border border-navy/10 bg-cream px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-stone-700">
                          {row.levelName ?? "—"}
                          {row.moduleTitle ? ` · ${row.moduleTitle}` : ""}
                        </span>
                      </p>
                      <p className="mt-1 font-serif text-[17px] text-navy">{row.assessment.title}</p>
                      <p className="text-[12.5px] text-stone-600">
                        {Number(row.questionCount)} questions · pass {row.assessment.passMark}% · {Number(row.attemptCount)} attempts
                        {row.passRate !== null ? ` · pass rate ${Number(row.passRate)}%` : ""}
                      </p>
                    </div>
                    <Link href={`/admin/academy/assessments/${row.assessment.id}`} className={keyClass("paper", "sm")}>
                      Open <ArrowRight aria-hidden />
                    </Link>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                    <GlassMeter
                      value={Number(row.averageScore ?? 0)}
                      tone={row.averageScore !== null && Number(row.averageScore) < row.assessment.passMark ? "amber" : "source"}
                      index={index}
                      label={`Average score for ${row.assessment.title}`}
                    />
                    <span className="numeric w-24 text-right text-[12.5px] text-stone-600">
                      {row.averageScore !== null ? `avg ${Number(row.averageScore)}%` : "no attempts"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ConsoleEmpty icon={ListChecks} title="No assessments yet." description="Create the first one with the form alongside." />
          )}

          <Panel title="Recent results" icon={History}>
            <ul className="divide-y divide-navy/8">
              {recent.map((row) => (
                <li key={row.attempt.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <Led tone={row.attempt.passed ? "green" : "amber"} />
                  <span className={`numeric w-12 text-[13px] font-semibold ${row.attempt.passed ? "text-source" : "text-amber-800"}`}>{row.attempt.score}%</span>
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-navy">{row.studentName}</p>
                  <span className="text-[12px] text-stone-600">
                    {row.attempt.correctCount}/{row.attempt.totalCount} · {formatDateTime(row.attempt.submittedAt)}
                  </span>
                </li>
              ))}
              {recent.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No attempts yet.</li> : null}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="New assessment" icon={Plus} riveted bodyClassName="px-5 pb-6 pt-4">
            <AssessmentForm levels={levels.map((level) => ({ id: level.id, name: level.name }))} courses={courseRows} modules={moduleRows} />
          </Panel>
          <Panel title="Students needing support" icon={LifeBuoy}>
            <ul className="divide-y divide-navy/8">
              {needingSupport.map((student) => (
                <li key={student.profileId} className="flex gap-3 px-5 py-3">
                  <Led tone={student.risk === "critical" ? "red" : "amber"} pulse={student.risk === "critical"} className="mt-1.5" />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-navy">
                      {student.fullName}{" "}
                      <span className="text-[12px] font-normal text-stone-600">{student.averageScore === null ? "no scores" : `${student.averageScore}% avg`}</span>
                    </p>
                    <p className="text-[12.5px] leading-relaxed text-stone-600">{student.attention[0] ?? "Monitor progress"}</p>
                  </div>
                </li>
              ))}
              {needingSupport.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">Nobody is below the pass mark.</li> : null}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
