"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Award, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Send, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = { id: number; prompt: string; options: string[] };

type Result = {
  score: number;
  passed: boolean;
  passMark: number;
  correctCount: number;
  totalCount: number;
  attemptId: number;
  certificateCode: string | null;
};

export function QuizRunner({
  assessmentId,
  title,
  passMark,
  questionCount,
  timeLimitMinutes,
  attemptsUsed: initialAttemptsUsed,
  canResume,
  maxAttempts,
}: {
  assessmentId: number;
  title: string;
  passMark: number;
  questionCount: number;
  timeLimitMinutes: number;
  attemptsUsed: number;
  maxAttempts: number;
  canResume: boolean;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [attemptsUsed, setAttemptsUsed] = useState(initialAttemptsUsed);
  const [expiresAt, setExpiresAt] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [effectivePassMark, setEffectivePassMark] = useState(passMark);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const current = questions[index];
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);

  useEffect(() => {
    if (!sessionId || result) return;
    const timer = setInterval(() => setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - Date.now() - serverOffset) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [sessionId, result, expiresAt, serverOffset]);

  async function start() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/start`, { method: "POST" });
      const data = await response.json() as { error?: string; sessionId: string; questions: Question[]; expiresAt: string; serverTime: string; attemptsUsed: number; passMark: number };
      if (!response.ok) { setError(data.error ?? "Could not start the assessment."); return; }
      setQuestions(data.questions); setSessionId(data.sessionId); setAttemptsUsed(data.attemptsUsed);
      setEffectivePassMark(data.passMark);
      setExpiresAt(Date.parse(data.expiresAt)); setServerOffset(Date.parse(data.serverTime) - Date.now());
      setRemainingSeconds(Math.max(0, Math.ceil((Date.parse(data.expiresAt) - Date.parse(data.serverTime)) / 1000)));
    } catch { setError("Could not reach the server. Try again."); }
    finally { setPending(false); }
  }

  async function submit() {
    if (answeredCount < questions.length) {
      setError(`Answer all ${questions.length} questions before submitting (${answeredCount} done).`);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          selections: Object.entries(answers).map(([questionId, selectedIndex]) => ({
            questionId: Number(questionId),
            selectedIndex,
          })),
        }),
      });
      const data = (await response.json()) as Result & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not submit the assessment.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-6 text-center sm:p-8",
            result.passed ? "border-source/30 bg-source/5" : "border-amber-200 bg-amber-50",
          )}
        >
          <span
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
              result.passed ? "bg-source text-paper" : "bg-amber-500 text-white",
            )}
          >
            {result.passed ? <Award className="h-7 w-7" /> : <RotateCcw className="h-7 w-7" />}
          </span>
          <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stone-500">Result · auto-graded</p>
          <p className="mt-1 font-serif text-5xl text-navy">{result.score}%</p>
          <p className="mt-1 text-[13px] text-stone-700">
            {result.correctCount} of {result.totalCount} correct · pass mark {result.passMark}%
          </p>
          <p className={cn("mt-3 inline-flex rounded-full px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em]", result.passed ? "bg-source/15 text-source" : "bg-amber-200/70 text-amber-900")}>
            {result.passed ? "Passed — well done" : `Not yet — ${result.passMark - result.score} points short`}
          </p>
          <p className="mx-auto mt-3 max-w-lg text-[12px] leading-relaxed text-stone-600">
            {result.passed
              ? "Your percentage has been recorded against your learning profile and shared with your mentor."
              : "Your mentor has been notified and will follow up. Review the weak areas, revisit the lessons, then retake the assessment."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href={`/learn/assessments/${assessmentId}/review?attempt=${result.attemptId}`}
              className="inline-flex h-9 items-center rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
            >
              Review answers
            </Link>
            {result.passed ? <Link href="/learn/courses" className="inline-flex h-9 items-center rounded-full bg-source px-4 text-[11.5px] font-semibold text-paper">Continue learning →</Link> : null}
            {result.passed ? (
              <Link
                href="/learn/certificates"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
              >
                <Award className="h-3.5 w-3.5" /> View certificates
              </Link>
            ) : attemptsLeft > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSessionId("");
                  setQuestions([]);
                  setAnswers({});
                  setIndex(0);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retake now
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-center text-[11px] text-stone-500">
          {result.certificateCode
            ? `Certificate ${result.certificateCode} issued automatically for verified completion.`
            : `Attempts used: ${attemptsUsed} of ${maxAttempts}.`}
        </p>
      </motion.div>
    );
  }

  if (!sessionId) {
    return <div className="admin-card space-y-3 p-6">
      <p className="text-[13px] text-stone-700">Complete the relevant lessons before starting. You have {timeLimitMinutes} minutes to answer {questionCount} questions. Starting or resuming uses the server timer; leaving the page does not pause it. Expired sessions count as attempts.</p>
      <button type="button" onClick={start} disabled={pending || attemptsLeft === 0 && !canResume} className="rounded-full bg-navy px-5 py-2.5 text-[12px] font-semibold text-paper disabled:opacity-50">
        {pending ? "Starting…" : canResume ? "Resume assessment" : "Start assessment"}
      </button>
      {error ? <p role="alert" className="text-[12px] text-rose-700">{error}</p> : null}
    </div>;
  }

  if (!current) {
    return <p className="admin-card p-6 text-sm text-stone-600">This assessment has no questions yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="admin-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
              Question {index + 1} of {questions.length}
            </p>
            <p className="text-[11px] text-stone-500">
              {title} · pass mark {effectivePassMark}% · {attemptsLeft} further attempt{attemptsLeft === 1 ? "" : "s"}
            </p>
          </div>
          <span role="timer" aria-label="Time remaining" className="text-[12px] font-semibold text-navy">{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")} left</span>
          <span className="rounded-full bg-cream px-2.5 py-1 text-[10.5px] font-semibold text-stone-600">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="meter mt-3">
          <span style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>

        <p className="mt-4 font-serif text-xl leading-snug text-navy">{current.prompt}</p>
        <div className="mt-3 space-y-2">
          {current.options.map((option, optionIndex) => {
            const selected = answers[current.id] === optionIndex;
            return (
              <button
                key={optionIndex}
                type="button"
                onClick={() => setAnswers((previous) => ({ ...previous, [current.id]: optionIndex }))}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-[12.5px] transition-colors",
                  selected ? "border-gold bg-gold/10 text-navy" : "border-navy/12 bg-paper text-stone-700 hover:border-navy/30 hover:bg-cream/40",
                )}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold", selected ? "border-gold bg-gold text-ink" : "border-navy/20 text-stone-500")}>
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{error}</p> : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-navy/8 pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-navy/15 px-3 text-[11.5px] font-medium text-navy disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
              disabled={index === questions.length - 1}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-navy/15 px-3 text-[11.5px] font-medium text-navy disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending || remainingSeconds <= 0}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-5 text-[12px] font-semibold text-ink transition-colors hover:bg-gold-dark hover:text-paper disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {pending ? "Grading…" : "Submit for instant grading"}
          </button>
        </div>
        {remainingSeconds <= 0 ? <p role="alert" className="mt-3 text-[12px] text-rose-700">Time has expired. This attempt is used. Return to the assessment list to start another available attempt.</p> : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((question, questionIndex) => {
          const answered = answers[question.id] !== undefined;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => setIndex(questionIndex)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-[10.5px] font-semibold",
                questionIndex === index
                  ? "border-navy bg-navy text-paper"
                  : answered
                    ? "border-gold/50 bg-gold/15 text-gold-dark"
                    : "border-navy/15 bg-paper text-stone-400",
              )}
            >
              {questionIndex + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AnswerReview({
  answers,
}: {
  answers: { questionId: number; prompt: string; options: string[]; correctIndex: number; explanation: string | null; selectedIndex: number | null; isCorrect: boolean | null }[];
}) {
  return (
    <ol className="space-y-3">
      {answers.map((answer, index) => (
        <li key={answer.questionId} className="admin-card p-4">
          <div className="flex items-start gap-2">
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", answer.isCorrect ? "bg-source text-paper" : "bg-rose-600 text-white")}>
              {answer.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-navy">
                {index + 1}. {answer.prompt}
              </p>
              <ul className="mt-1.5 space-y-1">
                {answer.options.map((option, optionIndex) => (
                  <li
                    key={optionIndex}
                    className={cn(
                      "rounded px-2 py-1 text-[11.5px]",
                      optionIndex === answer.correctIndex
                        ? "bg-source/10 font-medium text-source"
                        : optionIndex === answer.selectedIndex
                          ? "bg-rose-50 text-rose-700"
                          : "text-stone-600",
                    )}
                  >
                    {String.fromCharCode(65 + optionIndex)}. {option}
                    {optionIndex === answer.correctIndex ? "  ✓ correct" : optionIndex === answer.selectedIndex ? "  ← your answer" : ""}
                  </li>
                ))}
              </ul>
              {answer.explanation ? (
                <p className="mt-1.5 rounded-md bg-cream/70 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-700">
                  {answer.explanation}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
