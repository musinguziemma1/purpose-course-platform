import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { AnswerReview } from "@/components/academy/quiz-runner";
import { getAttemptReview } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ attempt?: string }> };

export default async function AttemptReviewPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { attempt } = await searchParams;
  const user = await getSessionUser();
  if (!user) return null;
  const record = attempt ? await getAttemptReview(Number(attempt), user.profileId) : null;
  if (!record) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={`/learn/assessments/${id}`} className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the assessment
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-navy">{record.assessmentTitle}</h1>
        <p className="text-[12px] text-stone-600">
          {formatDateTime(record.attempt.submittedAt)} · {record.attempt.correctCount}/{record.attempt.totalCount} correct
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="admin-card p-4 text-center">
          <p className="font-serif text-3xl text-navy">{record.attempt.score}%</p>
          <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">score</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className={`font-serif text-3xl ${record.attempt.passed ? "text-source" : "text-amber-700"}`}>
            {record.attempt.passed ? "PASS" : "BELOW"}
          </p>
          <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">pass mark {record.passMark}%</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="inline-flex items-center gap-1 font-serif text-3xl text-navy">
            {record.attempt.passed ? <CheckCircle2 className="h-6 w-6 text-source" /> : <XCircle className="h-6 w-6 text-rose-600" />}
          </p>
          <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">auto-graded</p>
        </div>
      </div>

      <AnswerReview
        answers={record.answers.map((answer) => ({
          questionId: answer.questionId,
          prompt: answer.prompt,
          options: answer.options,
          correctIndex: answer.correctIndex,
          explanation: answer.explanation,
          selectedIndex: answer.selectedIndex,
          isCorrect: answer.isCorrect,
        }))}
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/learn/assessments/${record.attempt.assessmentId}`}
          className="inline-flex h-9 items-center rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
        >
          {record.attempt.passed ? "Retake to improve" : "Try again"}
        </Link>
        {record.courseSlug ? (
          <Link
            href={`/learn/courses/${record.courseSlug}`}
            className="inline-flex h-9 items-center rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
          >
            Revisit the lessons
          </Link>
        ) : null}
      </div>
    </div>
  );
}
