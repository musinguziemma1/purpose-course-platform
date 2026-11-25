import { CalendarClock, CalendarPlus, CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";
import { CompleteSessionForm, ScheduleSessionForm } from "@/components/mentor/forms";
import { getFirstMentorId, getMentorWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { respondToRequest } from "@/app/actions/mentorship";
import {
  DeskCalendar,
  DeskDrawer,
  DeskEmpty,
  DeskHero,
  DeskSheet,
  DeskTag,
  FlapBoard,
  PinnedNote,
  SheetHead,
  rise,
  tilt,
  timeOfDay,
} from "@/components/mentor/desk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Coaching sessions" };

type Row = NonNullable<Awaited<ReturnType<typeof getMentorWorkspace>>>["sessions"][number];

export default async function MentorSessionsPage() {
  const user = await getSessionUser();
  const mentorId = user?.roleSlug === "admin" ? await getFirstMentorId() : user?.profileId ?? "";
  const workspace = mentorId ? await getMentorWorkspace(mentorId) : null;
  if (!workspace) return <DeskHero compact eyebrow="Coaching" title="Sign in with a mentor account." />;

  const scheduled = workspace.sessions.filter((row) => row.session.status === "scheduled");
  const cancelled = workspace.sessions.filter((row) => row.session.status === "cancelled");

  const ledgers: {
    key: string;
    title: string;
    eyebrow: string;
    icon: LucideIcon;
    tone: "teal" | "green" | "navy";
    calendar: "teal" | "green" | "stone";
    rows: Row[];
  }[] = [
    { key: "scheduled", title: "Confirmed & upcoming", eyebrow: "On the calendar", icon: CalendarClock, tone: "teal", calendar: "teal", rows: scheduled },
    { key: "completed", title: "Completed", eyebrow: "Notes shared", icon: CheckCircle2, tone: "green", calendar: "green", rows: workspace.completed },
    { key: "cancelled", title: "Cancelled", eyebrow: "Archive", icon: XCircle, tone: "navy", calendar: "stone", rows: cancelled },
  ];

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        eyebrow="Coaching"
        title="Coaching sessions"
        description="Confirm requests, run the session, then record notes. Students see the notes in their learning record."
        aside={
          <FlapBoard
            label="Session book"
            items={[
              { label: "Requests", value: workspace.requested.length },
              { label: "Upcoming", value: scheduled.length },
              { label: "Completed", value: workspace.completed.length },
            ]}
          />
        }
      />

      <div className="grid gap-7 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-7">
          <section aria-labelledby="requests" className="desk-rise" style={rise(1)}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="desk-enamel" data-tone="gold">
                  <Clock aria-hidden className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Card file</p>
                  <h2 id="requests" className="desk-letterpress font-serif text-[1.3rem] leading-tight">
                    Requests to confirm
                  </h2>
                </div>
              </div>
              <span className="desk-coin" data-empty={workspace.requested.length === 0 ? "" : undefined}>
                {workspace.requested.length}
                <span className="sr-only"> requests</span>
              </span>
            </div>
            {workspace.requested.length === 0 ? (
              <div className="desk-index" data-still="">
                <DeskEmpty>No requests waiting. New requests from mentees land here.</DeskEmpty>
              </div>
            ) : (
              <ul className="grid gap-5 md:grid-cols-2">
                {workspace.requested.map((row, index) => (
                  <li key={row.session.id} className="desk-index" style={tilt(index)}>
                    <span aria-hidden className="desk-clip" />
                    <div className="desk-index-head flex items-start gap-3.5 px-4 pb-3 pt-4">
                      <DeskCalendar date={row.session.scheduledAt} tone="gold" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{row.studentName}</p>
                        <p className="mt-0.5 font-serif text-[16.5px] leading-snug text-navy">{row.session.title}</p>
                        <p className="mt-0.5 text-[13px] text-stone-600">
                          {timeOfDay(row.session.scheduledAt)} · {row.session.durationMinutes} min
                        </p>
                      </div>
                    </div>
                    <div className="px-4 pb-4 pt-2">
                      {row.session.focus ? (
                        <p className="desk-ruled text-[13px] text-stone-700">
                          <span className="font-semibold text-navy">Focus:</span> {row.session.focus}
                        </p>
                      ) : null}
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        <form action={respondToRequest}>
                          <input type="hidden" name="sessionId" value={row.session.id} />
                          <input type="hidden" name="decision" value="accept" />
                          <button type="submit" className="desk-btn" data-variant="teal" data-size="sm">
                            <CheckCircle2 aria-hidden /> Confirm time
                          </button>
                        </form>
                        <form action={respondToRequest}>
                          <input type="hidden" name="sessionId" value={row.session.id} />
                          <input type="hidden" name="decision" value="decline" />
                          <button type="submit" className="desk-btn" data-size="sm">
                            Decline
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {ledgers.map((ledger, ledgerIndex) => (
            <DeskSheet key={ledger.key} className="desk-rise overflow-hidden" style={rise(ledgerIndex + 2)} labelledBy={`sessions-${ledger.key}`}>
              <SheetHead
                id={`sessions-${ledger.key}`}
                eyebrow={ledger.eyebrow}
                title={ledger.title}
                icon={ledger.icon}
                tone={ledger.tone}
                count={ledger.rows.length}
              />
              {ledger.rows.length === 0 ? (
                <DeskEmpty>Nothing here.</DeskEmpty>
              ) : (
                <ul className="divide-y divide-navy/8">
                  {ledger.rows.map((row) => (
                    <li key={row.session.id} className="px-5 py-4">
                      <div className="flex items-start gap-4">
                        <DeskCalendar date={row.session.scheduledAt} tone={ledger.calendar} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className={`font-serif text-[16.5px] leading-snug ${ledger.key === "cancelled" ? "text-stone-500 line-through decoration-stone-400" : "text-navy"}`}>
                              {row.session.title}
                            </p>
                            <DeskTag tone={ledger.key === "completed" ? "green" : ledger.key === "scheduled" ? "teal" : undefined}>{row.session.status}</DeskTag>
                          </div>
                          <p className="mt-0.5 text-[13px] text-stone-600">
                            {row.studentName} · {formatDateTime(row.session.scheduledAt)} · {row.session.durationMinutes} min
                          </p>
                          {row.session.focus ? (
                            <p className="mt-2 rounded-lg bg-cream/70 px-3 py-2 text-[13px] leading-relaxed text-stone-700">
                              <span className="font-semibold text-navy">Focus:</span> {row.session.focus}
                            </p>
                          ) : null}
                          {row.session.status === "completed" && row.session.mentorNotes ? (
                            <div className="desk-essay mt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Shared notes</p>
                              <p className="desk-ruled mt-1 whitespace-pre-line font-serif text-[14px] italic text-stone-800">{row.session.mentorNotes}</p>
                            </div>
                          ) : null}
                          {row.session.status === "scheduled" ? (
                            <CompleteSessionForm sessionId={row.session.id} existingNotes={row.session.mentorNotes} />
                          ) : null}
                          {row.session.status === "completed" ? (
                            <DeskDrawer summary={row.session.mentorNotes ? "Edit shared notes" : "Add shared notes"} className="mt-3">
                              <CompleteSessionForm sessionId={row.session.id} existingNotes={row.session.mentorNotes} />
                            </DeskDrawer>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DeskSheet>
          ))}
        </div>

        <div className="space-y-8 xl:sticky xl:top-24">
          <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="schedule-session">
            <SheetHead id="schedule-session" eyebrow="Booking slip" title="Schedule a session" icon={CalendarPlus} tone="teal" />
            <div className="px-5 pb-5 pt-4">
              <p className="mb-4 text-[13px] text-stone-600">Book a clarity session with anyone on the student directory.</p>
              <ScheduleSessionForm students={workspace.students.map((student) => ({ profileId: student.profileId, fullName: student.fullName }))} />
            </div>
          </DeskSheet>

          <PinnedNote title="Coaching rhythm" tone="teal" angle={-1.2} style={rise(3)}>
            Every clarity session should leave the student with one named gift, one honest gap and one action they can complete before the next meeting.
          </PinnedNote>
        </div>
      </div>
    </div>
  );
}
