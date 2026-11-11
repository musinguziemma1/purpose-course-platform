import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { getAssessmentForAdmin } from "@/db/assessments";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { QuestionForm } from "@/components/academy/assessment-forms";
import { deleteQuestion } from "@/app/actions/assessments";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminAssessmentEditorPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManagePeople(user)) redirect("/admin/academy");

  const record = await getAssessmentForAdmin(Number(id));
  if (!record) notFound();

  const { assessment, questions, attempts } = record;
  const average = attempts.length ? Math.round(attempts.reduce((sum, row) => sum + row.attempt.score, 0) / attempts.length) : null;
  const passRate = attempts.length ? Math.round((attempts.filter((row) => row.attempt.passed).length / attempts.length) * 100) : null;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/academy/assessments" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> Assessments
        </Link>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
          {assessment.kind === "level" ? "Level exam" : "Session quiz"} · {record.levelName ?? "—"}
          {record.courseTitle ? ` · ${record.courseTitle}` : ""}
        </p>
        <h1 className="font-serif text-2xl text-navy">{assessment.title}</h1>
        <p className="text-[12.5px] text-stone-600">
          {questions.length} questions · pass mark {assessment.passMark}% · {assessment.timeLimitMinutes} min ·{" "}
          {assessment.maxAttempts} attempts allowed
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Questions", value: questions.length },
          { label: "Attempts", value: attempts.length },
          { label: "Average", value: average === null ? "—" : `${average}%` },
          { label: "Pass rate", value: passRate === null ? "—" : `${passRate}%` },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <p className="font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={question.id} className="admin-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12.5px] font-medium text-navy">
                  {index + 1}. {question.prompt}
                </p>
                <form action={deleteQuestion}>
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <button type="submit" aria-label="Delete question" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </form>
              </div>
              <ul className="mt-2 space-y-1">
                {question.options.map((option, optionIndex) => (
                  <li
                    key={optionIndex}
                    className={`rounded px-2 py-1 text-[11.5px] ${optionIndex === question.correctIndex ? "bg-source/10 font-medium text-source" : "text-stone-600"}`}
                  >
                    {String.fromCharCode(65 + optionIndex)}. {option}
                    {optionIndex === question.correctIndex ? (
                      <span className="ml-1 inline-flex items-center gap-0.5">
                        <Check className="h-3 w-3" /> correct
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {question.explanation ? (
                <p className="mt-1.5 rounded-md bg-cream/70 px-2.5 py-1.5 text-[11px] leading-relaxed text-stone-600">
                  Explanation: {question.explanation}
                </p>
              ) : null}
            </div>
          ))}
          {questions.length === 0 ? (
            <p className="admin-card p-5 text-[12px] text-stone-600">
              No questions yet. Add 5 for a session quiz or 20 for a level exam — grading is automatic.
            </p>
          ) : null}

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Recent attempts</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {attempts.map((row) => (
                <li key={row.attempt.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${row.attempt.passed ? "bg-source/10 text-source" : "bg-amber-100 text-amber-900"}`}>
                    {row.attempt.score}%
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[12px] text-navy">{row.studentName}</p>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{formatDateTime(row.attempt.submittedAt)}</span>
                </li>
              ))}
              {attempts.length === 0 ? <li className="px-5 py-4 text-[12px] text-stone-500">No attempts yet.</li> : null}
            </ul>
          </div>
        </div>

        <div className="admin-card p-5 xl:sticky xl:top-6">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
            Add question {questions.length + 1}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {assessment.kind === "level" ? "Aim for 20 questions across the level." : "Aim for 5 questions per session."}
          </p>
          <div className="mt-3">
            <QuestionForm assessmentId={assessment.id} nextIndex={questions.length + 1} />
          </div>
        </div>
      </div>
    </div>
  );
}
