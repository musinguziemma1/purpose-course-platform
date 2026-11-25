import Link from "next/link";
import { eventParts, eventTypeLabel } from "@/components/events/event-parts";

/* A ring-bound desk calendar open at one session's date. Styles: app/(site)/desk.css. */

type CalendarSession = {
  id: number;
  title: string;
  type: string;
  status: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
};

export function DeskCalendar({ session, past }: { session?: CalendarSession; past: boolean }) {
  const parts = session
    ? eventParts(session.startsAt, session.durationMinutes, session.timezone)
    : eventParts(new Date(), 0, "Africa/Kampala");
  const kicker = !session ? "Today" : session.status === "live" ? "On air now" : past ? "Most recent session" : "Next session";

  return (
    <div className="dk-cal">
      <span aria-hidden className="dk-cal-under" />
      <span aria-hidden className="dk-cal-under" />
      <div className="dk-cal-page">
        <p className="dk-cal-head">
          <span aria-hidden className="dk-cal-holes" />
          {parts.monthName} {parts.year}
        </p>
        <div className="dk-cal-body">
          <p className="dk-cal-kicker">{kicker}</p>
          {session ? (
            <time dateTime={session.startsAt} className="mt-2 block">
              <span className="dk-type block text-[13px] font-bold uppercase tracking-[0.3em] text-navy/70">{parts.weekday}</span>
              <span className="dk-cal-day mt-1 block">{parts.day}</span>
              <span className="dk-type mt-2 block text-[14px] font-bold text-navy">
                {parts.start}–{parts.end}
              </span>
              <span className="dk-type block text-[12px] text-stone-600">{parts.zone} time</span>
            </time>
          ) : (
            <p className="mt-2">
              <span className="dk-type block text-[13px] font-bold uppercase tracking-[0.3em] text-navy/70">{parts.weekday}</span>
              <span className="dk-cal-day mt-1 block">{parts.day}</span>
            </p>
          )}
          <div className="dk-cal-note">
            {session ? (
              <>
                <p className="dk-type text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#8c241c]">{eventTypeLabel(session.type)}</p>
                <p className="mt-1 font-serif text-lg italic leading-[1.55rem] text-navy">{session.title}</p>
              </>
            ) : (
              <p className="font-serif text-[17px] italic leading-[1.55rem] text-navy">
                No sessions are scheduled yet. New dates appear here as soon as they are published.
              </p>
            )}
          </div>
          {session ? (
            <Link href={`/events/${session.id}`} className="dk-btn mt-5" data-size="sm" data-variant="navy">
              See this session
            </Link>
          ) : null}
        </div>
      </div>
      <div aria-hidden className="dk-rings">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="dk-ring" />
        ))}
      </div>
    </div>
  );
}
