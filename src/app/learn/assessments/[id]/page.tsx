import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Clock, History, Info, Lock, Target } from "lucide-react";
import { QuizRunner } from "@/components/academy/quiz-runner";
import { getAssessmentForTaking } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { BackLink, BrassDial, Chip, EmptyDesk, LeatherChip, LearnHero, Panel, btn } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function TakeAssessmentPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const record = await getAssessmentForTaking(Number(id), user.profileId);
  if (!record) notFound();

  const { assessment, questionCount, attempts, levelName, courseTitle, moduleTitle } = record;
  const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null;
  const passed = attempts.some((attempt) => attempt.passed);
  const attemptsLeft = Math.max(0, assessment.maxAttempts - record.attemptsUsed);
  const blocked = attemptsLeft === 0 && !record.canResume;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/learn/assessments">All assessments</BackLink>

      <LearnHero
        size="md"
        eyebrow={assessment.kind === "level" ? `${levelName} level examination` : "Session assessment"}
        title={assessment.title}
        description={
          <>
            <p>
              {courseTitle ?? moduleTitle ?? "Purpose Course"} · {questionCount} questions · pass mark {assessment.passMark}%
            </p>
            {assessment.description ? <p className="mt-2 text-paper/75">{assessment.description}</p> : null}
          </>
        }
        meta={
          <>
            <LeatherChip icon={Clock}>{assessment.timeLimitMinutes} minutes</LeatherChip>
            <LeatherChip icon={Target}>Pass mark {assessment.passMark}%</LeatherChip>
            <LeatherChip icon={Info}>
              {attemptsLeft} of {assessment.maxAttempts} attempts left
            </LeatherChip>
          </>
        }
        aside={
          bestScore === null ? (
            <div className="lk-chip-leather flex-col gap-1 rounded-2xl px-5 py-4 text-center">
              <span className="font-serif text-[2rem] leading-none text-[#f3dc8e]">—</span>
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-paper/65">Best score</span>
            </div>
          ) : (
            <BrassDial value={bestScore} label="Best score" caption="Best score" size={132} />
          )
        }
      />

      {blocked ? (
        <EmptyDesk
          icon={Lock}
          title="Attempts used — mentor review next"
          description={`You have used all ${assessment.maxAttempts} attempts. Review your history below and contact your mentor if you need support.`}
          action={
            <Link href="/learn/mentor" className={btn.navy}>
              Message my mentor
            </Link>
          }
        />
      ) : (
        <QuizRunner
          assessmentId={assessment.id}
          title={assessment.title}
          passMark={assessment.passMark}
          questionCount={questionCount}
          timeLimitMinutes={assessment.timeLimitMinutes}
          attemptsUsed={record.attemptsUsed}
          canResume={record.canResume}
          maxAttempts={assessment.maxAttempts}
        />
      )}

      {attempts.length > 0 ? (
        <Panel title="Your attempt history" icon={History} bodyClassName="px-3 pb-3 pt-2 sm:px-4">
          <ul className="lk-ledger">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                <Chip tone={attempt.passed ? "green" : "amber"}>
                  {attempt.score}% · {attempt.passed ? "passed" : "below pass mark"}
                </Chip>
                <p className="text-[13px] text-stone-600">
                  {attempt.correctCount}/{attempt.totalCount} correct · {formatDateTime(attempt.submittedAt)}
                </p>
                <Link href={`/learn/assessments/${assessment.id}/review?attempt=${attempt.id}`} className="lk-link ml-auto">
                  Review<span className="sr-only"> attempt from {formatDateTime(attempt.submittedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {passed ? (
        <div className="lk-paper flex flex-wrap items-center gap-4 border-[rgba(47,107,64,0.3)] p-5">
          <span className="lk-coin lk-coin-green h-11 w-11">
            <Award aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[1.1rem] text-navy">Assessment passed</p>
            <p className="text-[14px] leading-relaxed text-stone-600">Your certificate is issued automatically when verified completion is reached.</p>
          </div>
          <Link href="/learn/certificates" className={btn.paper}>
            View certificates
          </Link>
        </div>
      ) : null}
    </div>
  );
}
