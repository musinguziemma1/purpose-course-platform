import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { getAcademyTree } from "@/db/courses";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { saveCourseForm, saveLessonForm, saveModuleForm } from "@/app/actions/academy-forms";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ lesson?: string; module?: string }> };

const input = "h-10 w-full rounded-lg border border-navy/15 bg-white px-3 text-[12.5px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20";
const label = "mb-1 block text-[11.5px] font-medium text-navy";
const area = "w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20";
const submit = "inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-[12px] font-semibold text-paper hover:bg-navy-700";

export default async function CourseEditPage({ params, searchParams }: Params) {
  await requireAdminPage("/admin/academy/courses/[id]/edit");
  const { id } = await params;
  const query = await searchParams;
  const courseId = Number(id);
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAuthorAcademy(user)) redirect("/admin/academy");
  if (!courseId) notFound();

  const tree = await getAcademyTree({ includeDrafts: true });
  const course = tree.find((item) => item.id === courseId);
  if (!course) notFound();

  const lessonParam = query.lesson ?? "";
  const moduleParam = query.module ?? "";
  const isNewLesson = lessonParam === "new";
  const editingLesson = lessonParam && !isNewLesson
    ? course.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === Number(lessonParam)) ?? null
    : null;
  const editingModule = editingLesson ? course.modules.find((module) => module.id === editingLesson.moduleId) ?? null : null;
  const newLessonModule = isNewLesson ? course.modules.find((module) => module.id === Number(moduleParam)) ?? course.modules[0] ?? null : null;
  const settingsModule = !isNewLesson && moduleParam && moduleParam !== "new"
    ? course.modules.find((module) => module.id === Number(moduleParam)) ?? null
    : null;
  const showCourse = !lessonParam && !moduleParam;
  const showNewModule = moduleParam === "new";

  const heading = editingLesson
    ? `Edit lesson — ${editingLesson.title}`
    : isNewLesson
      ? `Add a lesson${newLessonModule ? ` to ${newLessonModule.title}` : ""}`
      : settingsModule
        ? `Module settings — ${settingsModule.title}`
        : showNewModule
          ? "Add a module"
          : "Course settings";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href={`/admin/academy/courses/${course.id}`} className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> {course.title}
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-navy">{heading}</h1>
        <p className="text-[12px] text-stone-600">{course.levelName} level · changes reach students when the item is published.</p>
      </div>

      <div className="admin-card p-5">
        {showCourse ? (
          <form action={saveCourseForm} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <div>
              <label className={label}>Title</label>
              <input name="title" defaultValue={course.title} className={input} required />
            </div>
            <div>
              <label className={label}>Subtitle</label>
              <input name="subtitle" defaultValue={course.subtitle ?? ""} className={input} />
            </div>
            <div>
              <label className={label}>Summary</label>
              <textarea name="summary" rows={3} defaultValue={course.summary} className={area} />
            </div>
            <div>
              <label className={label}>Description</label>
              <textarea name="description" rows={3} defaultValue={course.description ?? ""} className={area} />
            </div>
            <div>
              <label className={label}>Cover image URL</label>
              <input name="coverImageUrl" defaultValue={course.coverImageUrl ?? ""} className={input} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label}>Accent</label>
                <select name="accent" defaultValue={course.accent} className={input}>
                  {["navy", "green", "gold", "purple", "teal"].map((accent) => (
                    <option key={accent} value={accent}>{accent}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Status</label>
                <select name="status" defaultValue={course.status} className={input}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className={label}>Estimated hours</label>
                <input name="estimatedHours" type="number" min={1} defaultValue={course.estimatedHours} className={input} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-navy">
              <input type="checkbox" name="isSequential" defaultChecked={course.isSequential} className="h-4 w-4 rounded border-navy/30" />
              Progression mode — lessons unlock in order
            </label>
            <button type="submit" className={submit}><Save className="h-4 w-4" /> Save course</button>
          </form>
        ) : null}

        {showNewModule ? (
          <form action={saveModuleForm} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <div>
              <label className={label}>Module title</label>
              <input name="title" className={input} required placeholder="Discovering Your Purpose" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Session code</label>
                <input name="sessionCode" className={input} placeholder="PURP 201" />
              </div>
              <div>
                <label className={label}>Estimated minutes</label>
                <input name="estimatedMinutes" type="number" min={5} defaultValue={45} className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Summary</label>
              <textarea name="summary" rows={2} className={area} />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-navy">
              <input type="checkbox" name="isPreview" className="h-4 w-4 rounded border-navy/30" /> Free preview module
            </label>
            <button type="submit" className={submit}><Plus className="h-4 w-4" /> Add module</button>
          </form>
        ) : null}

        {settingsModule ? (
          <form action={saveModuleForm} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="moduleId" value={settingsModule.id} />
            <div>
              <label className={label}>Module title</label>
              <input name="title" defaultValue={settingsModule.title} className={input} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Session code</label>
                <input name="sessionCode" defaultValue={settingsModule.sessionCode ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Estimated minutes</label>
                <input name="estimatedMinutes" type="number" min={5} defaultValue={settingsModule.estimatedMinutes} className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Summary</label>
              <textarea name="summary" rows={2} defaultValue={settingsModule.summary ?? ""} className={area} />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-navy">
              <input type="checkbox" name="isPreview" defaultChecked={settingsModule.isPreview} className="h-4 w-4 rounded border-navy/30" /> Free preview module
            </label>
            <button type="submit" className={submit}><Save className="h-4 w-4" /> Save module</button>
          </form>
        ) : null}

        {(editingLesson && editingModule) || (isNewLesson && newLessonModule) ? (
          <form action={saveLessonForm} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="moduleId" value={editingModule?.id ?? newLessonModule?.id ?? ""} />
            {editingLesson ? <input type="hidden" name="lessonId" value={editingLesson.id} /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Lesson title</label>
                <input name="title" defaultValue={editingLesson?.title ?? ""} className={input} required />
              </div>
              <div>
                <label className={label}>Format</label>
                <select name="kind" defaultValue={editingLesson?.kind ?? "reading"} className={input}>
                  {["video", "audio", "reading", "illustration", "download", "practice", "live"].map((kind) => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Summary</label>
              <input name="summary" defaultValue={editingLesson?.summary ?? ""} className={input} placeholder="One line shown in the outline" />
            </div>
            <div>
              <label className={label}>Structured content (markdown: ## headings, lists, :::callout)</label>
              <textarea name="body" rows={8} defaultValue={editingLesson?.body ?? ""} className={area} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Video URL</label>
                <input name="videoUrl" defaultValue={editingLesson?.videoUrl ?? ""} className={input} placeholder="https://…mp4" />
              </div>
              <div>
                <label className={label}>Audio URL</label>
                <input name="audioUrl" defaultValue={editingLesson?.audioUrl ?? ""} className={input} placeholder="https://…mp3" />
              </div>
              <div>
                <label className={label}>Illustration URL</label>
                <input name="imageUrl" defaultValue={editingLesson?.imageUrl ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Image alt text</label>
                <input name="imageAlt" defaultValue={editingLesson?.imageAlt ?? ""} className={input} />
              </div>
              <div>
                <label className={label}>Download URL</label>
                <input name="downloadUrl" defaultValue={editingLesson?.downloadUrl ?? ""} className={input} placeholder="/api/resources/…/download" />
              </div>
              <div>
                <label className={label}>Download label</label>
                <input name="downloadLabel" defaultValue={editingLesson?.downloadLabel ?? ""} className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Practice prompt</label>
              <textarea name="practicePrompt" rows={2} defaultValue={editingLesson?.practicePrompt ?? ""} className={area} />
            </div>
            <div>
              <label className={label}>Transcript / teaching notes</label>
              <textarea name="transcript" rows={2} defaultValue={editingLesson?.transcript ?? ""} className={area} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label}>Minutes</label>
                <input name="durationMinutes" type="number" min={1} defaultValue={editingLesson?.durationMinutes ?? 10} className={input} />
              </div>
              <div>
                <label className={label}>Status</label>
                <select name="status" defaultValue={editingLesson?.status ?? "published"} className={input}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-[12px] text-navy">
                  <input type="checkbox" name="isPreview" defaultChecked={editingLesson?.isPreview} className="h-4 w-4 rounded border-navy/30" /> Free preview
                </label>
              </div>
            </div>
            <button type="submit" className={submit}>
              {editingLesson ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingLesson ? "Save lesson" : "Add lesson"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
