import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Clock, Info, Lock, ShieldCheck, Target } from "lucide-react";
import { QuizRunner } from "@/components/academy/quiz-runner";
import { getAssessmentForTaking } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function TakeAssessmentPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const record = await getAssessmentForTaking(Number(id), user.profileId);
  if (!record) notFound();

  const { assessment, questions, attempts, levelName, courseTitle, moduleTitle } = record;
  const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null;
  const passed = attempts.some((attempt) => attempt.passed);
  const attemptsLeft = Math.max(0, assessment.maxAttempts - attempts.length);
  const blocked = attemptsLeft === 0 && !passed;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/learn/assessments" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> All assessments
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
              {assessment.kind === "level" ? `${levelName} level examination` : "Session assessment"}
            </p>
            <h1 className="mt-1 font-serif text-2xl text-navy">{assessment.title}</h1>
            <p className="text-[12px] text-stone-600">
              {courseTitle ?? moduleTitle ?? "Purpose Course"} · {questions.length} questions · pass mark {assessment.passMark}%
            </p>
          </div>
          <div className="rounded-xl border border-navy/10 bg-paper px-4 py-2 text-center">
            <p className="font-serif text-xl text-navy">{bestScore === null ? "—" : `${bestScore}%`}</p>
            <p className="text-[9.5px] uppercase tracking-[0.08em] text-stone-500">best score</p>
          </div>
        </div>
        {assessment.description ? <p className="mt-3 text-[13px] leading-relaxed text-stone-600">{assessment.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
          <span className="inline-flex items-center gap-1 rounded-full border border-navy/12 bg-paper px-2.5 py-1">
            <Clock className="h-3 w-3" /> {assessment.timeLimitMinutes} minutes
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-navy/12 bg-paper px-2.5 py-1">
            <Target className="h-3 w-3" /> pass mark {assessment.passMark}%
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-navy/12 bg-paper px-2.5 py-1">
            <Info className="h-3 w-3" /> {attemptsLeft} of {assessment.maxAttempts} attempts left
          </span>
        </div>
      </div>

      {blocked ? (
        <div className="admin-card p-6 text-center">
          <Lock className="mx-auto h-7 w-7 text-stone-300" />
          <p className="mt-2 font-serif text-lg text-navy">Attempts used — mentor review next</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-stone-600">
            You have used all {assessment.maxAttempts} attempts without reaching {assessment.passMark}%. Your mentor has
            been notified and will walk through the gaps with you before the assessment reopens.
          </p>
          <Link href="/learn/mentor" className="mt-3 inline-flex text-[12px] font-semibold text-gold-dark hover:underline">
            Message my mentor →
          </Link>
        </div>
      ) : (
        <QuizRunner
          assessmentId={assessment.id}
          title={assessment.title}
          passMark={assessment.passMark}
          questions={questions.map((question) => ({ id: question.id, prompt: question.prompt, options: question.options }))}
          attemptsUsed={attempts.length}
          maxAttempts={assessment.maxAttempts}
        />
      )}

      {attempts.length > 0 ? (
        <div className="admin-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-navy/10 px-4 py-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-dark" />
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Your attempt history</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${attempt.passed ? "bg-source/10 text-source" : "bg-amber-100 text-amber-800"}`}>
                  {attempt.score}% · {attempt.passed ? "passed" : "below pass mark"}
                </span>
                <p className="text-[11px] text-stone-500">
                  {attempt.correctCount}/{attempt.totalCount} correct · {formatDateTime(attempt.submittedAt)}
                </p>
                <Link
                  href={`/learn/assessments/${assessment.id}/review?attempt=${attempt.id}`}
                  className="ml-auto text-[10.5px] font-semibold text-gold-dark hover:underline"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {passed ? (
        <div className="rounded-xl border border-source/30 bg-source/5 p-4 text-[11.5px] leading-relaxed text-stone-700">
          <p className="inline-flex items-center gap-1.5 font-semibold text-source">
            <Award className="h-3.5 w-3.5" /> Assessment passed
          </p>
          <p className="mt-1">
            Your certificate is issued automatically when verified completion is reached.{" "}
            <Link href="/learn/certificates" className="font-semibold text-navy underline decoration-gold underline-offset-2">
              View certificates →
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
