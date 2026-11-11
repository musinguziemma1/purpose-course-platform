import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Filter, Layers, Lock, PlayCircle, Sparkles } from "lucide-react";
import { getStudentAcademy } from "@/db/courses";
import { EmptyState } from "@/components/ui/card";
import { db } from "@/db";
import { courseLevels } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Academy courses" };

export default async function StudentCoursesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [academy, levels] = await Promise.all([
    getStudentAcademy(user.profileId),
    db.select().from(courseLevels).orderBy(courseLevels.sortOrder),
  ]);

  const levelId = academy.enrollment?.levelId ?? levels[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-navy/10">
        <img
          src="/images/student-study.jpg"
          alt="A study desk with notes, a laptop and a cup of tea"
          className="h-32 w-full object-cover sm:h-40"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/45 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Purpose Course Academy</p>
          <p className="mt-1 font-serif text-xl text-paper sm:text-2xl">Structured lessons, in progression</p>
          <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-paper/70">
            Video teaching, audio, illustrations and downloadable practice — unlock each lesson as you complete the last.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Academy courses</h1>
          <p className="text-[12.5px] text-stone-600">
            Structured lessons in progression: video teaching, audio, illustrations, downloadable material and practice.
            Complete each lesson to unlock the next.
          </p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-paper px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Curriculum progress</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-cream">
              <span
                className="block h-full rounded-full bg-gold"
                style={{ width: `${academy.totalLessons ? Math.round((academy.completedLessons / academy.totalLessons) * 100) : 0}%` }}
              />
            </span>
            <span className="text-[11px] font-semibold text-navy">
              {academy.completedLessons}/{academy.totalLessons}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-navy/10 bg-paper px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-stone-500">
          <Filter className="h-3 w-3" /> Enrolment level
        </span>
        {levels.map((level) => (
          <span
            key={level.id}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              level.id === levelId ? "bg-navy text-paper" : "bg-cream text-stone-600",
            )}
          >
            {level.name}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-stone-500">
          {academy.inProgressCount} lesson{academy.inProgressCount === 1 ? "" : "s"} in progress
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {academy.courses.map((course) => {
          const next = course.nextLesson;
          const locked = course.total > 0 && course.completed === 0 && !course.modules.some((module) => module.lessons.some((lesson) => lesson.isPreview));
          return (
            <div key={course.id} className="interactive flex flex-col overflow-hidden rounded-xl border border-navy/10 bg-paper shadow-xs">
              {course.coverImageUrl ? (
                <div className="relative h-36 w-full overflow-hidden bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={course.coverImageUrl} alt={course.title} className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-paper/95 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-navy">
                    {course.levelName} · Level {course.levelNumber}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">{course.levelName} level</p>
                    <h2 className="mt-1 font-serif text-xl leading-snug text-navy">{course.title}</h2>
                    {course.subtitle ? <p className="text-[11.5px] text-stone-500">{course.subtitle}</p> : null}
                  </div>
                  <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                    {course.modules.length} modules
                  </span>
                </div>
                <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-stone-600">{course.summary}</p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${course.percent}%` }} />
                  </span>
                  <span className="text-[10.5px] font-semibold text-navy">
                    {course.completed}/{course.total}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {course.completed} done
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ~{course.estimatedHours}h
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {course.total} lessons
                  </span>
                  {course.isSequential ? <span className="rounded-full bg-cream px-2 py-0.5">progression mode</span> : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/8 pt-3">
                  <Link
                    href={`/learn/courses/${course.slug}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
                  >
                    Open course <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  {next ? (
                    <Link
                      href={`/learn/courses/${course.slug}/${next.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
                    >
                      <PlayCircle className="h-3.5 w-3.5 text-gold-dark" />
                      {course.completed === 0 ? "Start" : "Continue"}: {next.title.slice(0, 28)}
                      {next.title.length > 28 ? "…" : ""}
                    </Link>
                  ) : locked ? (
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/12 px-4 text-[11.5px] text-stone-500">
                      <Lock className="h-3.5 w-3.5" /> Enrolment pending
                    </span>
                  ) : (
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-source/10 px-4 text-[11.5px] font-medium text-source">
                      <Sparkles className="h-3.5 w-3.5" /> Course complete
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {academy.courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="The curriculum is being prepared."
          description="Your faculty is publishing the first course. Check back shortly."
          action={<Link href="/course" className="chip chip-gold">See the programme →</Link>}
        />
      ) : null}
    </div>
  );
}
