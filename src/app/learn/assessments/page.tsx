import Link from "next/link";
import { ArrowRight, Award, CheckCircle2, ClipboardCheck, Lock, RotateCcw, Target } from "lucide-react";
import { getAssessmentsForStudent } from "@/db/assessments";
import { getStudentAcademy } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Assessments</h1>
          <p className="text-[12.5px] text-stone-600">
            Five questions after every session, twenty after every level. Graded the moment you submit, with your
            percentage recorded against your learning profile.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Average", value: average === null ? "—" : `${average}%` },
            { label: "Passed", value: `${passed}/${cards.length}` },
            { label: "Best", value: scores.length ? `${Math.max(...scores)}%` : "—" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-navy/10 bg-paper px-3 py-2 text-center">
              <p className="font-serif text-lg text-navy">{stat.value}</p>
              <p className="text-[9.5px] uppercase tracking-[0.08em] text-stone-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-gold-dark" />
          <h2 className="font-serif text-lg text-navy">Session assessments</h2>
          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-stone-600">{sessionQuizzes.length}</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {sessionQuizzes.map((quiz) => {
            const locked = quiz.attemptsUsed >= quiz.maxAttempts && !quiz.passed;
            return (
              <div key={quiz.id} className="admin-card flex flex-col p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-dark">
                      {quiz.courseTitle ?? "Course"}{quiz.moduleTitle ? ` · ${quiz.moduleTitle}` : ""}
                    </p>
                    <p className="mt-0.5 font-serif text-[15px] leading-snug text-navy">{quiz.title}</p>
                    <p className="text-[11px] text-stone-500">
                      {quiz.questionCount} questions · {quiz.timeLimitMinutes} min · pass {quiz.passMark}%
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]",
                      quiz.passed ? "bg-source/10 text-source" : quiz.bestScore !== null ? "bg-amber-100 text-amber-800" : "bg-cream text-stone-600",
                    )}
                  >
                    {quiz.passed ? "passed" : quiz.bestScore !== null ? "retake" : "not started"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                    <span
                      className={cn("block h-full rounded-full", quiz.passed ? "bg-source" : "bg-gold")}
                      style={{ width: `${quiz.bestScore ?? 0}%` }}
                    />
                  </span>
                  <span className="text-[11px] font-semibold text-navy">{quiz.bestScore ?? 0}%</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-stone-400">
                    {quiz.attemptsUsed}/{quiz.maxAttempts} attempts used
                  </p>
                  {locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-navy/12 px-3 py-1.5 text-[10.5px] text-stone-500">
                      <Lock className="h-3 w-3" /> Mentor review needed
                    </span>
                  ) : (
                    <Link
                      href={`/learn/assessments/${quiz.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy px-3.5 text-[11px] font-semibold text-paper hover:bg-navy-700"
                    >
                      {quiz.passed ? <RotateCcw className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                      {quiz.passed ? "Retake" : quiz.attemptsUsed > 0 ? "Try again" : "Start"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {sessionQuizzes.length === 0 ? (
            <p className="admin-card p-5 text-[12.5px] text-stone-600">No session assessments published yet.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gold-dark" />
          <h2 className="font-serif text-lg text-navy">Level examinations</h2>
          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-stone-600">{levelExams.length}</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {levelExams.map((exam) => {
            const progress = levelProgress(exam.levelId);
            const unlocked = !progress || progress.percent === 100;
            return (
              <div key={exam.id} className="admin-card flex flex-col p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-dark">{exam.levelName} level</p>
                  <span className="rounded-full bg-navy px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-paper">
                    20 questions
                  </span>
                </div>
                <p className="mt-1.5 font-serif text-[16px] leading-snug text-navy">{exam.title}</p>
                <p className="text-[11px] text-stone-500">
                  Pass mark {exam.passMark}% · {exam.maxAttempts} attempts
                </p>
                {progress ? (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-stone-500">
                      <span>Level readiness</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-cream">
                      <span className="block h-full rounded-full bg-navy" style={{ width: `${progress.percent}%` }} />
                    </span>
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-navy/8 pt-2.5">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-stone-500">
                    {exam.passed ? <><CheckCircle2 className="h-3 w-3 text-source" /> passed</> : `${exam.bestScore ?? 0}% best`}
                  </span>
                  {unlocked ? (
                    <Link
                      href={`/learn/assessments/${exam.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gold px-3.5 text-[11px] font-semibold text-ink hover:bg-gold-dark hover:text-paper"
                    >
                      <Award className="h-3 w-3" /> {exam.passed ? "Retake exam" : "Sit the exam"}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-navy/12 px-3 py-1.5 text-[10.5px] text-stone-500">
                      <Lock className="h-3 w-3" /> Complete the level first
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {levelExams.length === 0 ? (
            <p className="admin-card p-5 text-[12.5px] text-stone-600">Level exams are published at the end of each level.</p>
          ) : null}
        </div>
      </section>

      <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-[11.5px] leading-relaxed text-stone-700">
        <p className="font-semibold text-gold-dark">How scoring works</p>
        <p className="mt-1">
          Each answer is graded instantly. Your percentage is stored with the attempt, shared with your mentor, and a
          failing score triggers a follow-up notification so no one drifts quietly. Level exams use the level pass mark
          (80% by default, set per level by the faculty).
        </p>
      </div>
    </div>
  );
}
