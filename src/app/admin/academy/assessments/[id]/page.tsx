import { requireAdminPage } from "@/lib/page-access";
import { notFound, redirect } from "next/navigation";
import { Check, ClipboardList, History, ListPlus, Trash2 } from "lucide-react";
import { getAssessmentForAdmin } from "@/db/assessments";
import { canManageAssessments, getSessionUser } from "@/lib/auth";
import { QuestionForm } from "@/components/academy/assessment-forms";
import { deleteQuestion } from "@/app/actions/assessments";
import { formatDateTime } from "@/lib/utils";
import { Gauge, Led } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, MetricTile, Panel, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminAssessmentEditorPage({ params }: Params) {
  await requireAdminPage("/admin/academy/assessments/[id]");
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManageAssessments(user)) redirect("/admin/academy");

  const record = await getAssessmentForAdmin(Number(id));
  if (!record) notFound();

  const { assessment, questions, attempts } = record;
  const average = attempts.length ? Math.round(attempts.reduce((sum, row) => sum + row.attempt.score, 0) / attempts.length) : null;
  const passRate = attempts.length ? Math.round((attempts.filter((row) => row.attempt.passed).length / attempts.length) * 100) : null;
  const target = assessment.kind === "level" ? 20 : 5;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/academy/assessments", label: "Assessments" }}
        eyebrow={`${assessment.kind === "level" ? "Level exam" : "Session quiz"} · ${record.levelName ?? "—"}${record.courseTitle ? ` · ${record.courseTitle}` : ""}`}
        title={assessment.title}
        description={`${questions.length} questions · pass mark ${assessment.passMark}% · ${assessment.timeLimitMinutes} min · ${assessment.maxAttempts} attempts allowed`}
      />

      <section aria-label="Results" className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr]">
        <div className="admin-card k-riveted px-5 py-6">
          <Gauge label="Average score" value={average} tone="gold" caption={`Pass mark ${assessment.passMark}%`} />
        </div>
        <div className="admin-card k-riveted px-5 py-6">
          <Gauge label="Pass rate" value={passRate} tone="source" caption={`${attempts.length} attempts`} />
        </div>
        <div className="grid gap-3">
          <MetricTile label="Questions" value={questions.length} icon={ClipboardList} hint={`Aim for ${target} ${assessment.kind === "level" ? "across the level" : "per session"}.`} />
          <MetricTile label="Attempts" value={attempts.length} icon={History} tone="destiny" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-5">
          {questions.length ? (
            <ol className="k-stagger space-y-3.5" aria-label="Questions">
              {questions.map((question, index) => (
                <li key={question.id} style={staggerStyle(index)} className="admin-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex gap-3 text-[14.5px] font-medium leading-snug text-navy">
                      <span className="k-well font-serif text-[14px] text-navy">{index + 1}</span>
                      <span className="pt-1">{question.prompt}</span>
                    </p>
                    <form action={deleteQuestion}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <input type="hidden" name="assessmentId" value={assessment.id} />
                      <button type="submit" aria-label="Delete question" className="k-key k-key-icon text-rose-700">
                        <Trash2 aria-hidden />
                      </button>
                    </form>
                  </div>
                  <ul className="mt-3 space-y-1.5 pl-11">
                    {question.options.map((option, optionIndex) => {
                      const correct = optionIndex === question.correctIndex;
                      return (
                        <li
                          key={optionIndex}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13.5px] ${correct ? "bg-source/10 font-medium text-source shadow-[inset_0_0_0_1px_rgba(47,107,64,0.2)]" : "text-stone-700"}`}
                        >
                          <span className="numeric w-4 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                          <span className="min-w-0 flex-1">{option}</span>
                          {correct ? (
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold">
                              <Check aria-hidden className="h-3.5 w-3.5" /> correct
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  {question.explanation ? (
                    <p className="ml-11 mt-2.5 rounded-xl bg-cream/60 px-3.5 py-2 text-[13px] leading-relaxed text-stone-700 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">
                      Explanation: {question.explanation}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <ConsoleEmpty icon={ClipboardList} title="No questions yet." description="Add 5 for a session quiz or 20 for a level exam — grading is automatic." />
          )}

          <Panel title="Recent attempts" icon={History}>
            <ul className="divide-y divide-navy/8">
              {attempts.map((row) => (
                <li key={row.attempt.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <Led tone={row.attempt.passed ? "green" : "amber"} />
                  <span className={`numeric w-12 text-[13px] font-semibold ${row.attempt.passed ? "text-source" : "text-amber-800"}`}>{row.attempt.score}%</span>
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-navy">{row.studentName}</p>
                  <span className="text-[12px] text-stone-600">{formatDateTime(row.attempt.submittedAt)}</span>
                </li>
              ))}
              {attempts.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No attempts yet.</li> : null}
            </ul>
          </Panel>
        </div>

        <Panel
          title={`Add question ${questions.length + 1}`}
          icon={ListPlus}
          riveted
          description={assessment.kind === "level" ? "Aim for 20 questions across the level." : "Aim for 5 questions per session."}
          bodyClassName="px-5 pb-6 pt-4"
        >
          <QuestionForm assessmentId={assessment.id} nextIndex={questions.length + 1} />
        </Panel>
      </div>
    </div>
  );
}
