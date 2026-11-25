import Link from "next/link";
import { AlertTriangle, ArrowRight, ArrowUpRight, ClipboardList, TrendingDown, TrendingUp, Users } from "lucide-react";
import { getAssessmentResults, getCohortPerformance } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import {
  DeskDial,
  DeskEmpty,
  DeskHero,
  DeskSheet,
  DeskStat,
  DeskTag,
  GradeStamp,
  GrooveMeter,
  LeatherChip,
  SheetHead,
  SheetLink,
  rise,
} from "@/components/mentor/desk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessment performance" };

const RISK_META: Record<string, { label: string; tone: "green" | "amber" | "rose" | undefined }> = {
  excellent: { label: "Excellent", tone: "green" },
  on_track: { label: "On track", tone: undefined },
  at_risk: { label: "Needs attention", tone: "amber" },
  critical: { label: "Critical", tone: "rose" },
};

export default async function MentorAssessmentsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [performance, results] = await Promise.all([getCohortPerformance(), getAssessmentResults()]);

  const scored = performance.filter((student) => student.averageScore !== null);
  const cohortAverage = scored.length
    ? Math.round(scored.reduce((sum, student) => sum + (student.averageScore ?? 0), 0) / scored.length)
    : null;
  const attention = performance.filter((student) => student.risk === "at_risk" || student.risk === "critical");
  const improving = performance.filter((student) => (student.trend ?? 0) > 0);
  const declining = performance.filter((student) => (student.trend ?? 0) < 0);

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        eyebrow="Marks book"
        title="Assessment performance"
        description="Auto-graded scores from every session quiz and level exam, with lesson completion and group work, so you can see who is growing and intervene early. Score change compares first and latest submissions with the same assessment, question set and pass mark. Follow-up indicators flag latest failed assessments; they do not predict dropout."
        meta={
          <>
            <LeatherChip tone="teal">{performance.length} learners</LeatherChip>
            <LeatherChip>{scored.length} with scores</LeatherChip>
          </>
        }
        aside={<DeskDial value={cohortAverage} label="Cohort average" caption={scored.length ? `across ${scored.length} scored learners` : undefined} />}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <DeskStat label="Need attention" value={attention.length} icon={AlertTriangle} tone="rust" style={rise(1)} />
        <DeskStat label="Improving" value={improving.length} icon={TrendingUp} tone="green" style={rise(2)} />
        <DeskStat label="Declining" value={declining.length} icon={TrendingDown} tone="oxblood" style={rise(3)} />
      </div>

      {attention.length > 0 ? (
        <section aria-labelledby="follow-up" className="desk-notice desk-rise px-5 pb-5 pt-6" style={rise(3)}>
          <h2 id="follow-up" className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]">
            <AlertTriangle aria-hidden className="h-4 w-4" /> Follow-up queue
          </h2>
          <ul className="mt-3 space-y-2">
            {attention.map((student) => (
              <li key={student.profileId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/55 px-3 py-2.5 text-[13.5px] leading-relaxed shadow-[inset_0_1px_0_#fff]">
                <strong className="text-navy">{student.fullName}</strong>
                <span className="min-w-0 flex-1">{student.attention.slice(0, 2).join("; ")}.</span>
                <Link href="/mentor/learners" className="inline-flex min-h-10 items-center gap-1 font-semibold text-[#7c3a0b] underline decoration-amber-400 decoration-2 underline-offset-4">
                  Open a coaching conversation <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="desk-notice desk-rise px-5 pb-4 pt-5" data-tone="green" style={rise(3)}>
          <p className="font-semibold">No students below the pass mark</p>
          <p className="mt-1 text-[13.5px]">Every submitted assessment is at or above the level pass mark.</p>
        </section>
      )}

      <DeskSheet className="desk-rise overflow-hidden" style={rise(4)} labelledBy="matrix">
        <SheetHead id="matrix" eyebrow="Ledger" title="Student progress matrix" icon={Users} tone="navy" count={performance.length} />
        <div className="overflow-x-auto">
          <table className="desk-ledger w-full min-w-[56rem] text-left text-[13px]">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-2.5">Student</th>
                <th scope="col" className="px-4 py-2.5">Lessons</th>
                <th scope="col" className="px-4 py-2.5">Avg score</th>
                <th scope="col" className="px-4 py-2.5">Last</th>
                <th scope="col" className="px-4 py-2.5">Comparable change</th>
                <th scope="col" className="px-4 py-2.5">Passed</th>
                <th scope="col" className="px-4 py-2.5">Group</th>
                <th scope="col" className="px-4 py-2.5">Certs</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((student) => (
                <tr key={student.profileId}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <p className="font-medium text-navy">{student.fullName}</p>
                    <p className="text-[12px] text-stone-500">{student.levelName}</p>
                  </th>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GrooveMeter value={student.lessonPercent} label={`${student.fullName}: ${student.lessonPercent}% of lessons`} tone="navy" size="sm" className="w-16" />
                      <span className="numeric text-[12px] text-stone-600">{student.lessonPercent}%</span>
                    </div>
                  </td>
                  <td className="numeric px-4 py-3 font-serif text-[15px] text-navy">{student.averageScore === null ? "—" : `${student.averageScore}%`}</td>
                  <td className="numeric px-4 py-3 text-stone-600">{student.lastScore === null ? "—" : `${student.lastScore}%`}</td>
                  <td className="px-4 py-3">
                    {student.trend === null ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <span className={`numeric inline-flex items-center gap-1 font-semibold ${student.trend >= 0 ? "text-source" : "text-rose-700"}`}>
                        {student.trend >= 0 ? <TrendingUp aria-hidden className="h-3.5 w-3.5" /> : <TrendingDown aria-hidden className="h-3.5 w-3.5" />}
                        {student.trend > 0 ? "+" : ""}
                        {student.trend}
                      </span>
                    )}
                  </td>
                  <td className="numeric px-4 py-3 text-stone-600">
                    {student.passedAssessments}/{student.attempts}
                  </td>
                  <td className="numeric px-4 py-3 text-stone-600">{student.groupScore === null ? "—" : `${student.groupScore}%`}</td>
                  <td className="numeric px-4 py-3 text-stone-600">{student.certificates}</td>
                  <td className="px-4 py-3">
                    <DeskTag tone={student.attempts ? RISK_META[student.risk].tone : undefined}>
                      {student.attempts ? RISK_META[student.risk].label : "No scores yet"}
                    </DeskTag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {performance.length === 0 ? <DeskEmpty>No learners to show yet.</DeskEmpty> : null}
        </div>
      </DeskSheet>

      <DeskSheet className="desk-rise overflow-hidden" style={rise(5)} labelledBy="recent-submissions">
        <SheetHead
          id="recent-submissions"
          eyebrow="Marked papers"
          title="Recent submissions"
          icon={ClipboardList}
          tone="gold"
          action={<SheetLink href="/mentor/groups">Group work <ArrowRight aria-hidden className="h-3.5 w-3.5" /></SheetLink>}
        />
        {results.length === 0 ? (
          <DeskEmpty>No submissions yet.</DeskEmpty>
        ) : (
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {results.slice(0, 10).map((row, index) => (
              <li key={row.attempt.id} className="flex items-center gap-4 border-b border-navy/8 px-5 py-3.5">
                <GradeStamp score={row.attempt.score} passed={row.attempt.passed} caption={row.attempt.passed ? "Pass" : "Retry"} size="sm" delay={300 + index * 35} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-navy">{row.studentName}</p>
                  <p className="truncate text-[12.5px] text-stone-600">{row.assessmentTitle}</p>
                  <p className="numeric text-[11.5px] uppercase tracking-[0.08em] text-stone-500">
                    {row.attempt.correctCount}/{row.attempt.totalCount} · {formatDateTime(row.attempt.submittedAt)}
                  </p>
                </div>
                <Link href="/mentor/learners" aria-label={`Open ${row.studentName} in learners`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-cream hover:text-gold-dark">
                  <ArrowUpRight aria-hidden className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DeskSheet>
    </div>
  );
}
