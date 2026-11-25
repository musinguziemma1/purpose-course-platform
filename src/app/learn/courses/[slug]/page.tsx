import Link from "next/link";
import { CoverImage } from "@/components/site/cover-image";
import { editorialImage } from "@/lib/media";
import { renderRichText } from "@/lib/markdown";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, Clock, FileAudio, FileText, ImageIcon, Info, Lock, PlayCircle, Sparkles } from "lucide-react";
import { getStudentAcademy } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BackLink, BrassDial, Chip, Coin, LeatherChip, LearnHero, Panel } from "@/components/learn/kit";

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
    <div className="space-y-7">
      <BackLink href="/learn/courses">All courses</BackLink>

      <LearnHero
        eyebrow={`${course.levelName} level · ${course.isSequential ? "Progression mode" : "Open access"}`}
        title={course.title}
        description={course.subtitle}
        meta={
          <>
            <LeatherChip icon={BookOpen}>{course.modules.length} modules</LeatherChip>
            <LeatherChip icon={CheckCircle2}>
              {course.completed} of {course.total} lessons complete
            </LeatherChip>
          </>
        }
        aside={
          <>
            <div className="lk-cover3d hidden sm:block">
              <div>
                <CoverImage src={course.coverImageUrl || editorialImage(course.levelName)} alt="" sizes="160px" eager />
              </div>
            </div>
            <BrassDial value={course.percent} label="Course progress" caption="Course progress" size={140} />
          </>
        }
      />

      {(course.description ?? course.summary) ? (
        <Panel title="About this course" icon={Info} stacked>
          <div className="max-w-3xl">{renderRichText(course.description ?? course.summary)}</div>
        </Panel>
      ) : null}

      <div className="space-y-6">
        {course.modules.map((module, moduleIndex) => {
          const moduleLessons = course.progression.filter((lesson) => lesson.moduleId === module.id);
          const moduleDone = moduleLessons.filter((lesson) => lesson.completion === "completed").length;
          const moduleUnlocked = moduleLessons.some((lesson) => lesson.unlocked);
          return (
            <section key={module.id} aria-labelledby={`module-${module.id}`} className="lk-paper overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(120,96,52,0.16)] bg-[linear-gradient(180deg,#fbf3dc,#fffdf8)] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-4">
                  <Coin tone="navy" className="h-11 w-11 text-[15px]">
                    {moduleIndex + 1}
                  </Coin>
                  <div>
                    <p className="lk-kicker">Chapter {moduleIndex + 1}</p>
                    <h2 id={`module-${module.id}`} className="font-serif text-[1.2rem] text-navy">
                      {module.title}
                      {module.isPreview ? (
                        <Chip tone="gold" className="ml-2 align-middle">
                          preview
                        </Chip>
                      ) : null}
                    </h2>
                    <p className="text-[13px] text-stone-600">
                      {module.sessionCode ? `${module.sessionCode} · ` : ""}
                      {moduleDone}/{moduleLessons.length} lessons · {module.estimatedMinutes} min
                    </p>
                  </div>
                </div>
                {moduleUnlocked ? (
                  <Chip tone="teal" icon={Clock}>
                    in progression
                  </Chip>
                ) : (
                  <Chip icon={Lock}>locked</Chip>
                )}
              </div>
              {module.summary ? (
                <p className="border-b border-dashed border-[rgba(18,42,77,0.14)] px-5 py-3 text-[14px] leading-relaxed text-stone-600 sm:px-6">{module.summary}</p>
              ) : null}
              <ul className="lk-ledger px-3 sm:px-4">
                {moduleLessons.map((lesson) => {
                  const meta = KIND_LABEL[lesson.kind] ?? KIND_LABEL.reading;
                  const Icon = meta.icon;
                  const completed = lesson.completion === "completed";
                  const body = (
                    <>
                      <Coin tone={completed ? "green" : lesson.unlocked ? "brass" : "muted"} className="h-9 w-9">
                        {completed ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : lesson.unlocked ? <Icon aria-hidden className="h-4 w-4" /> : <Lock aria-hidden className="h-3.5 w-3.5" />}
                      </Coin>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn("text-[14px] font-medium", lesson.unlocked ? "text-navy" : "text-stone-600")}>
                            {lesson.position}. {lesson.title}
                          </span>
                          <Chip>{meta.label}</Chip>
                          {lesson.isNext ? <Chip tone="gold">next</Chip> : null}
                          <span className="sr-only">{completed ? "(completed)" : lesson.unlocked ? "" : "(locked)"}</span>
                        </span>
                        {lesson.summary ? <span className="mt-0.5 block line-clamp-1 text-[13px] text-stone-600">{lesson.summary}</span> : null}
                      </span>
                      <span className="shrink-0 text-[12px] uppercase tracking-[0.08em] text-stone-600">{lesson.durationMinutes} min</span>
                    </>
                  );
                  return (
                    <li key={lesson.id}>
                      {lesson.unlocked ? (
                        <Link
                          href={`/learn/courses/${course.slug}/${lesson.id}`}
                          className="group flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 hover:bg-[rgba(201,162,39,0.07)]"
                        >
                          {body}
                          <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-navy" />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-2 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="lk-note max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6b4a05]">
          <Info aria-hidden className="h-4 w-4" /> How progression works
        </p>
        <p className="mt-2 text-[14px] leading-relaxed">
          Lessons unlock in sequence. Mark a lesson complete and the next one opens, together with its video, audio, illustration and downloadable worksheet. Preview lessons stay open
          to everyone.
        </p>
      </div>
    </div>
  );
}
