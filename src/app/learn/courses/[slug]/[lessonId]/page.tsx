import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock, NotebookPen, Sparkles } from "lucide-react";
import { LessonMedia } from "@/components/academy/lesson-media";
import { getLessonContext, recordLessonView } from "@/db/courses";
import { db } from "@/db";
import { learningActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ListChecks } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { renderRichText } from "@/lib/markdown";
import { toggleLessonCompletion } from "@/app/actions/academy";
import { cn } from "@/lib/utils";

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
  const isDone = completed;
  const activities = await db
    .select()
    .from(learningActivities)
    .where(eq(learningActivities.lessonId, current.id))
    .orderBy(learningActivities.sortOrder);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/learn/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> {course.title}
        </Link>
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
          <span>
            Lesson {index + 1} of {progression.length}
          </span>
          <span className="h-1 w-1 rounded-full bg-stone-300" />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {current.durationMinutes} min
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <article className="min-w-0 space-y-5">
          <header>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
              {current.moduleTitle} · {course.levelName} level
            </p>
            <h1 className="mt-1.5 font-serif text-3xl leading-tight text-navy">{current.title}</h1>
            {current.summary ? <p className="mt-2 text-[13.5px] leading-relaxed text-stone-600">{current.summary}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                {current.kind}
              </span>
              {current.isPreview ? (
                <span className="rounded-full bg-gold/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gold-dark">
                  preview
                </span>
              ) : null}
              {isDone ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-source/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-source">
                  <CheckCircle2 className="h-3 w-3" /> completed
                </span>
              ) : null}
            </div>
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

          <div className="admin-card p-5 sm:p-7">{renderRichText(current.body)}</div>

          {current.transcript ? (
            <details className="admin-card p-5">
              <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.1em] text-navy">
                Transcript / teaching notes
              </summary>
              <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-stone-700">{current.transcript}</p>
            </details>
          ) : null}

          {activities.length > 0 ? (
            <div className="admin-card p-5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <ListChecks className="h-3.5 w-3.5 text-gold-dark" /> Lesson activities
              </p>
              <ul className="mt-2 space-y-2">
                {activities.map((activity) => (
                  <li key={activity.id} className="rounded-lg border border-navy/10 bg-cream/30 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12.5px] font-medium text-navy">{activity.title}</p>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                        {activity.kind} · {activity.estimatedMinutes} min
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-600">{activity.instruction}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {current.practicePrompt ? (
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                <Sparkles className="h-3.5 w-3.5" /> Practice this week
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-stone-700">{current.practicePrompt}</p>
              <Link
                href="/learn/reflections"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
              >
                <NotebookPen className="h-3.5 w-3.5" /> Write your reflection
              </Link>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 pt-4">
            <div className="flex gap-2">
              {previous ? (
                <Link
                  href={`/learn/courses/${course.slug}/${previous.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </Link>
              ) : null}
              {next && next.unlocked ? (
                <Link
                  href={`/learn/courses/${course.slug}/${next.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
            <form action={toggleLessonCompletion}>
              <input type="hidden" name="lessonId" value={current.id} />
              <input type="hidden" name="courseSlug" value={course.slug} />
              <button
                type="submit"
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-5 text-[12px] font-semibold transition-colors",
                  completed ? "border border-source/30 bg-source/10 text-source" : "bg-gold text-ink hover:bg-gold-dark hover:text-paper",
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {completed ? "Completed — mark as in progress" : "Mark lesson complete"}
              </button>
            </form>
          </div>
        </article>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-4 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Course outline</p>
              <p className="text-[10.5px] text-stone-500">{progression.length} lessons · progression mode</p>
            </div>
            <ul className="max-h-[32rem] divide-y divide-navy/8 overflow-y-auto">
              {progression.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={lesson.unlocked ? `/learn/courses/${course.slug}/${lesson.id}` : `/learn/courses/${course.slug}`}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-[11.5px]",
                      lesson.id === current.id ? "bg-cream/70 font-semibold text-navy" : lesson.unlocked ? "text-stone-700 hover:bg-cream/40" : "text-stone-400",
                    )}
                  >
                    {lesson.id === current.id ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    ) : lesson.completion === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-source" />
                    ) : lesson.unlocked ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                    ) : (
                      <Lock className="h-3 w-3 shrink-0" />
                    )}
                    <span className="line-clamp-2">
                      {lesson.position}. {lesson.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-navy/10 bg-paper p-4 text-[11.5px] leading-relaxed text-stone-600">
            <p className="font-semibold text-navy">Need a conversation?</p>
            <p className="mt-1">Bring this lesson to your clarity coach or the live session feed.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/learn/mentor" className="font-semibold text-gold-dark hover:underline">
                My mentor →
              </Link>
              <Link href="/learn/live" className="font-semibold text-gold-dark hover:underline">
                Live sessions →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
