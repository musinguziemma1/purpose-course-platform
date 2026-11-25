import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, ClipboardList, ExternalLink, FileAudio, FileText, ImageIcon, PenLine, Plus, Trash2, TriangleAlert, Video } from "lucide-react";
import { getAcademyTree } from "@/db/courses";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { deleteCourse, deleteLesson, deleteModule, moveModule } from "@/app/actions/academy";
import { Led } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/* Small round keys for module and lesson controls (raised paper; rose for delete). */
const ICON_KEY = "k-key k-key-icon";

export default async function AdminCourseEditorPage({ params }: Params) {
  await requireAdminPage("/admin/academy/courses/[id]");
  const { id } = await params;
  const courseId = Number(id);
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAuthorAcademy(user)) redirect("/admin/academy");
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
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/academy", label: "Academy builder" }}
        eyebrow={`${course.levelName} level · ${course.status} · ${course.isSequential ? "progression mode" : "open access"}`}
        title={course.title}
        description={course.summary}
        meta={
          <>
            {[
              [`${course.modules.length} modules`, null],
              [`${allLessons.length} lessons`, null],
              [`${media.video} video`, Video],
              [`${media.audio} audio`, FileAudio],
              [`${media.image} illustrated`, ImageIcon],
              [`${media.download} downloads`, FileText],
            ].map(([label, Icon]) => {
              const MetaIcon = Icon as typeof Video | null;
              return (
                <span key={String(label)} className="ui-badge inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-cream px-2.5 py-1 text-[12px] text-stone-700">
                  {MetaIcon ? <MetaIcon aria-hidden className="h-3.5 w-3.5 text-gold-dark" /> : null}
                  {String(label)}
                </span>
              );
            })}
          </>
        }
        actions={
          <>
            <Link href={`/admin/academy/courses/${course.id}/edit`} className={keyClass("navy", "sm")}>
              <PenLine aria-hidden /> Course settings
            </Link>
            <Link href={`/admin/academy/courses/${course.id}/edit?module=new`} className={keyClass("paper", "sm")}>
              <Plus aria-hidden /> Add module
            </Link>
            <Link href={`/learn/courses/${course.slug}`} className={keyClass("paper", "sm")}>
              <ExternalLink aria-hidden /> Student view
            </Link>
          </>
        }
      />

      {course.modules.length ? (
        <div className="k-stagger grid gap-4 lg:grid-cols-2 lg:items-start">
          {course.modules.map((module, moduleIndex) => (
            <section key={module.id} style={staggerStyle(moduleIndex)} className="admin-card overflow-hidden">
              <div className="k-panel-head">
                <span className="k-well font-serif text-[14px] font-semibold text-navy">{moduleIndex + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="flex flex-wrap items-center gap-2 font-serif text-[17px] text-navy">
                    {module.title}
                    {module.isPreview ? (
                      <span className="ui-badge rounded-full border border-gold/40 bg-gold/20 px-2 py-0.5 font-sans text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gold-dark">preview</span>
                    ) : null}
                  </h2>
                  <p className="text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                    {module.sessionCode ? `${module.sessionCode} · ` : ""}
                    {module.lessons.length} lessons · {module.estimatedMinutes} min
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <form action={moveModule}>
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" aria-label="Move module up" className={ICON_KEY}>
                      <ArrowUp aria-hidden />
                    </button>
                  </form>
                  <form action={moveModule}>
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" aria-label="Move module down" className={ICON_KEY}>
                      <ArrowDown aria-hidden />
                    </button>
                  </form>
                  <form action={deleteModule}>
                    <input type="hidden" name="moduleId" value={module.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <button type="submit" aria-label="Delete module" className={`${ICON_KEY} text-rose-700`}>
                      <Trash2 aria-hidden />
                    </button>
                  </form>
                </div>
              </div>

              <ul className="divide-y divide-navy/8">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex flex-wrap items-center gap-2.5 px-5 py-2.5">
                    <Led tone={lesson.status === "published" ? "green" : "off"} />
                    <span className="ui-badge rounded-full border border-navy/10 bg-cream px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-700">{lesson.kind}</span>
                    <Link href={`/admin/academy/courses/${course.id}/edit?lesson=${lesson.id}`} className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-navy hover:text-gold-dark">
                      {lesson.title}
                    </Link>
                    <span className="sr-only">{lesson.status}</span>
                    <span className="flex items-center gap-1 text-stone-500">
                      {lesson.videoUrl ? <Video aria-label="Video" className="h-3.5 w-3.5" /> : null}
                      {lesson.audioUrl ? <FileAudio aria-label="Audio" className="h-3.5 w-3.5" /> : null}
                      {lesson.imageUrl ? <ImageIcon aria-label="Illustration" className="h-3.5 w-3.5" /> : null}
                      {lesson.downloadUrl ? <FileText aria-label="Download" className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="numeric text-[12px] text-stone-500">{lesson.durationMinutes}m</span>
                    <form action={deleteLesson}>
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <input type="hidden" name="courseId" value={course.id} />
                      <button type="submit" aria-label="Delete lesson" className={`${ICON_KEY} text-rose-700`}>
                        <Trash2 aria-hidden />
                      </button>
                    </form>
                  </li>
                ))}
                {module.lessons.length === 0 ? <li className="px-5 py-3 text-[13px] text-stone-600">No lessons yet.</li> : null}
              </ul>

              <div className="k-strip flex flex-wrap items-center justify-between gap-2 border-t border-navy/10 px-5 py-2.5">
                <Link href={`/admin/academy/courses/${course.id}/edit?module=${module.id}`} className="text-[13px] font-semibold text-navy hover:text-gold-dark">
                  Module settings
                </Link>
                <Link href={`/admin/academy/courses/${course.id}/edit?lesson=new&module=${module.id}`} className={keyClass("paper", "sm")}>
                  <Plus aria-hidden /> Add lesson
                </Link>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <ConsoleEmpty
          icon={ClipboardList}
          title="No modules yet."
          description="Use Add module to start the curriculum."
          action={
            <Link href={`/admin/academy/courses/${course.id}/edit?module=new`} className={keyClass("navy", "sm")}>
              <Plus aria-hidden /> Add module
            </Link>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <Panel title="Publishing checklist" icon={ClipboardList} riveted bodyClassName="px-6 pb-6 pt-4 text-[13.5px] leading-relaxed text-stone-700">
          <ul className="space-y-1.5">
            {[
              "Every module has at least three lessons.",
              "Mix video, audio, illustration and a downloadable worksheet.",
              "Add a practice prompt so learning leaves the page.",
              "Set course status to Published so students see it.",
              "Schedule the live class or group work that closes the module.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[5px] h-3 w-3 shrink-0 rounded-[3px] border border-navy/25 bg-paper shadow-[inset_0_1px_2px_rgba(10,26,48,0.15)]" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/admin/academy/live" className={keyClass("paper", "sm", "mt-4")}>
            Schedule live sessions <ArrowRight aria-hidden />
          </Link>
        </Panel>
        <form action={deleteCourse} className="admin-card k-danger overflow-hidden">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="k-panel-head">
            <span className="k-well text-rose-700">
              <TriangleAlert aria-hidden className="h-4 w-4" />
            </span>
            <h2 className="k-panel-title text-rose-800">Danger zone</h2>
          </div>
          <div className="px-5 pb-5 pt-3">
            <p className="text-[13.5px] leading-relaxed text-rose-800">Deleting removes the course with all of its modules, lessons and student progress records.</p>
            <button type="submit" className={keyClass("danger", "sm", "mt-3")}>
              <Trash2 aria-hidden /> Delete “{course.title}”
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
