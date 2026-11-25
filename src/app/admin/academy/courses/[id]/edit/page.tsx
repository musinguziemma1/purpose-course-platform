import { requireAdminPage } from "@/lib/page-access";
import { MediaEditor } from "@/components/media/media-editor";
import { MediaField } from "@/components/media/media-field";
import { notFound, redirect } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { ConsoleHeader, keyClass } from "@/components/admin/console/surfaces";
import { getAcademyTree } from "@/db/courses";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { saveCourseForm, saveLessonForm, saveModuleForm } from "@/app/actions/academy-forms";
import { PRINCIPLE_INFO, PRINCIPLE_KEYS, inferPrinciple } from "@/lib/purpose-journey";
import { getModulePrinciple } from "@/db/principle-tags";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ lesson?: string; module?: string }> };

/* 16px on phones stops iOS zooming into a focused field; the console skin supplies the debossed well and focus ring. */
const input = "h-11 w-full rounded-lg border px-3 text-[16px] text-ink outline-none sm:text-[14px]";
const label = "mb-1.5 block text-[12.5px] font-medium text-navy";
const area = "w-full rounded-lg border px-3 py-2.5 text-[16px] leading-relaxed text-ink outline-none sm:text-[14px]";
const submit = keyClass("navy");

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
  const settingsPrinciple = settingsModule ? await getModulePrinciple(settingsModule.id) : null;
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
    <div className="mx-auto max-w-2xl space-y-6">
      <ConsoleHeader
        back={{ href: `/admin/academy/courses/${course.id}`, label: course.title }}
        eyebrow="Academy builder"
        title={heading}
        description={`${course.levelName} level · changes reach students when the item is published.`}
      />

      <div className="admin-card k-riveted px-5 pb-6 pt-6 sm:px-7">
        {showCourse ? (
          <form action={saveCourseForm} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <div>
              <label className={label} htmlFor="course-edit-title">Title</label>
              <input id="course-edit-title" name="title" defaultValue={course.title} className={input} required />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-subtitle">Subtitle</label>
              <input id="course-edit-subtitle" name="subtitle" defaultValue={course.subtitle ?? ""} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-summary">Summary</label>
              <textarea id="course-edit-summary" name="summary" rows={3} defaultValue={course.summary} className={area} />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-description">Description</label>
              <MediaEditor id="course-edit-description" name="description" rows={6} defaultValue={course.description ?? ""} />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-coverImageUrl">Cover image URL</label>
              <input id="course-edit-coverImageUrl" name="coverImageUrl" defaultValue={course.coverImageUrl ?? ""} className={input} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label} htmlFor="course-edit-accent">Accent</label>
                <select id="course-edit-accent" name="accent" defaultValue={course.accent} className={input}>
                  {["navy", "green", "gold", "purple", "teal"].map((accent) => (
                    <option key={accent} value={accent}>{accent}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="course-edit-status">Status</label>
                <select id="course-edit-status" name="status" defaultValue={course.status} className={input}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className={label} htmlFor="course-edit-estimatedHours">Estimated hours</label>
                <input id="course-edit-estimatedHours" name="estimatedHours" type="number" min={1} defaultValue={course.estimatedHours} className={input} />
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
              <label className={label} htmlFor="course-edit-title">Module title</label>
              <input id="course-edit-title" name="title" className={input} required placeholder="Discovering Your Purpose" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="course-edit-sessionCode">Session code</label>
                <input id="course-edit-sessionCode" name="sessionCode" className={input} placeholder="PURP 201" />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-estimatedMinutes">Estimated minutes</label>
                <input id="course-edit-estimatedMinutes" name="estimatedMinutes" type="number" min={5} defaultValue={45} className={input} />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="course-edit-summary">Summary</label>
              <textarea id="course-edit-summary" name="summary" rows={2} className={area} />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-principle">Principle this module develops</label>
              <select id="course-edit-principle" name="principle" defaultValue={""} className={input}>
                <option value="">{"Work it out from the title"}</option>
                {PRINCIPLE_KEYS.map((key) => <option key={key} value={key}>{PRINCIPLE_INFO[key].name} — {PRINCIPLE_INFO[key].question}</option>)}
              </select>
              <p className="mt-1 text-[13px] text-stone-600">Counts toward learners&apos; Purpose Journey for this principle.</p>
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
              <label className={label} htmlFor="course-edit-title">Module title</label>
              <input id="course-edit-title" name="title" defaultValue={settingsModule.title} className={input} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="course-edit-sessionCode">Session code</label>
                <input id="course-edit-sessionCode" name="sessionCode" defaultValue={settingsModule.sessionCode ?? ""} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-estimatedMinutes">Estimated minutes</label>
                <input id="course-edit-estimatedMinutes" name="estimatedMinutes" type="number" min={5} defaultValue={settingsModule.estimatedMinutes} className={input} />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="course-edit-summary">Summary</label>
              <textarea id="course-edit-summary" name="summary" rows={2} defaultValue={settingsModule.summary ?? ""} className={area} />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-principle">Principle this module develops</label>
              <select id="course-edit-principle" name="principle" defaultValue={settingsPrinciple ?? ""} className={input}>
                <option value="">{`Work it out from the title${inferPrinciple(settingsModule.title) ? ` (currently ${PRINCIPLE_INFO[inferPrinciple(settingsModule.title)!].name})` : " (no match)"}`}</option>
                {PRINCIPLE_KEYS.map((key) => <option key={key} value={key}>{PRINCIPLE_INFO[key].name} — {PRINCIPLE_INFO[key].question}</option>)}
              </select>
              <p className="mt-1 text-[13px] text-stone-600">Counts toward learners&apos; Purpose Journey for this principle.</p>
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
                <label className={label} htmlFor="course-edit-title">Lesson title</label>
                <input id="course-edit-title" name="title" defaultValue={editingLesson?.title ?? ""} className={input} required />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-kind">Format</label>
                <select id="course-edit-kind" name="kind" defaultValue={editingLesson?.kind ?? "reading"} className={input}>
                  {["video", "audio", "reading", "illustration", "download", "practice", "live"].map((kind) => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={label} htmlFor="course-edit-summary">Summary</label>
              <input id="course-edit-summary" name="summary" defaultValue={editingLesson?.summary ?? ""} className={input} placeholder="One line shown in the outline" />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-body">Structured content (markdown: ## headings, lists, :::callout)</label>
              <MediaEditor id="course-edit-body" name="body" rows={12} defaultValue={editingLesson?.body ?? ""} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="course-edit-videoUrl">Video URL</label>
                <MediaField id="course-edit-videoUrl" name="videoUrl" kind="video" defaultValue={editingLesson?.videoUrl ?? ""} />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-audioUrl">Audio URL</label>
                <MediaField id="course-edit-audioUrl" name="audioUrl" kind="audio" defaultValue={editingLesson?.audioUrl ?? ""} />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-imageUrl">Illustration URL</label>
                <MediaField id="course-edit-imageUrl" name="imageUrl" kind="image" defaultValue={editingLesson?.imageUrl ?? ""} />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-imageAlt">Image alt text</label>
                <input id="course-edit-imageAlt" name="imageAlt" defaultValue={editingLesson?.imageAlt ?? ""} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-downloadUrl">Download URL</label>
                <MediaField id="course-edit-downloadUrl" name="downloadUrl" kind="document" defaultValue={editingLesson?.downloadUrl ?? ""} />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-downloadLabel">Download label</label>
                <input id="course-edit-downloadLabel" name="downloadLabel" defaultValue={editingLesson?.downloadLabel ?? ""} className={input} />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="course-edit-practicePrompt">Practice prompt</label>
              <textarea id="course-edit-practicePrompt" name="practicePrompt" rows={2} defaultValue={editingLesson?.practicePrompt ?? ""} className={area} />
            </div>
            <div>
              <label className={label} htmlFor="course-edit-transcript">Transcript / teaching notes</label>
              <textarea id="course-edit-transcript" name="transcript" rows={2} defaultValue={editingLesson?.transcript ?? ""} className={area} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label} htmlFor="course-edit-durationMinutes">Minutes</label>
                <input id="course-edit-durationMinutes" name="durationMinutes" type="number" min={1} defaultValue={editingLesson?.durationMinutes ?? 10} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="course-edit-status">Status</label>
                <select id="course-edit-status" name="status" defaultValue={editingLesson?.status ?? "published"} className={input}>
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
