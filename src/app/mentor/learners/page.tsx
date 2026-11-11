import Link from "next/link";
import { AlertTriangle, Award, CheckCircle2, Flag, Target, Users } from "lucide-react";
import { getLearnerFlags, getMentorRoster, getMentors, getSessionsForAttendance } from "@/db/learning";
import { getCohortPerformance, getAssessmentResults } from "@/db/assessments";
import { getInstrumentResultsOverview } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { AttendanceForm, FlagForm, GoalForm, GoalUpdateForm, MentorAssignForm, NoteForm } from "@/components/platform/forms";
import { resolveLearnerFlag } from "@/app/actions/platform";

export const dynamic = "force-dynamic";

export const metadata = { title: "Learners & goals" };

export default async function MentorLearnersPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [roster, flags, mentors, performance, results, sessions, instrumentResults] = await Promise.all([
    getMentorRoster(user.profileId),
    getLearnerFlags(),
    getMentors(),
    getCohortPerformance(),
    getAssessmentResults(),
    getSessionsForAttendance(),
    getInstrumentResultsOverview(),
  ]);

  const learners = performance
    .filter((student) => student.risk !== "excellent" || roster.some((row) => row.studentId === student.profileId))
    .slice(0, 8)
    .map((student) => ({ id: student.profileId, fullName: student.fullName }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Learners, goals & notes</h1>
        <p className="text-[12.5px] text-stone-600">
          Your caseload: progress, instrument results, goals, mentoring notes, flags and attendance — with the actions to act on them.
        </p>
      </div>

      {flags.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" /> Learners needing attention
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {flags.map((row) => (
              <li key={row.flag.id} className="flex flex-wrap items-center gap-2 text-[12px] text-amber-900">
                <strong>{row.studentName}</strong>
                <span className="min-w-0 flex-1">{row.flag.reason}</span>
                <form action={resolveLearnerFlag} className="flex items-center gap-1">
                  <input type="hidden" name="flagId" value={row.flag.id} />
                  <input name="resolutionNote" placeholder="Resolution" className="h-7 w-32 rounded border border-amber-300 px-2 text-[10.5px]" />
                  <button type="submit" className="rounded-full bg-amber-900 px-2.5 py-1 text-[10px] font-semibold text-amber-50">
                    Resolve
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-source/25 bg-source/5 p-3.5 text-[12px] text-stone-700">
          <p className="inline-flex items-center gap-1.5 font-semibold text-source">
            <CheckCircle2 className="h-3.5 w-3.5" /> No open flags
          </p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-4">
          {roster.map((student) => (
            <div key={student.studentId} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-serif text-[16px] text-navy">{student.fullName}</p>
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-stone-500">{student.title ?? "Learner"}</p>
                  {student.focus ? <p className="text-[11px] text-stone-600">Focus: {student.focus}</p> : null}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[9.5px] uppercase tracking-[0.08em]">
                  <span className="rounded-full bg-cream px-2 py-0.5 text-stone-600">{student.activeGoals} active goals</span>
                  <span className="rounded-full bg-cream px-2 py-0.5 text-stone-600">{student.instrumentResults} assessments</span>
                  {student.averageInstrument !== null ? (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold-dark">avg {student.averageInstrument}</span>
                  ) : null}
                  {student.flags.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                      <Flag className="h-2.5 w-2.5" /> {student.flags.length}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {student.goals.map((goal) => (
                  <div key={goal.id} className="rounded-md border border-navy/10 bg-cream/30 px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11.5px] font-medium text-navy">{goal.title}</p>
                      <span className="text-[9.5px] text-stone-500">{goal.progress}%</span>
                    </div>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-paper">
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${goal.progress}%` }} />
                    </span>
                    <p className="mt-0.5 text-[9.5px] text-stone-500">
                      {goal.status}
                      {goal.dueAt ? ` · due ${formatDate(goal.dueAt, "short")}` : ""}
                    </p>
                    <GoalUpdateForm goalId={goal.id} progress={goal.progress} status={goal.status} />
                  </div>
                ))}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <details className="rounded-md border border-navy/10 bg-paper px-2.5 py-1.5">
                  <summary className="cursor-pointer text-[11px] font-semibold text-gold-dark">+ Set a goal</summary>
                  <div className="mt-1.5"><GoalForm studentId={student.studentId} learnerName={student.fullName} /></div>
                </details>
                <details className="rounded-md border border-navy/10 bg-paper px-2.5 py-1.5">
                  <summary className="cursor-pointer text-[11px] font-semibold text-gold-dark">+ Mentoring note</summary>
                  <NoteForm studentId={student.studentId} />
                </details>
                <details className="rounded-md border border-navy/10 bg-paper px-2.5 py-1.5 sm:col-span-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-rose-700">Flag for follow-up</summary>
                  <FlagForm studentId={student.studentId} />
                </details>
              </div>
            </div>
          ))}
          {roster.length === 0 ? (
            <div className="admin-card p-6 text-[12px] text-stone-600">No assigned learners yet. An administrator can assign mentees.</div>
          ) : null}

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <Award className="h-3.5 w-3.5 text-gold-dark" /> Latest assessment results
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {results.slice(0, 8).map((row) => (
                <li key={row.attempt.id} className="flex flex-wrap items-center gap-2 px-5 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${row.attempt.passed ? "bg-source/10 text-source" : "bg-amber-100 text-amber-900"}`}>
                    {row.attempt.score}%
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[11.5px] text-navy">{row.studentName} · {row.assessmentTitle}</p>
                </li>
              ))}
              {results.length === 0 ? <li className="px-5 py-4 text-[12px] text-stone-500">No results yet.</li> : null}
            </ul>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6">
          <div className="admin-card p-4">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
              <Users className="h-3.5 w-3.5 text-gold-dark" /> Assign mentorship
            </p>
            <div className="mt-2"><MentorAssignForm learners={learners} mentors={mentors} /></div>
          </div>

          <div className="admin-card p-4">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
              <Target className="h-3.5 w-3.5 text-gold-dark" /> Mark attendance
            </p>
            <div className="mt-2">
              <AttendanceForm
                sessions={sessions.map((row) => ({ id: row.session.id, title: row.session.title, startsAt: row.session.startsAt.toISOString() }))}
                students={learners}
              />
            </div>
            <Link href="/mentor/live" className="mt-2 inline-flex text-[11px] font-semibold text-gold-dark hover:underline">
              Session recordings →
            </Link>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-4 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Instrument results</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {instrumentResults.slice(0, 6).map((row) => (
                <li key={row.result.id} className="px-4 py-2">
                  <p className="text-[11.5px] font-medium text-navy">{row.studentName}</p>
                  <p className="text-[10px] text-stone-500">
                    {row.instrumentTitle} · {row.result.overallScore} · {row.result.bandLabel} · v{row.version}
                  </p>
                </li>
              ))}
              {instrumentResults.length === 0 ? <li className="px-4 py-4 text-[12px] text-stone-500">No instrument results yet.</li> : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
