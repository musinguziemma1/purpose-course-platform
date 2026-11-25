import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ListChecks, Lock, MessagesSquare, NotebookPen, Sparkles } from "lucide-react";
import { LessonMedia } from "@/components/academy/lesson-media";
import { getLessonContext, recordLessonView } from "@/db/courses";
import { db } from "@/db";
import { learningActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { renderRichText } from "@/lib/markdown";
import { toggleLessonCompletion } from "@/app/actions/academy";
import { cn } from "@/lib/utils";
import { BackLink, Chip, Flourish, Panel, btn } from "@/components/learn/kit";
import { SubmitButton } from "@/components/learn/forms";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; lessonId: string }> };

export default async function LessonPage({ params }: Params) {
  const { slug, lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const context = await getLessonContext(user.profileId, slug, Number(lessonId));
  if (!context) notFound();
  if (context.locked) redirect(`/learn/courses/${slug}`);

  const { course, current, previous, next, index, progression } = context;
  await recordLessonView(user.profileId, current.id).catch(() => undefined);

  const completed = current.completion === "completed";
  const activities = await db.select().from(learningActivities).where(eq(learningActivities.lessonId, current.id)).orderBy(learningActivities.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink href={`/learn/courses/${course.slug}`}>{course.title}</BackLink>
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-600">
          <span>
            Lesson {index + 1} of {progression.length}
          </span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-stone-400" />
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="h-3.5 w-3.5" /> {current.durationMinutes} min
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        {/* The reading surface is a book page rather than a leather plate, so nothing competes with the lesson. */}
        <article className="min-w-0 space-y-6">
          <header className="lk-paper lk-stack px-6 pb-6 pt-7 sm:px-10 sm:pt-9">
            <p className="lk-kicker">
              {current.moduleTitle} · {course.levelName} level
            </p>
            <h1 className="mt-2 font-serif text-[2rem] leading-tight text-navy sm:text-[2.4rem]">{current.title}</h1>
            {current.summary ? <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone-600">{current.summary}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Chip>{current.kind}</Chip>
              {current.isPreview ? <Chip tone="gold">preview</Chip> : null}
              {completed ? (
                <Chip tone="green" icon={CheckCircle2}>
                  completed
                </Chip>
              ) : null}
            </div>
            <Flourish className="mt-6" />
          </header>

          <LessonMedia
            kind={current.kind}
            videoUrl={current.videoUrl}
            audioUrl={current.audioUrl}
            imageUrl={current.imageUrl}
            imageAlt={current.imageAlt}
            downloadUrl={current.downloadUrl}
            downloadLabel={current.downloadLabel}
          />

          <div className="lk-paper px-6 py-7 sm:px-10 sm:py-9">
            <div className="lk-prose">{renderRichText(current.body)}</div>
          </div>

          {current.transcript ? (
            <details className="lk-paper group p-5 sm:px-7">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-navy [&::-webkit-details-marker]:hidden">
                <ArrowRight aria-hidden className="h-4 w-4 text-[#a5811a] transition-transform duration-200 group-open:rotate-90" />
                Transcript / teaching notes
              </summary>
              <p className="lk-lined mt-3 whitespace-pre-line text-[14px] text-stone-700">{current.transcript}</p>
            </details>
          ) : null}

          {activities.length > 0 ? (
            <Panel title="Lesson activities" icon={ListChecks}>
              <ul className="space-y-3">
                {activities.map((activity) => (
                  <li key={activity.id} className="lk-well px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-navy">{activity.title}</p>
                      <Chip>
                        {activity.kind} · {activity.estimatedMinutes} min
                      </Chip>
                    </div>
                    <p className="mt-1 text-[14px] leading-relaxed text-stone-600">{activity.instruction}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {current.practicePrompt ? (
            <div className="lk-note">
              <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6b4a05]">
                <Sparkles aria-hidden className="h-4 w-4" /> Practice this week
              </p>
              <p className="mt-2 font-serif text-[16px] italic leading-relaxed">{current.practicePrompt}</p>
              <Link href="/learn/reflections" className={cn(btn.navy, btn.sm, "mt-4")}>
                <NotebookPen aria-hidden className="h-4 w-4" /> Write your reflection
              </Link>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[rgba(18,42,77,0.2)] pt-5">
            <div className="flex gap-2.5">
              {previous ? (
                <Link href={`/learn/courses/${course.slug}/${previous.id}`} className={cn(btn.paper, btn.sm)}>
                  <ArrowLeft aria-hidden className="h-4 w-4" /> Previous
                </Link>
              ) : null}
              {next && next.unlocked ? (
                <Link href={`/learn/courses/${course.slug}/${next.id}`} className={cn(btn.paper, btn.sm)}>
                  Next <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
            {context.canComplete ? (
              <form action={toggleLessonCompletion}>
                <input type="hidden" name="lessonId" value={current.id} />
                <input type="hidden" name="courseSlug" value={course.slug} />
                <SubmitButton className={cn("lk-btn", completed ? "lk-btn-down" : "lk-btn-brass")}>
                  <CheckCircle2 aria-hidden className="h-4 w-4" />
                  {completed ? "Completed — mark as in progress" : "Mark lesson complete"}
                </SubmitButton>
              </form>
            ) : (
              <p className="text-[14px] text-stone-600">Enroll in this level to record progress.</p>
            )}
          </div>
        </article>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <Panel title="Course outline" kicker={`${progression.length} lessons · progression mode`} bodyClassName="px-2 pb-3 pt-3">
            <ul className="max-h-[32rem] overflow-y-auto overscroll-contain">
              {progression.map((lesson) => {
                const isCurrent = lesson.id === current.id;
                return (
                  <li key={lesson.id} className="relative">
                    {/* A crimson ribbon marks your place, like a bookmark between pages. */}
                    {isCurrent ? <span aria-hidden className="absolute inset-y-1 left-0 w-1.5 rounded-r bg-[linear-gradient(180deg,#b13a44,#7a1d26)] shadow-[1px_0_2px_rgba(0,0,0,0.25)]" /> : null}
                    <Link
                      href={lesson.unlocked ? `/learn/courses/${course.slug}/${lesson.id}` : `/learn/courses/${course.slug}`}
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-2.5 rounded-lg py-2 pl-5 pr-3 text-[13px] transition-colors duration-150",
                        isCurrent ? "bg-[rgba(201,162,39,0.12)] font-semibold text-navy" : lesson.unlocked ? "text-stone-700 hover:bg-[rgba(201,162,39,0.07)]" : "text-stone-500",
                      )}
                    >
                      {lesson.completion === "completed" && !isCurrent ? (
                        <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-source" />
                      ) : lesson.unlocked || isCurrent ? (
                        <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", isCurrent ? "bg-[#9b2c35]" : "bg-stone-300")} />
                      ) : (
                        <Lock aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="line-clamp-2">
                        {lesson.position}. {lesson.title}
                      </span>
                      {lesson.completion === "completed" ? <span className="sr-only">(completed)</span> : !lesson.unlocked ? <span className="sr-only">(locked)</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <div className="lk-paper p-5">
            <p className="inline-flex items-center gap-2 font-serif text-[1.05rem] text-navy">
              <MessagesSquare aria-hidden className="h-4 w-4 text-[#a5811a]" /> Need a conversation?
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-stone-600">Bring this lesson to your clarity coach or the live session feed.</p>
            <div className="mt-2 flex flex-wrap gap-x-4">
              <Link href="/learn/mentor" className="lk-link">
                My mentor <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link href="/learn/live" className="lk-link">
                Live sessions <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
