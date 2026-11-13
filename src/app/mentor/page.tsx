import { UpcomingEvents } from "@/components/academy/upcoming-events";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MessageSquareQuote,
  Users,
} from "lucide-react";
import { getFirstMentorId, getMentorWorkspace, getProgressForStudents } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { respondToRequest } from "@/app/actions/mentorship";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Stat } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mentor overview" };

export default async function MentorOverviewPage() {
  const user = await getSessionUser();
  const mentorId = user?.roleSlug === "admin" ? await getFirstMentorId() : user?.profileId ?? "";
  const workspace = mentorId ? await getMentorWorkspace(mentorId) : null;

  if (!workspace) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="font-serif text-xl text-navy">Mentor workspace is being prepared.</p>
        <p className="mt-2 text-sm text-stone-600">Sign in with mentor@purposecourse.org to explore this desk.</p>
      </div>
    );
  }

  const progress = await getProgressForStudents(workspace.mentees.map((mentee) => mentee.studentId));
  const cards = [
    { label: "Active mentees", value: workspace.stats.mentees, icon: Users, tone: "teal" as const },
    { label: "Upcoming sessions", value: workspace.stats.upcoming, icon: CalendarClock, tone: "gold" as const },
    { label: "Requests to confirm", value: workspace.stats.requested, icon: Clock, tone: "gold" as const },
    { label: "Awaiting review", value: workspace.stats.awaitingReview, icon: ClipboardCheck, tone: "purple" as const },
  ];

  return (
    <div className="space-y-6">
      <UpcomingEvents />
      <PageHeader
        eyebrow={<span className="text-[#155e63]">Mentorship workspace</span>}
        title="Walk with your mentees, not above them."
        description={`${workspace.stats.mentees} mentees · ${workspace.stats.completed} completed sessions · clarity notes stored in each student's learning record.`}
        meta={
          <>
            <Badge variant="success" dot>{workspace.stats.upcoming} upcoming</Badge>
            <Badge variant="warning">{workspace.stats.awaitingReview} to review</Badge>
            <Badge variant="muted">{workspace.stats.completed} completed</Badge>
          </>
        }
        actions={
          <Link
            href="/mentor/sessions"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#155e63] px-4 text-[12.5px] font-semibold text-paper transition-colors hover:bg-[#124a4e]"
          >
            <CalendarClock className="h-4 w-4" /> Coaching sessions
          </Link>
        }
      />

      <div className="relative overflow-hidden rounded-xl border border-navy/10">
        <img
          src="/images/mentorship.jpg"
          alt="An educator holding teaching materials in a classroom"
          className="h-28 w-full object-cover object-[center_20%]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Mentor desk</p>
          <p className="font-serif text-lg text-paper">Clarity sessions, assignment feedback and mentee progress</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Stat key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Next sessions</p>
                <p className="text-[11px] text-stone-500">Clarity sessions, story labs and follow-ups.</p>
              </div>
              <Link href="/mentor/sessions" className="text-[11.5px] font-semibold text-[#155e63] hover:underline">
                All sessions
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {workspace.upcoming.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-stone-500">
                  No confirmed sessions. Confirm a request or schedule a follow-up.
                </li>
              ) : (
                workspace.upcoming.slice(0, 4).map((row) => (
                  <li key={row.session.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-serif text-[15px] text-navy">{row.session.title}</p>
                      <span className="rounded-full bg-[#e3eff0] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#155e63]">
                        {formatDateTime(row.session.scheduledAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-stone-500">
                      {row.studentName} · {row.session.durationMinutes} min ·{" "}
                      {row.session.status === "requested" ? "awaiting your confirmation" : "confirmed"}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Requests to confirm</p>
              <span className="text-[11px] text-stone-500">{workspace.requested.length}</span>
            </div>
            <ul className="divide-y divide-navy/8">
              {workspace.requested.length === 0 ? (
                <li className="px-5 py-6 text-[12.5px] text-stone-500">No open requests.</li>
              ) : (
                workspace.requested.map((row) => (
                  <li key={row.session.id} className="px-5 py-3.5">
                    <p className="font-serif text-[15px] text-navy">{row.session.title}</p>
                    <p className="text-[11.5px] text-stone-500">
                      {row.studentName} · requested for {formatDateTime(row.session.scheduledAt)}
                    </p>
                    {row.session.focus ? (
                      <p className="mt-1 rounded-md bg-cream/70 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-600">
                        {row.session.focus}
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <form action={respondToRequest}>
                        <input type="hidden" name="sessionId" value={row.session.id} />
                        <input type="hidden" name="decision" value="accept" />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-[#155e63] px-3 text-[11px] font-semibold text-paper hover:bg-[#124a4e]"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Confirm
                        </button>
                      </form>
                      <form action={respondToRequest}>
                        <input type="hidden" name="sessionId" value={row.session.id} />
                        <input type="hidden" name="decision" value="decline" />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center rounded-full border border-navy/15 px-3 text-[11px] font-medium text-navy hover:bg-cream"
                        >
                          Propose another time
                        </button>
                      </form>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Awaiting your review</p>
              <Link href="/mentor/submissions" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#155e63]">
                Open queue <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y divide-navy/8">
              {workspace.awaitingReview.length === 0 ? (
                <li className="px-5 py-6 text-[12.5px] text-stone-500">Everything reviewed. Good stewardship.</li>
              ) : (
                workspace.awaitingReview.slice(0, 4).map((row) => (
                  <li key={row.submission.id} className="px-5 py-3">
                    <p className="text-[12.5px] font-medium text-navy">{row.assignment.title}</p>
                    <p className="text-[11px] text-stone-500">
                      {row.studentName} · submitted {row.submission.submittedAt ? relativeTime(row.submission.submittedAt) : "—"}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Mentee progress</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {workspace.mentees.map((mentee) => {
                const stats = progress.get(mentee.studentId);
                const percent = stats && stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                return (
                  <li key={mentee.studentId} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-medium text-navy">{mentee.studentName}</p>
                      <span className="text-[10.5px] text-stone-500">{stats?.level ?? "—"}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                        <span className="block h-full rounded-full bg-[#155e63]" style={{ width: `${percent}%` }} />
                      </span>
                      <span className="text-[10.5px] font-semibold text-[#155e63]">{percent}%</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-stone-400">
                      {stats?.completed ?? 0}/{stats?.total ?? 0} sessions · {mentee.sessions} coaching sessions
                    </p>
                  </li>
                );
              })}
              {workspace.mentees.length === 0 ? (
                <li className="px-5 py-6 text-[12.5px] text-stone-500">No mentees yet.</li>
              ) : null}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3.5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
                <MessageSquareQuote className="h-3.5 w-3.5 text-[#155e63]" /> Reflections shared with you
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {workspace.reflections.length === 0 ? (
                <li className="px-5 py-6 text-[12.5px] text-stone-500">No reflections shared yet.</li>
              ) : (
                workspace.reflections.slice(0, 5).map((row) => (
                  <li key={row.reflection.id} className="px-5 py-3">
                    <p className="text-[12px] font-medium text-navy">{row.reflection.prompt}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-stone-600">{row.reflection.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-stone-400">
                      {row.authorName} · {relativeTime(row.reflection.createdAt)} · {row.reflection.visibility}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
