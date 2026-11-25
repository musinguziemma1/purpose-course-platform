import Link from "next/link";
import { ArrowRight, Award, CheckCircle2, ClipboardCheck, Info, Lock, RotateCcw, Target } from "lucide-react";
import { getAssessmentsForStudent } from "@/db/assessments";
import { getStudentAcademy } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Chip, DeskHeading, Groove, LeatherFigures, LearnHero, Stamp, btn } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessments" };

export default async function StudentAssessmentsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [cards, academy] = await Promise.all([getAssessmentsForStudent(user.profileId), getStudentAcademy(user.profileId)]);

  const sessionQuizzes = cards.filter((card) => card.kind === "session");
  const levelExams = cards.filter((card) => card.kind === "level");
  const passed = cards.filter((card) => card.passed).length;
  const scores = cards.filter((card) => card.bestScore !== null).map((card) => card.bestScore as number);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  function levelProgress(levelId: number | null) {
    if (!levelId) return null;
    const coursesInLevel = academy.courses.filter((course) => course.levelId === levelId);
    if (coursesInLevel.length === 0) return null;
    const total = coursesInLevel.reduce((sum, course) => sum + course.total, 0);
    const completed = coursesInLevel.reduce((sum, course) => sum + course.completed, 0);
    return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
  }

  return (
    <div className="space-y-8">
      <LearnHero
        eyebrow="Timed and auto-graded"
        title="Assessments"
        description="Complete the relevant lessons before starting a timed assessment. Your results are graded and recorded when you submit."
        aside={
          <LeatherFigures
            items={[
              { label: "Average", value: average === null ? "—" : `${average}%` },
              { label: "Passed", value: `${passed}/${cards.length}` },
              { label: "Best", value: scores.length ? `${Math.max(...scores)}%` : "—" },
            ]}
          />
        }
      />

      <section aria-labelledby="session-assessments" className="space-y-4">
        <DeskHeading id="session-assessments" icon={ClipboardCheck} count={sessionQuizzes.length}>
          Session assessments
        </DeskHeading>
        <div className="grid gap-5 lg:grid-cols-2">
          {sessionQuizzes.map((quiz, index) => {
            const locked = quiz.attemptsUsed >= quiz.maxAttempts && !quiz.hasActiveSession;
            return (
              <article key={quiz.id} className="lk-paper relative flex flex-col overflow-hidden p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="lk-kicker">
                      {quiz.courseTitle ?? "Course"}
                      {quiz.moduleTitle ? ` · ${quiz.moduleTitle}` : ""}
                    </p>
                    <h3 className="mt-1 font-serif text-[1.15rem] leading-snug text-navy">{quiz.title}</h3>
                    <p className="mt-0.5 text-[13px] text-stone-600">
                      {quiz.questionCount} questions · {quiz.timeLimitMinutes} min · pass {quiz.passMark}%
                    </p>
                  </div>
                  {quiz.passed ? (
                    <Stamp>Passed</Stamp>
                  ) : (
                    <Chip tone={quiz.bestScore !== null ? "amber" : "plain"}>{quiz.bestScore !== null ? "retake" : "not started"}</Chip>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Groove
                    value={quiz.bestScore ?? 0}
                    label={`${quiz.title} best score`}
                    color={quiz.passed ? "#2f6b40" : undefined}
                    index={Math.min(index, 6)}
                    className="flex-1"
                  />
                  <span className="text-[13px] font-semibold tabular-nums text-navy">{quiz.bestScore ?? 0}%</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[rgba(18,42,77,0.16)] pt-3">
                  <p className="text-[12px] uppercase tracking-[0.08em] text-stone-600">
                    {quiz.attemptsUsed}/{quiz.maxAttempts} attempts used
                  </p>
                  {locked ? (
                    <span className="lk-well inline-flex min-h-9 items-center gap-1.5 px-3 text-[13px] text-stone-600">
                      <Lock aria-hidden className="h-3.5 w-3.5" /> Mentor review needed
                    </span>
                  ) : (
                    <Link href={`/learn/assessments/${quiz.id}`} className={cn(btn.navy, btn.sm)}>
                      {quiz.passed ? <RotateCcw aria-hidden className="h-3.5 w-3.5" /> : <ArrowRight aria-hidden className="h-3.5 w-3.5" />}
                      {quiz.passed ? "Retake" : quiz.attemptsUsed > 0 ? "Try again" : "Start"}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
          {sessionQuizzes.length === 0 ? <p className="lk-well p-5 text-[14px] text-stone-600">No session assessments published yet.</p> : null}
        </div>
      </section>

      <section aria-labelledby="level-exams" className="space-y-4">
        <DeskHeading id="level-exams" icon={Target} count={levelExams.length}>
          Level examinations
        </DeskHeading>
        <div className="grid gap-5 lg:grid-cols-3">
          {levelExams.map((exam) => {
            const progress = levelProgress(exam.levelId);
            const unlocked =
              Boolean(progress && progress.percent === 100) &&
              sessionQuizzes.filter((quiz) => quiz.levelId === exam.levelId).every((quiz) => quiz.passed) &&
              (exam.attemptsUsed < exam.maxAttempts || exam.hasActiveSession);
            return (
              <article key={exam.id} className="lk-paper lk-stack flex flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="lk-kicker">{exam.levelName} level</p>
                  <Chip tone="navy">{exam.questionCount} questions</Chip>
                </div>
                <h3 className="mt-2 font-serif text-[1.15rem] leading-snug text-navy">{exam.title}</h3>
                <p className="text-[13px] text-stone-600">
                  Pass mark {exam.passMark}% · {exam.maxAttempts} attempts
                </p>
                {progress ? (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                      <span>Level readiness</span>
                      <span className="tabular-nums">{progress.percent}%</span>
                    </div>
                    <Groove value={progress.percent} label={`${exam.levelName} level readiness`} color="#1b3a63" />
                  </div>
                ) : null}
                <div className="mt-auto pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[rgba(18,42,77,0.16)] pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-stone-600">
                    {exam.passed ? (
                      <>
                        <CheckCircle2 aria-hidden className="h-4 w-4 text-source" /> Passed
                      </>
                    ) : (
                      `${exam.bestScore ?? 0}% best`
                    )}
                  </span>
                  {unlocked ? (
                    <Link href={`/learn/assessments/${exam.id}`} className={cn(btn.brass, btn.sm)}>
                      <Award aria-hidden className="h-4 w-4" /> {exam.passed ? "Retake exam" : "Sit the exam"}
                    </Link>
                  ) : (
                    <span className="lk-well inline-flex min-h-9 items-center gap-1.5 px-3 text-[13px] text-stone-600">
                      <Lock aria-hidden className="h-3.5 w-3.5" /> Complete the level first
                    </span>
                  )}
                </div>
                </div>
              </article>
            );
          })}
          {levelExams.length === 0 ? <p className="lk-well p-5 text-[14px] text-stone-600">Level exams are published at the end of each level.</p> : null}
        </div>
      </section>

      <div className="lk-note max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6b4a05]">
          <Info aria-hidden className="h-4 w-4" /> How scoring works
        </p>
        <p className="mt-2 text-[14px] leading-relaxed">
          Each answer is graded instantly. Your percentage is stored with the attempt, shared with your mentor, and a failing score triggers a follow-up notification so no one
          drifts quietly. Level exams use the level pass mark (80% by default, set per level by the faculty).
        </p>
      </div>
    </div>
  );
}
