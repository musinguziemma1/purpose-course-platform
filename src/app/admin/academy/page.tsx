import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock, ChevronDown, FileAudio, FileText, ImageIcon, Layers, Library, Map as MapIcon, PenLine, Plus, Video } from "lucide-react";
import { db } from "@/db";
import { courseLevels } from "@/db/schema";
import { getAcademyAdminStats, getAcademyTree, getLessonMediaCounts, getLiveSessions } from "@/db/courses";
import { getProgrammeOutlines } from "@/db/programmes";
import { CourseForm, LevelForm } from "@/components/academy/admin-forms";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { getProgrammeLevelPresentation } from "@/lib/programme-stages";
import { GlassMeter, Led } from "@/components/admin/console/instruments";
import { ConsoleHeader, MetricTile, Panel, keyClass, staggerStyle, type DomeTone } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Academy builder" };

export default async function AdminAcademyPage() {
  await requireAdminPage("/admin/academy");
  const user = await getSessionUser();
  const [levels, tree, stats, media, live, programmeOutlines] = await Promise.all([
    db.select().from(courseLevels).orderBy(courseLevels.sortOrder),
    getAcademyTree({ includeDrafts: true }),
    getAcademyAdminStats(),
    getLessonMediaCounts(),
    getLiveSessions({ limit: 4 }),
    getProgrammeOutlines(),
  ]);
  const canAuthor = canAuthorAcademy(user);
  const drafts = programmeOutlines.filter((programme) => programme.status === "draft").length;
  const mediaTotal = Math.max(media.image + media.audio + media.video + media.download, 1);

  const tiles: { label: string; value: number; icon: typeof Layers; tone: DomeTone }[] = [
    { label: "Levels", value: stats.levels, icon: Layers, tone: "navy" },
    { label: "Courses", value: stats.courses, icon: BookOpen, tone: "gold" },
    { label: "Modules", value: stats.modules, icon: Library, tone: "destiny" },
    { label: "Lessons", value: stats.lessons, icon: FileText, tone: "source" },
    { label: "Videos", value: media.video, icon: Video, tone: "potential" },
    { label: "Audio", value: media.audio, icon: FileAudio, tone: "amber" },
    { label: "Live", value: stats.liveSessions, icon: CalendarClock, tone: "rose" },
  ];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Curriculum"
        title="Academy builder"
        description="Levels → courses → modules → lessons. Publish structured content with video, audio, illustrations, downloads and practice in progression mode."
        actions={
          <>
            <Link href="/admin/academy/live" className={keyClass("paper", "sm")}>
              <CalendarClock aria-hidden /> Live sessions
            </Link>
            <Link href="/learn/courses" className={keyClass("navy", "sm")}>
              View as student <ArrowRight aria-hidden />
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {tiles.map((tile) => (
          <MetricTile key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} tone={tile.tone} />
        ))}
      </div>

      <Panel
        title="Programme outlines"
        icon={MapIcon}
        description="Published outlines follow Foundation, Intermediate and Advanced by level order, while keeping each programme’s focus and modules. This does not publish learner-facing lessons."
        action={
          <span className="ui-badge inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">
            <Led tone={drafts ? "amber" : "green"} /> {drafts} drafts
          </span>
        }
        bodyClassName="p-4 sm:p-5"
      >
        <div className="k-stagger grid gap-3 md:grid-cols-2 md:items-start">
          {programmeOutlines.map((programme, index) => (
            <details key={programme.id} style={staggerStyle(index)} className="k-drawer group rounded-2xl border border-navy/10 bg-paper shadow-[inset_0_1px_0_#fff,0_2px_6px_-3px_rgba(10,26,48,0.2)]">
              <summary className="flex cursor-pointer items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-serif text-[17px] text-navy">{programme.name}</p>
                  <p className="mt-1 text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                    {programme.duration} · {programme.structure}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="ui-badge rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-amber-900">{programme.status}</span>
                  <ChevronDown aria-hidden className="h-4 w-4 text-stone-500 transition-transform duration-300 group-open:rotate-180" />
                </span>
              </summary>
              <div className="k-drawer-body border-t border-navy/10 px-4 pb-4 pt-3">
                <p className="text-[13px] leading-relaxed text-stone-700">{programme.description}</p>
                <div className="mt-3 space-y-3">
                  {programme.levels.map((level, levelIndex) => {
                    const { stage, focus } = getProgrammeLevelPresentation(level.name, levelIndex);
                    return (
                      <div key={level.id} className="rounded-xl bg-cream/60 p-3 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold-dark">
                          Level {levelIndex + 1} · {stage}
                        </p>
                        <p className="mt-0.5 text-[13px] font-semibold text-navy">{focus}</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12.5px] leading-relaxed text-stone-700">
                          {level.modules.map((module) => (
                            <li key={module.id}>{module.title}</li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
                {canAuthor ? (
                  <Link href={`/admin/academy/programmes/${programme.id}`} className={keyClass("navy", "sm", "mt-4")}>
                    <PenLine aria-hidden /> Edit outline
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
          {programmeOutlines.length === 0 ? <p className="text-[13px] text-stone-600">No programme outline records are available.</p> : null}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="space-y-5">
          {levels.map((level) => {
            const levelCourses = tree.filter((course) => course.levelId === level.id);
            const lessonCount = levelCourses.reduce((sum, course) => sum + course.modules.reduce((m, module) => m + module.lessons.length, 0), 0);
            return (
              <section key={level.id} className="admin-card overflow-hidden">
                <div className="k-panel-head">
                  <span className="k-well font-serif text-[15px] font-semibold text-navy">{level.levelNumber}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-[18px] text-navy">{level.name}</h2>
                    <p className="text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                      {level.tagline} · {level.weeks} weeks · {levelCourses.length} courses
                    </p>
                  </div>
                  <span className="ui-badge rounded-full border border-navy/10 bg-paper px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-700">{lessonCount} lessons</span>
                </div>
                <ul className="divide-y divide-navy/8">
                  {levelCourses.map((course) => (
                    <li key={course.id}>
                      <Link href={`/admin/academy/courses/${course.id}`} className="group flex flex-wrap items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-cream/60">
                        {course.coverImageUrl ? (
                          <img src={course.coverImageUrl} alt="" className="h-11 w-16 shrink-0 rounded-md object-cover shadow-[0_0_0_2px_#fffdf8,0_0_0_3px_rgba(18,42,77,0.12),0_4px_8px_-4px_rgba(10,26,48,0.5)]" loading="lazy" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-navy">
                            <Led tone={course.status === "published" ? "green" : "off"} />
                            {course.title}
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600">{course.status}</span>
                            {course.isSequential ? <span className="text-[11px] uppercase tracking-[0.08em] text-stone-500">· progression</span> : null}
                          </p>
                          <p className="line-clamp-1 text-[12.5px] text-stone-600">{course.summary}</p>
                        </div>
                        <span className="text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                          {course.modules.length} modules · {course.modules.reduce((sum, module) => sum + module.lessons.length, 0)} lessons
                        </span>
                        <ArrowRight aria-hidden className="h-4 w-4 text-stone-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-gold-dark" />
                      </Link>
                    </li>
                  ))}
                  {levelCourses.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No courses in this level yet.</li> : null}
                </ul>
              </section>
            );
          })}

          <Panel
            title="Next live sessions"
            icon={CalendarClock}
            action={
              <Link href="/admin/academy/live" className={keyClass("paper", "sm")}>
                Manage <ArrowRight aria-hidden />
              </Link>
            }
          >
            <ul className="divide-y divide-navy/8">
              {live.map((row) => (
                <li key={row.session.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Led tone="blue" />
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-navy">{row.session.title}</p>
                  <span className="text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                    {row.session.type.replace("_", " ")} · {formatDateTime(row.session.startsAt)}
                  </span>
                </li>
              ))}
              {live.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No sessions scheduled.</li> : null}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          {canAuthor ? (
            <>
              <Panel title="Create a level" icon={Plus} riveted bodyClassName="px-5 pb-6 pt-4">
                <LevelForm />
              </Panel>
              <Panel title="Create a course" icon={BookOpen} riveted description="Courses start as drafts — publish when the curriculum is ready." bodyClassName="px-5 pb-6 pt-4">
                <CourseForm levels={levels.map((level) => ({ id: level.id, name: `${level.levelNumber}. ${level.name}` }))} />
              </Panel>
            </>
          ) : (
            <div className="admin-card p-5 text-[13.5px] text-stone-700">Only administrators can create levels and courses. Editors can review the published curriculum.</div>
          )}
          <Panel title="Media coverage" icon={ImageIcon} bodyClassName="px-5 py-4">
            <ul className="space-y-3">
              {[
                { icon: ImageIcon, label: "illustrated lessons", value: media.image, tone: "gold" as const },
                { icon: FileAudio, label: "audio teachings", value: media.audio, tone: "amber" as const },
                { icon: Video, label: "video lessons", value: media.video, tone: "potential" as const },
                { icon: FileText, label: "downloadable worksheets", value: media.download, tone: "destiny" as const },
              ].map((row, index) => (
                <li key={row.label} className="grid grid-cols-[1fr_5rem] items-center gap-3">
                  <span className="inline-flex items-center gap-2 text-[13px] text-stone-700">
                    <row.icon aria-hidden className="h-4 w-4 text-gold-dark" />
                    <span className="numeric font-semibold text-navy">{row.value}</span> {row.label}
                  </span>
                  <GlassMeter value={row.value} max={mediaTotal} tone={row.tone} size="sm" index={index} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
