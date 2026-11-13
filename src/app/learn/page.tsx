import { UpcomingEvents } from "@/components/academy/upcoming-events";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  NotebookPen,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { SessionToggle } from "@/components/learn/forms";
import { EmptyState, PageHeader, Progress, Stat } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentWorkspace } from "@/db/academy";
import { getLearnerAnalytics } from "@/db/analytics";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatDateTime, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Student dashboard" };

function ProgressRing({ percent }: { percent: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 110 110" className="h-32 w-32 -rotate-90">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="rgba(18,42,77,0.1)" strokeWidth="9" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#c9a227"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl text-navy">{percent}%</span>
        <span className="text-[9.5px] uppercase tracking-[0.12em] text-stone-500">checklist</span>
      </div>
    </div>
  );
}

export default async function StudentDashboardPage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace || !user) return null;
  const analytics = await getLearnerAnalytics(user.profileId);

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

  return (
    <div className="space-y-6">
      <UpcomingEvents />
      <PageHeader
        eyebrow="Purpose Course Academy"
        title={`Welcome back, ${user.fullName.split(" ")[0]}.`}
        description={
          <>
            {level ? `${level.name} level · ${level.tagline}` : "Enrolment pending"}{enrollment?.cohort ? ` · ${enrollment.cohort}` : ""}
          </>
        }
        meta={
          <>
            <Badge variant={percent >= 80 ? "success" : "gold"} dot>
              {percent}% of your session checklist
            </Badge>
            <Badge variant="muted">{completedInLevel}/{levelSessions.length} self-reported sessions</Badge>
            {upcomingCoaching[0] ? <Badge variant="info" dot>Next coaching booked</Badge> : null}
          </>
        }
        actions={
          <Link
            href="/learn/programme"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-4 text-[12.5px] font-semibold text-paper shadow-sm transition-colors hover:bg-navy-700"
          >
            <BookOpen className="h-4 w-4" /> Open the programme
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="admin-card relative overflow-hidden p-6">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold/10 blur-2xl" aria-hidden />
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing percent={percent} />
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                <Flame className="h-3 w-3 text-gold-dark" /> {completedInLevel} of {levelSessions.length} sessions checked
              </p>
              <p className="mt-3 font-serif text-2xl leading-snug text-navy">
                {nextSession ? nextSession.title : !enrollment ? "Your enrolment is awaiting confirmation." : !levelSessions.length ? "Your programme sessions are not available yet." : "Your session checklist is up to date."}
              </p>
              <p className="mt-1 text-[12px] text-stone-600">
                {nextSession
                  ? `${nextSession.code} · ${nextSession.format} · ${nextSession.durationMinutes} minutes`
                  : "Digital lessons, assessments and faculty review determine your next learning milestone."}
              </p>
              <p className="mt-2 text-xs text-stone-500">Self-reported session attendance is separate from digital lesson progress and certificate requirements.</p>
              {nextSession && enrollment?.status === "enrolled" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <SessionToggle sessionId={nextSession.id} completed={false} />
                  <Link
                    href={`/learn/programme#session-${nextSession.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-navy/15 px-3 text-[11px] font-medium text-navy hover:bg-cream"
                  >
                    Session brief <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="admin-card overflow-hidden p-0">
          <div className="relative">
            <img
              src="/images/mentorship.jpg"
              alt="An educator holding teaching materials in a classroom"
              className="h-28 w-full object-cover object-[center_20%]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
            <p className="absolute bottom-2.5 left-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">
              <UserRound className="h-3.5 w-3.5" /> Your clarity coach
            </p>
          </div>
          <div className="p-5">
          {mentor ? (
            <>
              <p className="mt-2 font-serif text-xl text-navy">{mentor.fullName}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">{mentor.title}</p>
              <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-stone-600">{mentor.bio}</p>
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-stone-600">No mentor assigned yet — request a session to be matched.</p>
          )}
          <div className="mt-3 rounded-lg border border-navy/10 bg-cream/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Next session</p>
            {upcomingCoaching[0] ? (
              <>
                <p className="mt-1 text-[12.5px] font-medium text-navy">{upcomingCoaching[0].title}</p>
                <p className="text-[11px] text-stone-600">{formatDateTime(upcomingCoaching[0].scheduledAt)}</p>
              </>
            ) : (
              <p className="mt-1 text-[11.5px] text-stone-600">Nothing booked.</p>
            )}
            <Link href="/learn/mentor" className="mt-2 inline-flex text-[11px] font-semibold text-gold-dark hover:underline">
              Request or review sessions →
            </Link>
          </div>
          </div>
        </div>
      </div>

      <div className="admin-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
              <Target className="h-3.5 w-3.5 text-gold-dark" /> Digital lesson progress
            </p>
            <p className="text-[10.5px] text-stone-500">Published lessons in the levels where you are enrolled, grouped by module.</p>
          </div>
          <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold text-stone-600">
            {analytics.lessons.completed}/{analytics.lessons.total} lessons · {analytics.lessons.percent}%
          </span>
        </div>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.modules.map((module) => (
            <li key={module.id}>
              <div className="flex items-baseline justify-between gap-1">
                <p className="text-[11.5px] font-semibold text-navy">{module.title}</p>
                <span className="text-[10px] font-semibold text-gold-dark">{module.percent}%</span>
              </div>
              <p className="text-[9px] uppercase tracking-[0.06em] text-stone-400">{module.courseTitle}</p>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-cream">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${module.percent}%` }} />
              </span>
              <p className="mt-0.5 text-[9px] text-stone-500">{module.completed}/{module.total} lessons</p>
            </li>
          ))}
        </ul>
        {!analytics.modules.length ? <p className="mt-3 text-sm text-stone-600">No published lessons are assigned to your current enrolments.</p> : null}
        <p className="mt-3 text-[10.5px] text-stone-500">Assessment change compares your first and latest submissions for the same assessment, question set and pass mark.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-navy/8 pt-2 sm:grid-cols-4">
          {[
            { label: "Comparable score change", value: analytics.assessments.improvement === null ? "—" : `${analytics.assessments.improvement > 0 ? "+" : ""}${analytics.assessments.improvement}` },
            { label: "Average score", value: analytics.assessments.average === null ? "—" : `${analytics.assessments.average}%` },
            { label: "Goal progress", value: `${analytics.goals.averageProgress}%` },
            { label: "Achievements", value: analytics.achievements.length },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-serif text-base text-navy">{stat.value}</p>
              <p className="text-[9px] uppercase tracking-[0.06em] text-stone-500">{stat.label}</p>
            </div>
          ))}
        </div>
        {analytics.achievements.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {analytics.achievements.slice(0, 6).map((achievement) => (
              <span key={achievement.name} className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-medium text-stone-600">
                {achievement.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assignments to do", value: draftAssignments, icon: ClipboardList, tone: "gold" as const, href: "/learn/assignments" },
          { label: "Awaiting review", value: submitted, icon: CalendarClock, tone: "gold" as const, href: "/learn/assignments" },
          { label: "Reviewed with feedback", value: reviewed, icon: CheckCircle2, tone: "source" as const, href: "/learn/assignments" },
          { label: "Reflections written", value: reflections.length, icon: NotebookPen, tone: "purple" as const, href: "/learn/reflections" },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="block rounded-xl transition-transform hover:-translate-y-0.5">
            <Stat label={card.label} value={card.value} icon={card.icon} tone={card.tone} hint="open →" />
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
                <Target className="h-3.5 w-3.5 text-gold-dark" /> Your session checklist
              </p>
              <Link href="/learn/programme" className="text-[11.5px] font-semibold text-navy hover:text-gold-dark">
                All sessions
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {levelSessions.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <span className="w-16 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-gold-dark">
                    {session.code}
                  </span>
                  <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-navy">{session.title}</p>
                  {enrollment?.status === "enrolled" ? <SessionToggle sessionId={session.id} completed={completedIds.has(session.id)} compact /> : null}
                </li>
              ))}
              {levelSessions.length === 0 ? (
                <li className="px-5 py-6 text-[12px] text-stone-500">Your level sessions will appear once enrolment is confirmed.</li>
              ) : null}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
                <ClipboardList className="h-3.5 w-3.5 text-gold-dark" /> Work due
              </p>
              <Link href="/learn/assignments" className="text-[11.5px] font-semibold text-navy hover:text-gold-dark">
                Open assignments
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {assignments.slice(0, 4).map((row) => (
                <li key={row.assignment.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-navy">{row.assignment.title}</p>
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                      {row.submission?.status ?? "not started"}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {row.assignment.dueAt ? `Due ${formatDate(row.assignment.dueAt, "short")}` : "No due date"}
                    {row.assignment.isCollaborative ? " · collaborative" : ""}
                  </p>
                  {row.submission?.feedback ? (
                    <p className="mt-1 rounded-md bg-source/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-stone-700">
                      Mentor: {row.submission.feedback}
                    </p>
                  ) : null}
                </li>
              ))}
              {assignments.length === 0 ? (
                <li className="px-5 py-6 text-[12px] text-stone-500">No assignments set for your level yet.</li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
                <CalendarClock className="h-3.5 w-3.5 text-gold-dark" /> Coaching history
              </p>
              <Link href="/learn/mentor" className="text-[11.5px] font-semibold text-navy hover:text-gold-dark">
                Details
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {coaching.slice(0, 4).map((session) => (
                <li key={session.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-navy">{session.title}</p>
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] uppercase tracking-[0.08em] text-stone-600">
                      {session.status}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-stone-500">{formatDateTime(session.scheduledAt)}</p>
                </li>
              ))}
              {coaching.length === 0 ? <li className="px-5 py-6 text-[12px] text-stone-500">No sessions yet.</li> : null}
            </ul>
          </div>

          {recentCompletion?.mentorNotes ? (
            <div className="rounded-xl border border-[#bcd9db] bg-[#e3eff0]/60 p-4">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#155e63]">
                <Sparkles className="h-3.5 w-3.5" /> Latest coaching note
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-stone-700">{recentCompletion.mentorNotes}</p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-stone-500">
                {formatDateTime(recentCompletion.scheduledAt)}
              </p>
            </div>
          ) : null}

          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
                <NotebookPen className="h-3.5 w-3.5 text-gold-dark" /> Recent reflections
              </p>
              <Link href="/learn/reflections" className="text-[11.5px] font-semibold text-navy hover:text-gold-dark">
                Write
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {reflections.slice(0, 3).map((reflection) => (
                <li key={reflection.id} className="px-5 py-3">
                  <p className="text-[12px] font-medium text-navy">{reflection.prompt}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-600">{reflection.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-stone-400">
                    {relativeTime(reflection.createdAt)} · {reflection.visibility}
                  </p>
                </li>
              ))}
              {reflections.length === 0 ? (
                <li className="px-5 py-6 text-[12px] text-stone-500">Your journal is empty. Start with one honest paragraph.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
