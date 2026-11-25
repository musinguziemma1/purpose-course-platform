import { UpcomingEvents } from "@/components/academy/upcoming-events";
import { AnnouncementsStrip } from "@/components/site/announcements-strip";
import { CoverImage } from "@/components/site/cover-image";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, Inbox, MessageSquareQuote, Users } from "lucide-react";
import Link from "next/link";
import { getFirstMentorId, getMentorWorkspace, getProgressForStudents } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { respondToRequest } from "@/app/actions/mentorship";
import {
  DeskCalendar,
  DeskEmpty,
  DeskHero,
  DeskSheet,
  DeskTag,
  FlapBoard,
  GrooveMeter,
  InTray,
  LeatherChip,
  Seal,
  SheetHead,
  SheetLink,
  rise,
  tilt,
  timeOfDay,
} from "@/components/mentor/desk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mentor overview" };

export default async function MentorOverviewPage() {
  const user = await getSessionUser();
  const mentorId = user?.roleSlug === "admin" ? await getFirstMentorId() : user?.profileId ?? "";
  const workspace = mentorId ? await getMentorWorkspace(mentorId) : null;

  if (!workspace) {
    return (
      <DeskHero
        eyebrow="Mentor desk"
        title="Your mentor workspace is being prepared."
        description="Sign in with mentor@purposecourse.org to explore this desk."
      />
    );
  }

  const progress = await getProgressForStudents(workspace.mentees.map((mentee) => mentee.studentId));
  const firstName = user?.fullName.split(" ")[0];

  return (
    <div className="space-y-7">
      <DeskHero
        eyebrow="Mentorship workspace"
        title={
          <>
            Walk with your mentees, <em className="desk-foil">not above them.</em>
          </>
        }
        description={`${firstName ? `Welcome back, ${firstName}. ` : ""}${workspace.stats.mentees} mentees · ${workspace.stats.completed} completed sessions · clarity notes stored in each student's learning record.`}
        meta={
          <>
            <LeatherChip tone="green">{workspace.stats.upcoming} upcoming</LeatherChip>
            <LeatherChip tone="gold">{workspace.stats.awaitingReview} to review</LeatherChip>
            <LeatherChip>{workspace.stats.completed} completed</LeatherChip>
          </>
        }
        actions={
          <>
            <Link href="/mentor/sessions" className="desk-btn" data-variant="brass">
              <CalendarClock aria-hidden /> Coaching sessions
            </Link>
            <Link href="/mentor/submissions" className="desk-btn" data-variant="leather">
              <Inbox aria-hidden /> Review queue
            </Link>
          </>
        }
        aside={
          <FlapBoard
            label="Today on the desk"
            items={[
              { label: "Mentees", value: workspace.stats.mentees, href: "/mentor/learners" },
              { label: "Upcoming", value: workspace.stats.upcoming, href: "/mentor/sessions" },
              { label: "Requests", value: workspace.stats.requested, href: "/mentor/sessions" },
              { label: "To review", value: workspace.stats.awaitingReview, href: "/mentor/submissions" },
            ]}
          />
        }
      />

      <div className="desk-rise space-y-6" style={rise(1)}>
        <AnnouncementsStrip />
        <UpcomingEvents />
      </div>

      <div className="grid gap-7 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-7">
          {/* Next sessions: a row of desk-calendar pages */}
          <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="next-sessions">
            <SheetHead
              id="next-sessions"
              eyebrow="Calendar"
              title="Next sessions"
              icon={CalendarClock}
              count={workspace.upcoming.length}
              action={<SheetLink href="/mentor/sessions">All sessions</SheetLink>}
            />
            {workspace.upcoming.length === 0 ? (
              <DeskEmpty>No confirmed sessions. Confirm a request or schedule a follow-up.</DeskEmpty>
            ) : (
              <ul className="divide-y divide-navy/8">
                {workspace.upcoming.slice(0, 4).map((row) => {
                  const pending = row.session.status === "requested";
                  return (
                    <li key={row.session.id} className="flex items-center gap-4 px-5 py-4">
                      <DeskCalendar date={row.session.scheduledAt} tone={pending ? "gold" : "teal"} />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-[16.5px] leading-snug text-navy">{row.session.title}</p>
                        <p className="mt-0.5 text-[13px] text-stone-600">
                          {row.studentName} · {timeOfDay(row.session.scheduledAt)} · {row.session.durationMinutes} min
                        </p>
                      </div>
                      <DeskTag tone={pending ? "amber" : "teal"} className="hidden sm:inline-flex">
                        {pending ? "Awaiting you" : "Confirmed"}
                      </DeskTag>
                    </li>
                  );
                })}
              </ul>
            )}
          </DeskSheet>

          {/* Requests: index cards waiting for a decision */}
          <section aria-labelledby="requests" className="desk-rise" style={rise(3)}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Card file</p>
                <h2 id="requests" className="desk-letterpress font-serif text-[1.3rem] leading-tight">
                  Requests to confirm
                </h2>
              </div>
              <span className="desk-coin" data-empty={workspace.requested.length === 0 ? "" : undefined}>
                {workspace.requested.length}
                <span className="sr-only"> requests</span>
              </span>
            </div>
            {workspace.requested.length === 0 ? (
              <div className="desk-index" data-still="">
                <DeskEmpty>No open requests. The card file is empty.</DeskEmpty>
              </div>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2">
                {workspace.requested.map((row, index) => (
                  <li key={row.session.id} className="desk-index" style={tilt(index)}>
                    <span aria-hidden className="desk-clip" />
                    <div className="desk-index-head px-4 pb-2 pt-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{row.studentName}</p>
                      <p className="mt-0.5 font-serif text-[16.5px] leading-snug text-navy">{row.session.title}</p>
                    </div>
                    <div className="px-4 pb-4 pt-2">
                      <p className="text-[13px] text-stone-600">Requested for {formatDateTime(row.session.scheduledAt)}</p>
                      {row.session.focus ? <p className="desk-ruled mt-1 text-[13px] text-stone-700">{row.session.focus}</p> : null}
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        <form action={respondToRequest}>
                          <input type="hidden" name="sessionId" value={row.session.id} />
                          <input type="hidden" name="decision" value="accept" />
                          <button type="submit" className="desk-btn" data-variant="teal" data-size="sm">
                            <CheckCircle2 aria-hidden /> Confirm
                          </button>
                        </form>
                        <form action={respondToRequest}>
                          <input type="hidden" name="sessionId" value={row.session.id} />
                          <input type="hidden" name="decision" value="decline" />
                          <button type="submit" className="desk-btn" data-size="sm">
                            Propose another time
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Review queue: an in-tray that thickens as work arrives */}
          <InTray count={workspace.awaitingReview.length} className="desk-rise" style={rise(4)}>
            <DeskSheet className="overflow-hidden" labelledBy="awaiting-review">
              <SheetHead
                id="awaiting-review"
                eyebrow="In-tray"
                title="Awaiting your review"
                icon={ClipboardCheck}
                tone="gold"
                count={workspace.awaitingReview.length}
                action={
                  <SheetLink href="/mentor/submissions">
                    Open queue <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </SheetLink>
                }
              />
              {workspace.awaitingReview.length === 0 ? (
                <DeskEmpty>Everything reviewed. Good stewardship.</DeskEmpty>
              ) : (
                <ul className="divide-y divide-navy/8">
                  {workspace.awaitingReview.slice(0, 4).map((row) => (
                    <li key={row.submission.id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <Seal name={row.studentName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-navy">{row.assignment.title}</p>
                        <p className="text-[12.5px] text-stone-600">
                          {row.studentName} · submitted {row.submission.submittedAt ? relativeTime(row.submission.submittedAt) : "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DeskSheet>
          </InTray>
        </div>

        <div className="space-y-7">
          <div className="desk-rise hidden pt-2 xl:block" style={rise(2)}>
            <figure className="desk-polaroid mx-auto w-[min(100%,22rem)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <CoverImage src="/images/mentorship.jpg" alt="An educator holding teaching materials in a classroom" sizes="22rem" />
              </div>
              <figcaption>Clarity sessions, feedback &amp; mentee progress</figcaption>
            </figure>
          </div>

          <DeskSheet className="desk-rise overflow-hidden" style={rise(3)} labelledBy="mentee-progress">
            <SheetHead id="mentee-progress" eyebrow="Caseload" title="Mentee progress" icon={Users} tone="navy" count={workspace.mentees.length} />
            {workspace.mentees.length === 0 ? (
              <DeskEmpty>No mentees yet.</DeskEmpty>
            ) : (
              <ul className="divide-y divide-navy/8">
                {workspace.mentees.map((mentee, index) => {
                  const stats = progress.get(mentee.studentId);
                  const percent = stats && stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                  return (
                    <li key={mentee.studentId} className="flex items-center gap-3.5 px-5 py-3.5">
                      <Seal name={mentee.studentName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[14px] font-medium text-navy">{mentee.studentName}</p>
                          <span className="numeric text-[12.5px] font-semibold text-destiny">{percent}%</span>
                        </div>
                        <GrooveMeter value={percent} label={`${mentee.studentName}: ${percent}% of sessions complete`} className="mt-1.5" delay={220 + index * 40} />
                        <p className="mt-1 text-[12px] text-stone-500">
                          {stats?.level ?? "No level yet"} · {stats?.completed ?? 0}/{stats?.total ?? 0} sessions · {mentee.sessions} coaching
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </DeskSheet>

          <section aria-labelledby="reflections" className="desk-rise" style={rise(4)}>
            <div className="mb-4 flex items-center gap-3">
              <span className="desk-enamel" data-tone="plum">
                <MessageSquareQuote aria-hidden className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Letters</p>
                <h2 id="reflections" className="desk-letterpress font-serif text-[1.15rem] leading-tight">
                  Reflections shared with you
                </h2>
              </div>
            </div>
            {workspace.reflections.length === 0 ? (
              <div className="desk-letter">
                <DeskEmpty>No reflections shared yet.</DeskEmpty>
              </div>
            ) : (
              <ul className="space-y-5">
                {workspace.reflections.slice(0, 5).map((row, index) => (
                  <li key={row.reflection.id} className="desk-letter px-4 pb-3.5 pt-4" style={tilt(index, 0.6)}>
                    <p className="font-serif text-[15px] leading-snug text-navy">{row.reflection.prompt}</p>
                    <p className="mt-1.5 line-clamp-3 font-serif text-[14px] italic leading-relaxed text-stone-700">“{row.reflection.body}”</p>
                    <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                      {row.authorName} · {relativeTime(row.reflection.createdAt)} · {row.reflection.visibility}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
