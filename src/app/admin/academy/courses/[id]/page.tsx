import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, FileAudio, FileText, ImageIcon, PenLine, Plus, Trash2, Video } from "lucide-react";
import { getAcademyTree } from "@/db/courses";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { deleteCourse, deleteLesson, deleteModule, moveModule } from "@/app/actions/academy";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminCourseEditorPage({ params }: Params) {
  const { id } = await params;
  const courseId = Number(id);
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManagePeople(user)) redirect("/admin/academy");
  if (!courseId) notFound();

  const tree = await getAcademyTree({ includeDrafts: true });
  const course = tree.find((item) => item.id === courseId);
  if (!course) notFound();

  const allLessons = course.modules.flatMap((module) => module.lessons);
  const media = {
    video: allLessons.filter((lesson) => lesson.videoUrl).length,
    audio: allLessons.filter((lesson) => lesson.audioUrl).length,
    image: allLessons.filter((lesson) => lesson.imageUrl).length,
    download: allLessons.filter((lesson) => lesson.downloadUrl).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/academy" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
            <ArrowLeft className="h-3.5 w-3.5" /> Academy builder
          </Link>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            {course.levelName} level · {course.status} · {course.isSequential ? "progression mode" : "open access"}
          </p>
          <h1 className="font-serif text-2xl text-navy">{course.title}</h1>
          <p className="max-w-2xl text-[12.5px] text-stone-600">{course.summary}</p>
          <p className="mt-1 text-[11px] text-stone-500">
            {course.modules.length} modules · {allLessons.length} lessons · {media.video} video · {media.audio} audio · {media.image} illustrated ·{" "}
            {media.download} downloads
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/academy/courses/${course.id}/edit`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3.5 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
          >
            <PenLine className="h-3.5 w-3.5" /> Course settings
          </Link>
          <Link
            href={`/admin/academy/courses/${course.id}/edit?module=new`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-3.5 text-[11.5px] font-medium text-navy hover:bg-cream"
          >
            <Plus className="h-3.5 w-3.5" /> Add module
          </Link>
          <Link
            href={`/learn/courses/${course.slug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-3.5 text-[11.5px] font-medium text-navy hover:bg-cream"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Student view
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {course.modules.map((module, moduleIndex) => (
          <div key={module.id} className="admin-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/10 bg-cream/40 px-4 py-3">
              <div className="min-w-0">
                <p className="font-serif text-[15px] text-navy">
                  {moduleIndex + 1}. {module.title}
                  {module.isPreview ? (
                    <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-gold-dark">
                      preview
                    </span>
                  ) : null}
                </p>
                <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                  {module.sessionCode ? `${module.sessionCode} · ` : ""}
                  {module.lessons.length} lessons · {module.estimatedMinutes} min
                </p>
              </div>
              <div className="flex gap-1">
                <form action={moveModule}>
                  <input type="hidden" name="moduleId" value={module.id} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" aria-label="Move module up" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-navy/15 text-navy hover:bg-paper">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </form>
                <form action={moveModule}>
                  <input type="hidden" name="moduleId" value={module.id} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" aria-label="Move module down" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-navy/15 text-navy hover:bg-paper">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </form>
                <form action={deleteModule}>
                  <input type="hidden" name="moduleId" value={module.id} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <button type="submit" aria-label="Delete module" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </form>
              </div>
            </div>

            <ul className="divide-y divide-navy/8">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                      {lesson.kind}
                    </span>
                    <Link
                      href={`/admin/academy/courses/${course.id}/edit?lesson=${lesson.id}`}
                      className="min-w-0 flex-1 truncate text-[12px] font-medium text-navy hover:text-gold-dark"
                    >
                      {lesson.title}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${lesson.status === "published" ? "bg-source/10 text-source" : "bg-stone-100 text-stone-500"}`}>
                      {lesson.status}
                    </span>
                    <span className="flex items-center gap-1 text-stone-400">
                      {lesson.videoUrl ? <Video className="h-3 w-3" /> : null}
                      {lesson.audioUrl ? <FileAudio className="h-3 w-3" /> : null}
                      {lesson.imageUrl ? <ImageIcon className="h-3 w-3" /> : null}
                      {lesson.downloadUrl ? <FileText className="h-3 w-3" /> : null}
                    </span>
                    <span className="text-[10px] text-stone-400">{lesson.durationMinutes}m</span>
                    <form action={deleteLesson}>
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <input type="hidden" name="courseId" value={course.id} />
                      <button type="submit" aria-label="Delete lesson" className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </form>
                  </div>
                </li>
              ))}
              {module.lessons.length === 0 ? <li className="px-4 py-2.5 text-[11px] text-stone-500">No lessons yet.</li> : null}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy/10 px-4 py-2.5">
              <Link
                href={`/admin/academy/courses/${course.id}/edit?module=${module.id}`}
                className="text-[10.5px] font-semibold text-navy hover:text-gold-dark"
              >
                Module settings
              </Link>
              <Link
                href={`/admin/academy/courses/${course.id}/edit?lesson=new&module=${module.id}`}
                className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gold-dark hover:underline"
              >
                <Plus className="h-3 w-3" /> Add lesson
              </Link>
            </div>
          </div>
        ))}
        {course.modules.length === 0 ? (
          <div className="admin-card p-6 text-[12px] text-stone-600">
            No modules yet. Use <strong>Add module</strong> to start the curriculum.
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-[11.5px] leading-relaxed text-stone-700">
          <p className="font-semibold text-gold-dark">Publishing checklist</p>
          <ul className="mt-1.5 space-y-1">
            <li>· Every module has at least three lessons.</li>
            <li>· Mix video, audio, illustration and a downloadable worksheet.</li>
            <li>· Add a practice prompt so learning leaves the page.</li>
            <li>· Set course status to <strong>Published</strong> so students see it.</li>
            <li>· Schedule the live class or group work that closes the module.</li>
          </ul>
          <Link href="/admin/academy/live" className="mt-2 inline-flex font-semibold text-navy hover:underline">
            Schedule live sessions →
          </Link>
        </div>
        <form action={deleteCourse} className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <input type="hidden" name="courseId" value={course.id} />
          <p className="text-[11.5px] font-semibold text-rose-700">Danger zone</p>
          <p className="mt-1 text-[11px] leading-relaxed text-rose-700/80">
            Deleting removes the course with all of its modules, lessons and student progress records.
          </p>
          <button
            type="submit"
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-3 w-3" /> Delete “{course.title}”
          </button>
        </form>
      </div>
    </div>
  );
}
