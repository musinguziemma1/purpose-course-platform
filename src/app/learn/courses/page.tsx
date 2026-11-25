import Link from "next/link";
import { CoverImage } from "@/components/site/cover-image";
import { editorialImage } from "@/lib/media";
import { ArrowRight, BookOpen, Clock, Filter, Layers, Library, Lock, PlayCircle, Sparkles } from "lucide-react";
import { getStudentAcademy } from "@/db/courses";
import { db } from "@/db";
import { courseLevels } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LevelProgression } from "@/components/academy/level-progression";
import { getProgrammeOutlines } from "@/db/programmes";
import { BrassDial, Chip, DeskHeading, EmptyDesk, Groove, LeatherChip, LearnHero, Panel, btn } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Academy courses" };

export default async function StudentCoursesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [academy, levels, programmeOutlines] = await Promise.all([
    getStudentAcademy(user.profileId),
    db.select().from(courseLevels).orderBy(courseLevels.sortOrder),
    getProgrammeOutlines({ includeDrafts: false }),
  ]);
  const catalogueGroups = programmeOutlines.map((programme) => ({
    programme,
    levels: programme.levels
      .map((outline) => ({ outline, level: levels.find((level) => level.programmeLevelId === outline.id) }))
      .filter((item) => item.level !== undefined),
    courses: academy.courses.filter((course) => course.subtitle === programme.name),
  }));
  const organisedCourses = catalogueGroups.flatMap((group) => group.courses);

  const levelId = academy.enrollment?.levelId ?? null;
  const curriculumPercent = academy.totalLessons ? Math.round((academy.completedLessons / academy.totalLessons) * 100) : 0;

  return (
    <div className="space-y-8">
      <LearnHero
        eyebrow="Purpose Course Academy"
        title="Academy courses"
        description="Structured lessons in progression: video teaching, audio, illustrations, downloadable material and practice. Complete each lesson to unlock the next."
        meta={
          <LeatherChip icon={PlayCircle}>
            {academy.inProgressCount} lesson{academy.inProgressCount === 1 ? "" : "s"} in progress
          </LeatherChip>
        }
        actions={
          catalogueGroups.length ? (
            <Link href="#published-programme-outlines" className={btn.paper}>
              <Library aria-hidden className="h-4 w-4" /> Browse published programme outlines
            </Link>
          ) : null
        }
        aside={
          <BrassDial value={curriculumPercent} label="Curriculum progress" caption={`${academy.completedLessons}/${academy.totalLessons} lessons`} size={148} />
        }
      />

      <LevelProgression user={user} />

      {catalogueGroups.length ? (
        <Panel title="Programme catalogue and enrolment level" icon={Filter}>
          <div className="grid gap-3 md:grid-cols-2">
            {catalogueGroups.map(({ programme, levels: programmeLevels }) => (
              <div key={programme.id} className="lk-well p-4">
                <p className="text-[14px] font-semibold text-navy">{programme.name}</p>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {programmeLevels.map(({ outline, level }) => (
                    <li key={outline.id}>
                      <Chip tone={level?.id === levelId ? "navy" : "plain"}>
                        {outline.name}
                        {level?.id === levelId ? <span className="sr-only"> (your level)</span> : null}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {organisedCourses.length ? (
        <section aria-labelledby="course-shelf" className="space-y-5">
          <DeskHeading id="course-shelf" icon={BookOpen} count={organisedCourses.length}>
            Your shelf
          </DeskHeading>
          <div className="grid gap-7 lg:grid-cols-2">
            {organisedCourses.map((course, index) => {
              const next = course.nextLesson;
              const locked = !course.enrolled && !course.progression.some((lesson) => lesson.unlocked);
              return (
                // A hardback: leather spine on the left, page edges stacked on the right.
                <article key={course.id} className="lk-book flex flex-col">
                  <div className="relative h-40 w-full overflow-hidden bg-cream">
                    <CoverImage src={course.coverImageUrl || editorialImage(course.levelName)} alt="" sizes="(min-width: 1024px) 40vw, 100vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
                    <span className="absolute left-6 top-3">
                      <Chip tone="gold">
                        {course.levelName} · Level {course.levelNumber}
                      </Chip>
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col py-5 pl-8 pr-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="lk-kicker">{course.levelName} level</p>
                        <h2 className="mt-1 font-serif text-[1.35rem] leading-snug text-navy">{course.title}</h2>
                        {course.subtitle ? <p className="text-[13px] text-stone-600">{course.subtitle}</p> : null}
                      </div>
                      <Chip>{course.modules.length} modules</Chip>
                    </div>
                    <p className="mt-3 flex-1 text-[14px] leading-relaxed text-stone-600">{course.summary}</p>

                    <div className="mt-4 flex items-center gap-3">
                      <Groove value={course.percent} label={`${course.title} progress`} index={Math.min(index, 6)} className="flex-1" />
                      <span className="text-[13px] font-semibold tabular-nums text-navy">
                        {course.completed}/{course.total}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] uppercase tracking-[0.08em] text-stone-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers aria-hidden className="h-3.5 w-3.5" /> {course.completed} done
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock aria-hidden className="h-3.5 w-3.5" /> ~{course.estimatedHours}h
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen aria-hidden className="h-3.5 w-3.5" /> {course.total} lessons
                      </span>
                      {course.isSequential ? <Chip>progression mode</Chip> : null}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2.5 border-t border-dashed border-[rgba(18,42,77,0.16)] pt-4">
                      <Link href={`/learn/courses/${course.slug}`} className={cn(btn.navy, btn.sm)}>
                        Open course <ArrowRight aria-hidden className="h-4 w-4" />
                      </Link>
                      {next ? (
                        <Link href={`/learn/courses/${course.slug}/${next.id}`} className={cn(btn.paper, btn.sm, "max-w-full")}>
                          <PlayCircle aria-hidden className="h-4 w-4 text-[#a5811a]" />
                          <span className="truncate">
                            {course.completed === 0 ? "Start" : "Continue"}: {next.title}
                          </span>
                        </Link>
                      ) : locked ? (
                        <span className="lk-well inline-flex min-h-9 items-center gap-1.5 px-3.5 text-[13px] text-stone-600">
                          <Lock aria-hidden className="h-3.5 w-3.5" /> Enrolment pending
                        </span>
                      ) : (
                        <Chip tone="green" icon={Sparkles} className="min-h-9 px-3.5 text-[13px]">
                          Course complete
                        </Chip>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {catalogueGroups.length ? (
        <section id="published-programme-outlines" aria-labelledby="outlines-heading" className="scroll-mt-24 space-y-5">
          <div className="space-y-2">
            <DeskHeading id="outlines-heading" icon={Library}>
              Programme catalogue
            </DeskHeading>
            <p className="max-w-3xl text-[14px] leading-relaxed text-stone-600">
              Each published pathway is linked to its digital lessons, module quizzes, assignments, level examination, progress record and certificate requirements.
            </p>
          </div>
          {catalogueGroups.map(({ programme }) => (
            <section key={programme.id} className="lk-paper overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(120,96,52,0.16)] bg-[linear-gradient(180deg,#fbf3dc,#fffdf8)] px-5 py-4 sm:px-6">
                <div>
                  <p className="lk-kicker">Published programme</p>
                  <h3 className="font-serif text-[1.2rem] text-navy">{programme.name}</h3>
                </div>
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                  {programme.levels.length} levels · {programme.levels.reduce((total, level) => total + level.modules.length, 0)} modules
                </span>
              </div>
              <ul className="lk-ledger px-3 sm:px-4">
                {programme.levels.map((level, levelIndex) => (
                  <li key={level.id}>
                    <Link
                      href={`/learn/programmes/${programme.slug}`}
                      className="group flex flex-wrap items-center gap-3 rounded-lg px-2 py-3.5 transition-colors duration-150 hover:bg-[rgba(201,162,39,0.07)]"
                    >
                      <span className="lk-coin h-9 w-9 text-[14px]">{levelIndex + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-navy">
                          Level {levelIndex + 1} · {level.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[13px] text-stone-600">{level.introduction}</p>
                      </div>
                      <span className="text-[12px] uppercase tracking-[0.08em] text-stone-600">{level.modules.length} academic modules</span>
                      <ArrowRight aria-hidden className="h-4 w-4 text-stone-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-navy" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      ) : null}

      {academy.courses.length === 0 ? (
        <EmptyDesk
          icon={BookOpen}
          title={programmeOutlines.length ? "No courses are available for this account." : "The curriculum is being prepared."}
          description={
            programmeOutlines.length
              ? "Published pathways are available above. Contact the programme team if your enrolment should include a course."
              : "Your faculty is publishing the first course. Check back shortly."
          }
          action={
            <Link href="/course" className={btn.paper}>
              See the programme <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
