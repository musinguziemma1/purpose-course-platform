import Link from "next/link";
import { renderRichText } from "@/lib/markdown";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, FileAudio, FileText, ImageIcon, Layers, Lock, PlayCircle, Sparkles } from "lucide-react";
import { getStudentAcademy } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const KIND_LABEL: Record<string, { label: string; icon: typeof PlayCircle }> = {
  video: { label: "Video", icon: PlayCircle },
  audio: { label: "Audio", icon: FileAudio },
  reading: { label: "Reading", icon: FileText },
  illustration: { label: "Illustration", icon: ImageIcon },
  download: { label: "Download", icon: FileText },
  practice: { label: "Practice", icon: Sparkles },
  live: { label: "Live", icon: PlayCircle },
};

export default async function CourseOverviewPage({ params }: Params) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const academy = await getStudentAcademy(user.profileId);
  const course = academy.courses.find((item) => item.slug === slug);
  if (!course) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/learn/courses" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> All courses
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
              {course.levelName} level · {course.isSequential ? "Progression mode" : "Open access"}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-navy">{course.title}</h1>
            {course.subtitle ? <p className="text-[13px] text-stone-600">{course.subtitle}</p> : null}
          </div>
          <div className="rounded-xl border border-navy/10 bg-paper px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Course progress</p>
            <p className="mt-0.5 font-serif text-2xl text-navy">{course.percent}%</p>
            <p className="text-[10.5px] text-stone-500">
              {course.completed} of {course.total} lessons
            </p>
          </div>
        </div>
        <div className="mt-3 max-w-3xl">{renderRichText(course.description ?? course.summary)}</div>
      </div>

      {course.coverImageUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-navy/10">
          <img
            src={course.coverImageUrl}
            alt={`${course.title} course cover`}
            className="h-40 w-full object-cover sm:h-52"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
              {course.levelName} level · {course.modules.length} modules
            </p>
            <p className="text-[11px] text-paper/75">
              {course.completed} of {course.total} lessons complete
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {course.modules.map((module, moduleIndex) => {
          const moduleLessons = course.progression.filter((lesson) => lesson.moduleId === module.id);
          const moduleDone = moduleLessons.filter((lesson) => lesson.completion === "completed").length;
          const moduleUnlocked = moduleLessons.some((lesson) => lesson.unlocked);
          return (
            <div key={module.id} className="admin-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-cream/40 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-serif text-[13px] text-paper">
                    {moduleIndex + 1}
                  </span>
                  <div>
                    <p className="font-serif text-[16px] text-navy">
                      {module.title}
                      {module.isPreview ? (
                        <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-gold-dark">
                          preview
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {module.sessionCode ? `${module.sessionCode} · ` : ""}
                      {moduleDone}/{moduleLessons.length} lessons · {module.estimatedMinutes} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
                  {moduleUnlocked ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> in progression
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-stone-400">
                      <Lock className="h-3 w-3" /> locked
                    </span>
                  )}
                </div>
              </div>
              {module.summary ? (
                <p className="border-b border-navy/8 px-5 py-2.5 text-[12px] leading-relaxed text-stone-600">{module.summary}</p>
              ) : null}
              <ul className="divide-y divide-navy/8">
                {moduleLessons.map((lesson) => {
                  const meta = KIND_LABEL[lesson.kind] ?? KIND_LABEL.reading;
                  const Icon = meta.icon;
                  const completed = lesson.completion === "completed";
                  const body = (
                    <>
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                          completed
                            ? "border-source/30 bg-source/10 text-source"
                            : lesson.unlocked
                              ? "border-navy/15 bg-paper text-navy"
                              : "border-stone-200 bg-stone-50 text-stone-300",
                        )}
                      >
                        {completed ? <CheckCircle2 className="h-4 w-4" /> : lesson.unlocked ? <Icon className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn("text-[12.5px] font-medium", lesson.unlocked ? "text-navy" : "text-stone-400")}>
                            {lesson.position}. {lesson.title}
                          </span>
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                            {meta.label}
                          </span>
                          {lesson.isNext ? (
                            <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink">
                              next
                            </span>
                          ) : null}
                        </span>
                        {lesson.summary ? (
                          <span className="mt-0.5 block line-clamp-1 text-[11.5px] text-stone-500">{lesson.summary}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-stone-400">{lesson.durationMinutes} min</span>
                    </>
                  );
                  return (
                    <li key={lesson.id}>
                      {lesson.unlocked ? (
                        <Link
                          href={`/learn/courses/${course.slug}/${lesson.id}`}
                          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-cream/40"
                        >
                          {body}
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-stone-300" />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-3 opacity-80">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-[11.5px] leading-relaxed text-stone-700">
        <p className="inline-flex items-center gap-1.5 font-semibold text-gold-dark">
          <Layers className="h-3.5 w-3.5" /> How progression works
        </p>
        <p className="mt-1">
          Lessons unlock in sequence. Mark a lesson complete and the next one opens, together with its video, audio,
          illustration and downloadable worksheet. Preview lessons stay open to everyone.
        </p>
      </div>
    </div>
  );
}
