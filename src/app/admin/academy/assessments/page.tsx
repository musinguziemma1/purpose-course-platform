import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Award, ClipboardCheck, Plus, Target } from "lucide-react";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assessmentAttempts, courseLevels, courseModules, courses, profiles } from "@/db/schema";
import { getAssessmentAdminList, getCohortPerformance } from "@/db/assessments";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { AssessmentForm } from "@/components/academy/assessment-forms";
import { updatePassMark } from "@/app/actions/assessments";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessments" };

export default async function AdminAssessmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManagePeople(user)) redirect("/admin/academy");

  const [list, levels, courseRows, moduleRows, performance, recent] = await Promise.all([
    getAssessmentAdminList(),
    db.select().from(courseLevels).orderBy(asc(courseLevels.sortOrder)),
    db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(asc(courses.sortOrder)),
    db.select({ id: courseModules.id, title: courseModules.title }).from(courseModules).orderBy(asc(courseModules.sortOrder)),
    getCohortPerformance(),
    db
      .select({ attempt: assessmentAttempts, studentName: profiles.fullName })
      .from(assessmentAttempts)
      .innerJoin(profiles, eq(assessmentAttempts.profileId, profiles.id))
      .orderBy(desc(assessmentAttempts.submittedAt))
      .limit(8),
  ]);

  const totalAttempts = list.reduce((sum, row) => sum + Number(row.attemptCount), 0);
  const averageOfAverages = list.filter((row) => row.averageScore !== null).length
    ? Math.round(
        list
          .filter((row) => row.averageScore !== null)
          .reduce((sum, row) => sum + Number(row.averageScore), 0) / list.filter((row) => row.averageScore !== null).length,
      )
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/academy" className="text-[11.5px] text-stone-600 hover:text-navy">
            ← Academy builder
          </Link>
          <h1 className="mt-1.5 font-serif text-2xl text-navy">Assessments</h1>
          <p className="text-[12.5px] text-stone-600">
            Session quizzes (5 questions) and level exams (20 questions), auto-graded on submission. Pass marks are
            configured per level — 80% by default.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Assessments", value: list.length, icon: ClipboardCheck },
          { label: "Questions", value: list.reduce((sum, row) => sum + Number(row.questionCount), 0), icon: Target },
          { label: "Attempts", value: totalAttempts, icon: ArrowRight },
          { label: "Average score", value: averageOfAverages === null ? "—" : `${averageOfAverages}%`, icon: Award },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-card p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Level pass marks</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {levels.map((level) => (
            <form key={level.id} action={updatePassMark} className="flex items-end gap-2 rounded-lg border border-navy/10 bg-cream/30 p-2.5">
              <input type="hidden" name="levelId" value={level.id} />
              <div className="flex-1">
                <p className="text-[11.5px] font-medium text-navy">{level.name}</p>
                <input
                  name="passMark"
                  type="number"
                  min={50}
                  max={100}
                  defaultValue={level.passMark}
                  className="mt-1 h-8 w-full rounded border border-navy/15 bg-white px-2 text-[12px]"
                />
              </div>
              <button type="submit" className="h-8 rounded-full bg-navy px-3 text-[10.5px] font-semibold text-paper hover:bg-navy-700">
                Save
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="space-y-3">
          {list.map((row) => (
            <div key={row.assessment.id} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-dark">
                    {row.assessment.kind === "level" ? "Level exam" : "Session quiz"}
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[9px] text-stone-600">
                      {row.levelName ?? "—"}{row.moduleTitle ? ` · ${row.moduleTitle}` : ""}
                    </span>
                  </p>
                  <p className="mt-0.5 font-serif text-[15px] text-navy">{row.assessment.title}</p>
                  <p className="text-[10.5px] text-stone-500">
                    {Number(row.questionCount)} questions · pass {row.assessment.passMark}% · {Number(row.attemptCount)} attempts
                    {row.averageScore !== null ? ` · avg ${Number(row.averageScore)}%` : ""}
                    {row.passRate !== null ? ` · pass rate ${Number(row.passRate)}%` : ""}
                  </p>
                </div>
                <Link
                  href={`/admin/academy/assessments/${row.assessment.id}`}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-navy/15 px-3 text-[10.5px] font-medium text-navy hover:bg-cream"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${Math.min(100, Number(row.averageScore ?? 0))}%` }}
                />
              </div>
            </div>
          ))}
          {list.length === 0 ? <p className="admin-card p-5 text-[12px] text-stone-600">No assessments yet.</p> : null}

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Recent results</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {recent.map((row) => (
                <li key={row.attempt.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${row.attempt.passed ? "bg-source/10 text-source" : "bg-amber-100 text-amber-900"}`}>
                    {row.attempt.score}%
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[12px] text-navy">{row.studentName}</p>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                    {row.attempt.correctCount}/{row.attempt.totalCount} · {formatDateTime(row.attempt.submittedAt)}
                  </span>
                </li>
              ))}
              {recent.length === 0 ? <li className="px-5 py-4 text-[12px] text-stone-500">No attempts yet.</li> : null}
            </ul>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6">
          <div className="admin-card p-5">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
              <Plus className="h-3.5 w-3.5 text-gold-dark" /> New assessment
            </p>
            <div className="mt-3">
              <AssessmentForm
                levels={levels.map((level) => ({ id: level.id, name: level.name }))}
                courses={courseRows}
                modules={moduleRows}
              />
            </div>
          </div>
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Students needing support</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {performance
                .filter((student) => student.risk === "at_risk" || student.risk === "critical")
                .map((student) => (
                  <li key={student.profileId} className="px-5 py-2.5">
                    <p className="text-[12px] font-medium text-navy">
                      {student.fullName} <span className="text-[10px] font-normal text-stone-500">{student.averageScore === null ? "no scores" : `${student.averageScore}% avg`}</span>
                    </p>
                    <p className="text-[10.5px] leading-relaxed text-stone-500">{student.attention[0] ?? "Monitor progress"}</p>
                  </li>
                ))}
              {performance.filter((student) => student.risk === "at_risk" || student.risk === "critical").length === 0 ? (
                <li className="px-5 py-4 text-[12px] text-stone-500">Nobody is below the pass mark.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
