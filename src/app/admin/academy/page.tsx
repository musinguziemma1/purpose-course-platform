import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock, FileAudio, FileText, ImageIcon, Layers, Library, Plus, Video } from "lucide-react";
import { db } from "@/db";
import { courseLevels } from "@/db/schema";
import { getAcademyAdminStats, getAcademyTree, getLessonMediaCounts, getLiveSessions } from "@/db/courses";
import { CourseForm, LevelForm } from "@/components/academy/admin-forms";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { formatDateTime, STATUS_META } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Academy builder" };

export default async function AdminAcademyPage() {
  await requireAdminPage("/admin/academy");
  const user = await getSessionUser();
  const [levels, tree, stats, media, live] = await Promise.all([
    db.select().from(courseLevels).orderBy(courseLevels.sortOrder),
    getAcademyTree({ includeDrafts: true }),
    getAcademyAdminStats(),
    getLessonMediaCounts(),
    getLiveSessions({ limit: 4 }),
  ]);
  const canAuthor = canAuthorAcademy(user);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Academy builder</h1>
          <p className="text-[12.5px] text-stone-600">
            Levels → courses → modules → lessons. Publish structured content with video, audio, illustrations,
            downloads and practice in progression mode.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/academy/live"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-3.5 text-[11.5px] font-medium text-navy hover:bg-cream"
          >
            <CalendarClock className="h-3.5 w-3.5" /> Live sessions
          </Link>
          <Link
            href="/learn/courses"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3.5 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
          >
            <ArrowRight className="h-3.5 w-3.5" /> View as student
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Levels", value: stats.levels, icon: Layers },
          { label: "Courses", value: stats.courses, icon: BookOpen },
          { label: "Modules", value: stats.modules, icon: Library },
          { label: "Lessons", value: stats.lessons, icon: FileText },
          { label: "Videos", value: media.video, icon: Video },
          { label: "Audio", value: media.audio, icon: FileAudio },
          { label: "Live", value: stats.liveSessions, icon: CalendarClock },
        ].map((card) => (
          <div key={card.label} className="admin-card p-3.5">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="space-y-5">
          {levels.map((level) => {
            const levelCourses = tree.filter((course) => course.levelId === level.id);
            return (
              <div key={level.id} className="admin-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/10 bg-cream/40 px-5 py-3">
                  <div>
                    <p className="font-serif text-[16px] text-navy">
                      {level.levelNumber}. {level.name}
                    </p>
                    <p className="text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
                      {level.tagline} · {level.weeks} weeks · {levelCourses.length} courses
                    </p>
                  </div>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                    {levelCourses.reduce((sum, course) => sum + course.modules.reduce((m, module) => m + module.lessons.length, 0), 0)} lessons
                  </span>
                </div>
                <ul className="divide-y divide-navy/8">
                  {levelCourses.map((course) => (
                    <li key={course.id}>
                      <Link href={`/admin/academy/courses/${course.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-cream/40">
                        {course.coverImageUrl ? (
                          <img
                            src={course.coverImageUrl}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-navy">
                            {course.title}
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                                STATUS_META[course.status === "published" ? "published" : "draft"].tone
                              }`}
                            >
                              {course.status}
                            </span>
                            {course.isSequential ? <span className="text-[9px] uppercase tracking-[0.08em] text-stone-400">progression</span> : null}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-stone-500">{course.summary}</p>
                        </div>
                        <span className="text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
                          {course.modules.length} modules · {course.modules.reduce((sum, module) => sum + module.lessons.length, 0)} lessons
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-stone-300" />
                      </Link>
                    </li>
                  ))}
                  {levelCourses.length === 0 ? (
                    <li className="px-5 py-4 text-[11.5px] text-stone-500">No courses in this level yet.</li>
                  ) : null}
                </ul>
              </div>
            );
          })}

          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Next live sessions</p>
              <Link href="/admin/academy/live" className="text-[11px] font-semibold text-gold-dark hover:underline">
                Manage →
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {live.map((row) => (
                <li key={row.session.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-[12px] text-navy">{row.session.title}</p>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                    {row.session.type.replace("_", " ")} · {formatDateTime(row.session.startsAt)}
                  </span>
                </li>
              ))}
              {live.length === 0 ? <li className="px-5 py-3 text-[11.5px] text-stone-500">No sessions scheduled.</li> : null}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {canAuthor ? (
            <>
              <div className="admin-card p-5">
                <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                  <Plus className="h-3.5 w-3.5 text-gold-dark" /> Create a level
                </p>
                <div className="mt-3">
                  <LevelForm />
                </div>
              </div>
              <div className="admin-card p-5">
                <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                  <BookOpen className="h-3.5 w-3.5 text-gold-dark" /> Create a course
                </p>
                <p className="mt-0.5 text-[11px] text-stone-500">Courses start as drafts — publish when the curriculum is ready.</p>
                <div className="mt-3">
                  <CourseForm levels={levels.map((level) => ({ id: level.id, name: `${level.levelNumber}. ${level.name}` }))} />
                </div>
              </div>
            </>
          ) : (
            <div className="admin-card p-5 text-[12px] text-stone-600">
              Only administrators can create levels and courses. Editors can review the published curriculum.
            </div>
          )}
          <div className="rounded-xl border border-navy/10 bg-paper p-4 text-[11.5px] leading-relaxed text-stone-600">
            <p className="font-semibold text-navy">Media coverage</p>
            <ul className="mt-1.5 space-y-1">
              <li className="inline-flex items-center gap-1.5"><ImageIcon className="h-3 w-3 text-gold-dark" /> {media.image} illustrated lessons</li>
              <li className="inline-flex items-center gap-1.5"><FileAudio className="h-3 w-3 text-gold-dark" /> {media.audio} audio teachings</li>
              <li className="inline-flex items-center gap-1.5"><Video className="h-3 w-3 text-gold-dark" /> {media.video} video lessons</li>
              <li className="inline-flex items-center gap-1.5"><FileText className="h-3 w-3 text-gold-dark" /> {media.download} downloadable worksheets</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
