import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, RotateCcw } from "lucide-react";
import { AnswerReview } from "@/components/academy/quiz-runner";
import { getAttemptReview } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { BackLink, BrassDial, LeatherChip, LearnHero, Stamp, btn } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ attempt?: string }> };

export default async function AttemptReviewPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { attempt } = await searchParams;
  const user = await getSessionUser();
  if (!user) return null;
  const record = attempt ? await getAttemptReview(Number(attempt), user.profileId) : null;
  if (!record) notFound();

  const passed = record.attempt.passed;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/learn/assessments/${id}`}>Back to the assessment</BackLink>

      <LearnHero
        size="md"
        eyebrow="Attempt review · auto-graded"
        title={record.assessmentTitle}
        description={
          <>
            {formatDateTime(record.attempt.submittedAt)} · {record.attempt.correctCount}/{record.attempt.totalCount} correct
          </>
        }
        meta={<LeatherChip>Pass mark {record.passMark}%</LeatherChip>}
        aside={
          <div className="flex items-center gap-5">
            <BrassDial value={record.attempt.score} label="Score" caption="Score" size={136} />
            {/* The result is pressed onto a paper slip so the ink reads on the leather. */}
            <div className="lk-paper -rotate-2 px-5 py-6">
              <Stamp tone={passed ? "green" : "rose"} size="lg">
                {passed ? "Passed" : "Below pass mark"}
              </Stamp>
            </div>
          </div>
        }
      />

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

      <div className="flex flex-wrap gap-2.5">
        <Link href={`/learn/assessments/${record.attempt.assessmentId}`} className={btn.navy}>
          <RotateCcw aria-hidden className="h-4 w-4" /> {passed ? "Retake to improve" : "Try again"}
        </Link>
        {record.courseSlug ? (
          <Link href={`/learn/courses/${record.courseSlug}`} className={btn.paper}>
            <BookOpen aria-hidden className="h-4 w-4" /> Revisit the lessons
          </Link>
        ) : null}
      </div>
    </div>
  );
}
