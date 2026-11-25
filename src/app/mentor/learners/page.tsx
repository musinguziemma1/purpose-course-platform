import Link from "next/link";
import { AlertTriangle, ArrowRight, Award, CheckCircle2, Flag, Gauge, Target, Users } from "lucide-react";
import { getLearnerFlags, getMentorRoster, getMentors, getSessionsForAttendance } from "@/db/learning";
import { getCohortPerformance, getAssessmentResults } from "@/db/assessments";
import { getInstrumentResultsOverview } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { AttendanceForm, FlagForm, GoalForm, GoalUpdateForm, MentorAssignForm, NoteForm } from "@/components/platform/forms";
import { resolveLearnerFlag } from "@/app/actions/platform";
import {
  DeskDrawer,
  DeskEmpty,
  DeskHero,
  DeskSheet,
  DeskTag,
  FlapBoard,
  GradeStamp,
  GrooveMeter,
  LeatherChip,
  Seal,
  SheetHead,
  SheetLink,
  rise,
} from "@/components/mentor/desk";

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
  const activeGoals = roster.reduce((sum, student) => sum + student.activeGoals, 0);

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        eyebrow="Caseload"
        title="Learners, goals & notes"
        description="Your caseload: progress, instrument results, goals, mentoring notes, flags and attendance, with the actions to act on them."
        meta={flags.length === 0 ? <LeatherChip tone="green">No open flags</LeatherChip> : <LeatherChip tone="rose">{flags.length} open flags</LeatherChip>}
        aside={
          <FlapBoard
            label="Case files"
            items={[
              { label: "Learners", value: roster.length },
              { label: "Active goals", value: activeGoals },
              { label: "Flags", value: flags.length },
            ]}
          />
        }
      />

      {flags.length > 0 ? (
        <section aria-labelledby="flags" className="desk-notice desk-rise px-5 pb-5 pt-6" style={rise(1)}>
          <h2 id="flags" className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]">
            <AlertTriangle aria-hidden className="h-4 w-4" /> Learners needing attention
          </h2>
          <ul className="mt-3 space-y-2.5">
            {flags.map((row) => (
              <li key={row.flag.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white/55 px-3 py-2.5 text-[13.5px] shadow-[inset_0_1px_0_#fff]">
                <Seal name={row.studentName} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{row.studentName}</p>
                  <p className="text-[13px] text-[#6b2f0a]">{row.flag.reason}</p>
                </div>
                <form action={resolveLearnerFlag} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="flagId" value={row.flag.id} />
                  <label className="sr-only" htmlFor={`resolution-${row.flag.id}`}>
                    Resolution note for {row.studentName}
                  </label>
                  <input
                    id={`resolution-${row.flag.id}`}
                    name="resolutionNote"
                    placeholder="Resolution"
                    className="h-9 w-40 rounded-lg border border-amber-300 bg-white/80 px-2.5 text-[13px] shadow-[inset_0_1px_2px_rgba(124,58,11,0.12)]"
                  />
                  <button type="submit" className="desk-btn" data-size="sm">
                    <CheckCircle2 aria-hidden /> Resolve
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-7">
          {roster.map((student, index) => (
            <DeskSheet key={student.studentId} as="article" className="desk-rise p-5 sm:p-6" style={rise(index + 2)} labelledBy={`learner-${student.studentId}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <Seal name={student.fullName} size="lg" />
                  <div className="min-w-0">
                    <h2 id={`learner-${student.studentId}`} className="desk-letterpress font-serif text-[1.3rem] leading-tight">
                      {student.fullName}
                    </h2>
                    <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-500">{student.title ?? "Learner"}</p>
                    {student.focus ? <p className="mt-1 text-[13.5px] text-stone-600">Focus: {student.focus}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <DeskTag>{student.activeGoals} active goals</DeskTag>
                  <DeskTag>{student.instrumentResults} assessments</DeskTag>
                  {student.averageInstrument !== null ? <DeskTag tone="gold">avg {student.averageInstrument}</DeskTag> : null}
                  {student.flags.length > 0 ? (
                    <DeskTag tone="amber">
                      <Flag aria-hidden className="h-3 w-3" /> {student.flags.length}
                      <span className="sr-only"> open flags</span>
                    </DeskTag>
                  ) : null}
                </div>
              </div>

              {student.goals.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {student.goals.map((goal, goalIndex) => (
                    <div key={goal.id} className="desk-ticket">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13.5px] font-semibold leading-snug text-navy">{goal.title}</p>
                        <span className="numeric text-[12.5px] font-semibold text-gold-dark">{goal.progress}%</span>
                      </div>
                      <GrooveMeter value={goal.progress} label={`${goal.title}: ${goal.progress}%`} tone="gold" size="sm" className="mt-2" delay={240 + goalIndex * 40} />
                      <p className="mt-1.5 text-[12px] text-stone-500">
                        {goal.status}
                        {goal.dueAt ? ` · due ${formatDate(goal.dueAt, "short")}` : ""}
                      </p>
                      <hr className="desk-perf" />
                      <GoalUpdateForm goalId={goal.id} progress={goal.progress} status={goal.status} />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <Link href={`/mentor/learners/${student.studentId}`} className="desk-btn" data-variant="teal" data-size="sm">
                  Purpose Journey &amp; profile <ArrowRight aria-hidden />
                </Link>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <DeskDrawer summary="Set a goal">
                  <GoalForm studentId={student.studentId} learnerName={student.fullName} />
                </DeskDrawer>
                <DeskDrawer summary="Mentoring note">
                  <NoteForm studentId={student.studentId} />
                </DeskDrawer>
                <DeskDrawer summary="Flag for follow-up" tone="rose" className="sm:col-span-2">
                  <FlagForm studentId={student.studentId} />
                </DeskDrawer>
              </div>
            </DeskSheet>
          ))}
          {roster.length === 0 ? (
            <DeskSheet className="desk-rise" style={rise(2)}>
              <DeskEmpty>No assigned learners yet. An administrator can assign mentees.</DeskEmpty>
            </DeskSheet>
          ) : null}

          <DeskSheet className="desk-rise overflow-hidden" style={rise(roster.length + 2)} labelledBy="latest-results">
            <SheetHead id="latest-results" eyebrow="Marks book" title="Latest assessment results" icon={Award} tone="gold" />
            {results.length === 0 ? (
              <DeskEmpty>No results yet.</DeskEmpty>
            ) : (
              <ul className="divide-y divide-navy/8">
                {results.slice(0, 8).map((row, index) => (
                  <li key={row.attempt.id} className="flex items-center gap-4 px-5 py-3">
                    <GradeStamp score={row.attempt.score} passed={row.attempt.passed} caption={row.attempt.passed ? "Pass" : "Retry"} size="sm" delay={260 + index * 40} />
                    <p className="min-w-0 flex-1 truncate text-[13.5px] text-navy">
                      <span className="font-medium">{row.studentName}</span> · {row.assessmentTitle}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DeskSheet>
        </div>

        <div className="space-y-7 xl:sticky xl:top-24">
          <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="assign-mentorship">
            <SheetHead id="assign-mentorship" title="Assign mentorship" icon={Users} tone="navy" />
            <div className="px-5 pb-5 pt-4">
              <MentorAssignForm learners={learners} mentors={mentors} />
            </div>
          </DeskSheet>

          <DeskSheet className="desk-rise overflow-hidden" style={rise(3)} labelledBy="mark-attendance">
            <SheetHead id="mark-attendance" title="Mark attendance" icon={Target} tone="teal" action={<SheetLink href="/mentor/live">Recordings</SheetLink>} />
            <div className="px-5 pb-5 pt-4">
              <AttendanceForm
                sessions={sessions.map((row) => ({ id: row.session.id, title: row.session.title, startsAt: row.session.startsAt.toISOString() }))}
                students={learners}
              />
            </div>
          </DeskSheet>

          <DeskSheet className="desk-rise overflow-hidden" style={rise(4)} labelledBy="instrument-results">
            <SheetHead id="instrument-results" eyebrow="Instruments" title="Instrument results" icon={Gauge} tone="plum" />
            {instrumentResults.length === 0 ? (
              <DeskEmpty>No instrument results yet.</DeskEmpty>
            ) : (
              <ul className="divide-y divide-navy/8">
                {instrumentResults.slice(0, 6).map((row) => (
                  <li key={row.result.id} className="flex items-center gap-3 px-5 py-3">
                    <Seal name={row.studentName} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-navy">{row.studentName}</p>
                      <p className="text-[12.5px] text-stone-600">
                        {row.instrumentTitle} · {row.result.bandLabel} · v{row.version}
                      </p>
                    </div>
                    <span className="desk-coin">{row.result.overallScore}</span>
                  </li>
                ))}
              </ul>
            )}
          </DeskSheet>
        </div>
      </div>
    </div>
  );
}
