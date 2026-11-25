import { CalendarCheck2, CalendarPlus, CheckCircle2, History, UserRound } from "lucide-react";
import { CoachingRequestForm } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, initials } from "@/lib/utils";
import { Chip, Coin, LearnHero, Panel, StickyNote, Ticket, statusTone } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "My mentor" };

export default async function StudentMentorPage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  const { mentor, coaching, upcomingCoaching } = workspace;
  const next = upcomingCoaching[0];

  return (
    <div className="space-y-7">
      <LearnHero
        eyebrow="Your clarity coach"
        title="Mentorship & coaching"
        description="Clarity sessions are part of the Intermediate level. Bring work, not admiration."
        aside={
          // The coach's card, resting on the leather.
          <div className="lk-paper w-full max-w-sm -rotate-1 p-5 text-ink sm:w-80">
            <div className="flex items-start gap-3.5">
              <Coin tone="navy" className="h-14 w-14 text-lg">
                {mentor ? initials(mentor.fullName) : "PC"}
              </Coin>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 lk-kicker">
                  <UserRound aria-hidden className="h-3.5 w-3.5" /> Clarity coach
                </p>
                <p className="mt-1 font-serif text-[1.3rem] leading-snug text-navy">{mentor?.fullName ?? "Matching in progress"}</p>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">{mentor?.title ?? "Purpose Course faculty"}</p>
              </div>
            </div>
            {mentor?.bio ? <p className="mt-3 line-clamp-4 text-[14px] leading-relaxed text-stone-600">{mentor.bio}</p> : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="space-y-6">
          {next ? (
            <section aria-labelledby="next-session-heading">
              <h2 id="next-session-heading" className="mb-3 inline-flex items-center gap-2 lk-kicker">
                <CalendarCheck2 aria-hidden className="h-4 w-4" /> Next confirmed session
              </h2>
              <Ticket date={next.scheduledAt}>
                <p className="font-serif text-[1.3rem] leading-snug text-navy">{next.title}</p>
                <p className="mt-1 text-[14px] text-stone-600">
                  {formatDateTime(next.scheduledAt)} · {next.durationMinutes} minutes
                </p>
              </Ticket>
            </section>
          ) : null}

          <Panel title="Session history & notes" icon={History} bodyClassName="px-3 pb-4 pt-2 sm:px-4">
            <ul className="lk-ledger">
              {coaching.length === 0 ? (
                <li className="px-2 py-8 text-center text-[14px] text-stone-600">No sessions yet — request your first one.</li>
              ) : (
                coaching.map((session) => (
                  <li key={session.id} className="px-2 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-serif text-[1.05rem] text-navy">{session.title}</p>
                        <p className="text-[13px] text-stone-600">
                          {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min
                        </p>
                      </div>
                      <Chip tone={statusTone(session.status)}>{session.status}</Chip>
                    </div>
                    {session.focus ? <p className="mt-2 text-[14px] leading-relaxed text-stone-600">Focus: {session.focus}</p> : null}
                    {session.mentorNotes ? (
                      <StickyNote from="Mentor notes" className="mt-3 max-w-xl" tilt={session.id % 2 ? "right" : "left"}>
                        {session.mentorNotes}
                      </StickyNote>
                    ) : session.status === "completed" ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-stone-600">
                        <CheckCircle2 aria-hidden className="h-4 w-4 text-source" /> Completed — notes will appear here shortly.
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </Panel>
        </div>

        <Panel title="Request a session" icon={CalendarPlus} stacked className="xl:sticky xl:top-24">
          <p className="-mt-1 mb-4 text-[14px] text-stone-600">Your mentor confirms the time, or proposes an alternative.</p>
          <CoachingRequestForm />
        </Panel>
      </div>
    </div>
  );
}
