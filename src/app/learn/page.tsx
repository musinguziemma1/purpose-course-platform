import { UpcomingEvents } from "@/components/academy/upcoming-events";
import { AnnouncementsStrip } from "@/components/site/announcements-strip";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Compass,
  Flame,
  ListChecks,
  NotebookPen,
  PenLine,
  PlayCircle,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { SessionToggle } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getLearnerAnalytics } from "@/db/analytics";
import { getPurposeJourney } from "@/db/purpose-journey";
import { NextSteps, PrincipleProgress } from "@/components/learn/purpose-journey-view";
import {
  BrassDial,
  Chip,
  Coin,
  Groove,
  LeatherChip,
  LearnHero,
  Panel,
  StatPlaque,
  StickyNote,
  Ticket,
  btn,
  statusTone,
} from "@/components/learn/kit";
import { getSessionUser } from "@/lib/auth";
import { cn, formatDate, formatDateTime, initials, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Student dashboard" };

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace || !user) return null;
  const [analytics, journey] = await Promise.all([getLearnerAnalytics(user.profileId), getPurposeJourney(user.profileId, user)]);

  const {
    enrollment,
    level,
    levelSessions,
    completedIds,
    completedInLevel,
    percent,
    nextSession,
    upcomingCoaching,
    coaching,
    assignments,
    reflections,
    mentor,
  } = workspace;

  const submitted = assignments.filter((row) => row.submission?.status === "submitted").length;
  const reviewed = assignments.filter((row) => row.submission?.status === "reviewed").length;
  const draftAssignments = assignments.filter((row) => !row.submission || row.submission.status === "draft").length;
  const recentCompletion = coaching.find((item) => item.status === "completed" && item.mentorNotes);
  const nextCoaching = upcomingCoaching[0];

  return (
    <div className="space-y-7">
      <LearnHero
        eyebrow="Purpose Course Academy"
        title={`Welcome back, ${user.fullName.split(" ")[0]}.`}
        description={
          <>
            {level ? `${level.name} level · ${level.tagline}` : "Enrolment pending"}
            {enrollment?.cohort ? ` · ${enrollment.cohort}` : ""}
          </>
        }
        meta={
          <>
            <LeatherChip icon={Target}>{percent}% of your session checklist</LeatherChip>
            <LeatherChip icon={ListChecks}>
              {completedInLevel}/{levelSessions.length} self-reported sessions
            </LeatherChip>
            {nextCoaching ? <LeatherChip icon={CalendarClock}>Next coaching booked</LeatherChip> : null}
          </>
        }
        actions={
          <>
            <Link href="/learn/programme" className={btn.brass}>
              <BookOpen aria-hidden className="h-4 w-4" /> Open the programme
            </Link>
            <Link href="/learn/courses" className={btn.paper}>
              <PlayCircle aria-hidden className="h-4 w-4" /> Digital lessons
            </Link>
          </>
        }
        aside={
          <>
            <BrassDial
              value={analytics.lessons.percent}
              label="Digital lesson progress"
              caption={`${analytics.lessons.completed}/${analytics.lessons.total} lessons`}
            />
            {journey ? <BrassDial value={journey.overall} label="Overall development" caption="Purpose journey" size={118} /> : null}
          </>
        }
      />

      <AnnouncementsStrip />

      {journey ? (
        <section aria-label="Purpose Journey" className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <Panel title="My Purpose Journey" kicker="Identity → Source → Purpose → Potential → Destiny" icon={Compass}>
            <PrincipleProgress principles={journey.principles} variant="learn" />
            <Link href="/learn/journey" className="lk-link mt-5">
              See what shapes each principle <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Panel>
          <Panel title="Recommended for you" icon={Sparkles}>
            <p className="text-[13px] text-stone-600">Next steps chosen from where you have the most room to grow.</p>
            <div className="mt-4">
              <NextSteps items={journey.recommendations} variant="learn" />
            </div>
          </Panel>
        </section>
      ) : null}

      <UpcomingEvents />

      <section aria-label="Sessions and coaching" className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Your next session" kicker={`${completedInLevel} of ${levelSessions.length} sessions checked`} icon={Flame} stacked>
          {nextSession ? (
            <Ticket
              stub={
                <>
                  <span className="lk-kicker">Session</span>
                  <span className="mt-1 break-all font-serif text-[1.3rem] leading-tight text-navy">{nextSession.code}</span>
                </>
              }
            >
              <p className="font-serif text-[1.35rem] leading-snug text-navy">{nextSession.title}</p>
              <p className="mt-1 text-[13px] text-stone-600">
                {nextSession.format} · {nextSession.durationMinutes} minutes
              </p>
            </Ticket>
          ) : (
            <p className="font-serif text-[1.35rem] leading-snug text-navy">
              {!enrollment
                ? "Your enrolment is awaiting confirmation."
                : !levelSessions.length
                  ? "Your programme sessions are not available yet."
                  : "Your session checklist is up to date."}
            </p>
          )}
          {!nextSession ? (
            <p className="mt-2 text-[14px] text-stone-600">Digital lessons, assessments and faculty review determine your next learning milestone.</p>
          ) : null}
          <div className="mt-5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-stone-600">Session checklist</span>
              <span className="font-semibold tabular-nums text-navy">{percent}%</span>
            </div>
            <Groove value={percent} label="Session checklist" />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-stone-600">
            Self-reported session attendance is separate from digital lesson progress and certificate requirements.
          </p>
          {nextSession && enrollment?.status === "enrolled" ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
              <SessionToggle sessionId={nextSession.id} completed={false} />
              <Link href={`/learn/programme#session-${nextSession.id}`} className={cn(btn.paper, btn.sm)}>
                Session brief <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}
        </Panel>

        <section className="lk-paper overflow-hidden" aria-labelledby="coach-heading">
          <div className="relative h-28">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative header photograph */}
            <img
              src="/images/mentorship.jpg"
              alt="An educator holding teaching materials in a classroom"
              className="h-full w-full object-cover object-[center_20%]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
            <p className="absolute bottom-3 left-5 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e6c867]">
              <UserRound aria-hidden className="h-3.5 w-3.5" /> Your clarity coach
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3.5">
              <Coin tone="navy" className="h-12 w-12 text-[15px]">
                {mentor ? initials(mentor.fullName) : "PC"}
              </Coin>
              <div className="min-w-0">
                <h2 id="coach-heading" className="font-serif text-[1.25rem] leading-snug text-navy">
                  {mentor ? mentor.fullName : "Not matched yet"}
                </h2>
                {mentor ? <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">{mentor.title}</p> : null}
              </div>
            </div>
            {mentor ? (
              <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-stone-600">{mentor.bio}</p>
            ) : (
              <p className="mt-3 text-[14px] text-stone-600">No mentor assigned yet — request a session to be matched.</p>
            )}
            <div className="mt-4">
              {nextCoaching ? (
                <Ticket date={nextCoaching.scheduledAt}>
                  <p className="lk-kicker">Next session</p>
                  <p className="mt-0.5 text-[14px] font-semibold text-navy">{nextCoaching.title}</p>
                  <p className="text-[13px] text-stone-600">{formatDateTime(nextCoaching.scheduledAt)}</p>
                </Ticket>
              ) : (
                <div className="lk-well px-4 py-3">
                  <p className="lk-kicker">Next session</p>
                  <p className="mt-0.5 text-[14px] text-stone-600">Nothing booked.</p>
                </div>
              )}
            </div>
            <Link href="/learn/mentor" className="lk-link mt-3">
              Request or review sessions <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </section>

      <section aria-label="Your work at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatPlaque label="Assignments to do" value={draftAssignments} icon={ClipboardList} href="/learn/assignments" hint="Open assignments →" />
        <StatPlaque label="Awaiting review" value={submitted} icon={CalendarClock} href="/learn/assignments" hint="Open assignments →" />
        <StatPlaque label="Reviewed with feedback" value={reviewed} icon={CheckCircle2} href="/learn/assignments" hint="Read the feedback →" />
        <StatPlaque label="Reflections written" value={reflections.length} icon={NotebookPen} href="/learn/reflections" hint="Open your journal →" />
      </section>

      <Panel
        title="Digital lesson progress"
        kicker="By module"
        icon={Target}
        action={
          <Chip tone="gold">
            {analytics.lessons.completed}/{analytics.lessons.total} lessons · {analytics.lessons.percent}%
          </Chip>
        }
      >
        <p className="-mt-1 mb-5 text-[13px] text-stone-600">Published lessons in the levels where you are enrolled, grouped by module.</p>
        {analytics.modules.length ? (
          <ul className="grid gap-x-7 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.modules.map((module, index) => (
              <li key={module.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[14px] font-semibold text-navy">{module.title}</p>
                  <span className="text-[13px] font-semibold tabular-nums text-[#7a5d0d]">{module.percent}%</span>
                </div>
                <p className="text-[12px] text-stone-600">{module.courseTitle}</p>
                <Groove value={module.percent} label={`${module.title} progress`} size="sm" index={Math.min(index, 8)} className="mt-2" />
                <p className="mt-1 text-[12px] text-stone-600">
                  {module.completed}/{module.total} lessons
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-stone-600">No published lessons are assigned to your current enrolments.</p>
        )}
        <dl className="lk-well mt-6 grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          {[
            {
              label: "Comparable score change",
              value:
                analytics.assessments.improvement === null
                  ? "—"
                  : `${analytics.assessments.improvement > 0 ? "+" : ""}${analytics.assessments.improvement}`,
            },
            { label: "Average score", value: analytics.assessments.average === null ? "—" : `${analytics.assessments.average}%` },
            { label: "Goal progress", value: `${analytics.goals.averageProgress}%` },
            { label: "Achievements", value: analytics.achievements.length },
          ].map((stat) => (
            <div key={stat.label}>
              <dd className="lk-emboss font-serif text-[1.5rem] leading-none tabular-nums">{stat.value}</dd>
              <dt className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-600">{stat.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-stone-600">
          Assessment change compares your first and latest submissions for the same assessment, question set and pass mark.
        </p>
        {analytics.achievements.length > 0 ? (
          <ul aria-label="Achievements" className="mt-4 flex flex-wrap gap-2">
            {analytics.achievements.slice(0, 6).map((achievement) => (
              <li key={achievement.name}>
                <Chip tone="gold" icon={Award}>
                  {achievement.name}
                </Chip>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="space-y-5">
          <Panel
            title="Your session checklist"
            icon={ListChecks}
            action={
              <Link href="/learn/programme" className="lk-link">
                All sessions
              </Link>
            }
            bodyClassName="px-3 pb-3 pt-2 sm:px-4"
          >
            <ul className="lk-ledger">
              {levelSessions.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                  <span className="w-16 shrink-0 text-[12px] font-bold uppercase tracking-[0.1em] text-[#7a5d0d]">{session.code}</span>
                  <p className="min-w-0 flex-1 text-[14px] leading-snug text-navy">{session.title}</p>
                  {enrollment?.status === "enrolled" ? (
                    <SessionToggle sessionId={session.id} completed={completedIds.has(session.id)} compact />
                  ) : null}
                </li>
              ))}
              {levelSessions.length === 0 ? (
                <li className="px-2 py-6 text-[14px] text-stone-600">Your level sessions will appear once enrolment is confirmed.</li>
              ) : null}
            </ul>
          </Panel>

          <Panel
            title="Work due"
            icon={ClipboardList}
            action={
              <Link href="/learn/assignments" className="lk-link">
                Open assignments
              </Link>
            }
            bodyClassName="px-3 pb-4 pt-2 sm:px-4"
          >
            <ul className="lk-ledger">
              {assignments.slice(0, 4).map((row) => (
                <li key={row.assignment.id} className="px-2 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-medium text-navy">{row.assignment.title}</p>
                    <Chip tone={statusTone(row.submission?.status)}>{row.submission?.status ?? "not started"}</Chip>
                  </div>
                  <p className="mt-0.5 text-[13px] text-stone-600">
                    {row.assignment.dueAt ? `Due ${formatDate(row.assignment.dueAt, "short")}` : "No due date"}
                    {row.assignment.isCollaborative ? " · collaborative" : ""}
                  </p>
                  {row.submission?.feedback ? (
                    <StickyNote from="Mentor" className="mt-3" tilt="right">
                      {row.submission.feedback}
                    </StickyNote>
                  ) : null}
                </li>
              ))}
              {assignments.length === 0 ? <li className="px-2 py-6 text-[14px] text-stone-600">No assignments set for your level yet.</li> : null}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            title="Coaching history"
            icon={CalendarClock}
            action={
              <Link href="/learn/mentor" className="lk-link">
                Details
              </Link>
            }
            bodyClassName="px-3 pb-3 pt-2 sm:px-4"
          >
            <ul className="lk-ledger">
              {coaching.slice(0, 4).map((session) => (
                <li key={session.id} className="px-2 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-medium text-navy">{session.title}</p>
                    <Chip tone={statusTone(session.status)}>{session.status}</Chip>
                  </div>
                  <p className="text-[13px] text-stone-600">{formatDateTime(session.scheduledAt)}</p>
                </li>
              ))}
              {coaching.length === 0 ? <li className="px-2 py-6 text-[14px] text-stone-600">No sessions yet.</li> : null}
            </ul>
          </Panel>

          {recentCompletion?.mentorNotes ? (
            <StickyNote from="Latest coaching note" meta={formatDateTime(recentCompletion.scheduledAt)}>
              {recentCompletion.mentorNotes}
            </StickyNote>
          ) : null}

          <section aria-labelledby="journal-heading" className="lk-notebook py-5 pr-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="journal-heading" className="font-serif text-[1.2rem] text-navy">
                Recent reflections
              </h2>
              <Link href="/learn/reflections" className="lk-link">
                <PenLine aria-hidden className="h-4 w-4" /> Write
              </Link>
            </div>
            <ul className="mt-3 space-y-4">
              {reflections.slice(0, 3).map((reflection) => (
                <li key={reflection.id}>
                  <p className="font-serif text-[15px] text-navy">{reflection.prompt}</p>
                  <p className="lk-lined line-clamp-2 text-[14px] text-stone-700">{reflection.body}</p>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.1em] text-stone-600">
                    {relativeTime(reflection.createdAt)} · {reflection.visibility}
                  </p>
                </li>
              ))}
              {reflections.length === 0 ? (
                <li className="lk-lined text-[14px] text-stone-600">Your journal is empty. Start with one honest paragraph.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
