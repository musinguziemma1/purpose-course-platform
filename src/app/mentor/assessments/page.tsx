import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Award, CheckCircle2, TrendingDown, TrendingUp, Users } from "lucide-react";
import { getAssessmentResults, getCohortPerformance } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessment performance" };

const RISK_META: Record<string, { label: string; tone: string }> = {
  excellent: { label: "Excellent", tone: "bg-source/10 text-source border-source/25" },
  on_track: { label: "On track", tone: "bg-cream text-stone-600 border-navy/12" },
  at_risk: { label: "Needs attention", tone: "bg-amber-100 text-amber-900 border-amber-200" },
  critical: { label: "Critical", tone: "bg-rose-100 text-rose-800 border-rose-200" },
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
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Assessment performance</h1>
        <p className="text-[12.5px] text-stone-600">
          Auto-graded scores from every session quiz and level exam, with lesson completion and group work — so you can
          see who is growing and intervene early.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Cohort average", value: cohortAverage === null ? "—" : `${cohortAverage}%`, icon: Award },
          { label: "Need attention", value: attention.length, icon: AlertTriangle },
          { label: "Improving", value: improving.length, icon: TrendingUp },
          { label: "Declining", value: declining.length, icon: TrendingDown },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      {attention.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" /> Follow-up queue
          </p>
          <ul className="mt-2 space-y-1.5">
            {attention.map((student) => (
              <li key={student.profileId} className="text-[12px] leading-relaxed text-amber-900">
                <strong>{student.fullName}</strong> — {student.attention.slice(0, 2).join("; ")}.{" "}
                <Link href="/mentor/mentees" className="font-semibold underline decoration-amber-400 underline-offset-2">
                  Open a coaching conversation
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-source/25 bg-source/5 p-4 text-[12px] text-stone-700">
          <p className="inline-flex items-center gap-1.5 font-semibold text-source">
            <CheckCircle2 className="h-3.5 w-3.5" /> No students below the pass mark
          </p>
          <p className="mt-1">Every submitted assessment is at or above the level pass mark.</p>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
            <Users className="h-3.5 w-3.5" /> Student progress matrix
          </p>
          <span className="text-[11px] text-stone-500">{performance.length} learners</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[54rem] text-left text-[12px]">
            <thead className="bg-cream/40 text-[9.5px] uppercase tracking-[0.08em] text-stone-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Student</th>
                <th className="px-4 py-2 font-semibold">Lessons</th>
                <th className="px-4 py-2 font-semibold">Avg score</th>
                <th className="px-4 py-2 font-semibold">Last</th>
                <th className="px-4 py-2 font-semibold">Trend</th>
                <th className="px-4 py-2 font-semibold">Passed</th>
                <th className="px-4 py-2 font-semibold">Group</th>
                <th className="px-4 py-2 font-semibold">Certs</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/8">
              {performance.map((student) => (
                <tr key={student.profileId} className="hover:bg-cream/30">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-navy">{student.fullName}</p>
                    <p className="text-[10px] text-stone-500">{student.levelName}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-cream">
                        <span className="block h-full rounded-full bg-navy" style={{ width: `${student.lessonPercent}%` }} />
                      </span>
                      <span className="text-[10.5px] text-stone-600">{student.lessonPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-navy">{student.averageScore === null ? "—" : `${student.averageScore}%`}</td>
                  <td className="px-4 py-2.5 text-stone-600">{student.lastScore === null ? "—" : `${student.lastScore}%`}</td>
                  <td className="px-4 py-2.5">
                    {student.trend === null ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 ${student.trend >= 0 ? "text-source" : "text-rose-600"}`}>
                        {student.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {student.trend > 0 ? "+" : ""}
                        {student.trend}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">
                    {student.passedAssessments}/{student.attempts}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{student.groupScore === null ? "—" : `${student.groupScore}%`}</td>
                  <td className="px-4 py-2.5 text-stone-600">{student.certificates}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${RISK_META[student.risk].tone}`}>
                      {RISK_META[student.risk].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Recent submissions</p>
          <Link href="/mentor/groups" className="text-[11px] font-semibold text-gold-dark hover:underline">
            Group work →
          </Link>
        </div>
        <ul className="divide-y divide-navy/8">
          {results.slice(0, 10).map((row) => (
            <li key={row.attempt.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
              <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${row.attempt.passed ? "bg-source/10 text-source" : "bg-amber-100 text-amber-900"}`}>
                {row.attempt.score}%
              </span>
              <p className="min-w-0 flex-1 truncate text-[12px] text-navy">
                {row.studentName} · {row.assessmentTitle}
              </p>
              <span className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                {row.attempt.correctCount}/{row.attempt.totalCount} · {formatDateTime(row.attempt.submittedAt)}
              </span>
              <Link href="/mentor/mentees" aria-label="Open mentee" className="text-stone-400 hover:text-gold-dark">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
          {results.length === 0 ? <li className="px-5 py-6 text-[12px] text-stone-500">No submissions yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
