"use client";

import Link from "next/link";
import { CalendarClock, Coffee, MessagesSquare, Presentation, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { CalendarEvent } from "@/components/academy/event-calendar";
import { Reveal } from "@/components/motion/reveal";
import { eventParts, eventTypeLabel, type EventParts } from "@/components/events/event-parts";

/* Rendered by <EventCalendar appearance="ticket">; styles live in app/(site)/desk.css. */

const TYPE_ICONS: Record<string, LucideIcon> = {
  class: Presentation,
  group_work: UsersRound,
  discussion: MessagesSquare,
  office_hours: Coffee,
};

function StatusMark({ status }: { status: string }) {
  if (status === "live")
    return (
      <span className="dk-lamp">
        <span aria-hidden className="dk-lamp-bulb" />
        On air
      </span>
    );
  if (status === "cancelled") return <span className="dk-stamp" data-ink="rust">Cancelled</span>;
  if (status === "ended") return <span className="dk-stamp" data-ink="stone">Ended</span>;
  return <span className="dk-stamp">Scheduled</span>;
}

function EventTicket({ event, parts, manage }: { event: CalendarEvent; parts: EventParts; manage: boolean }) {
  const Icon = TYPE_ICONS[event.type] ?? Presentation;
  const joinable = event.canJoin && ["scheduled", "live"].includes(event.status);
  const titleId = `event-${event.id}-title`;
  return (
    <div className="dk-ticket-lift">
      <article className="dk-ticket" data-tone={event.type} data-status={event.status} aria-labelledby={titleId}>
        <div className="dk-ticket-body flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="dk-chip">
              <Icon aria-hidden className="h-3.5 w-3.5" />
              {eventTypeLabel(event.type)}
            </span>
            <StatusMark status={event.status} />
          </div>
          <h4 id={titleId} className="mt-3.5 break-words font-serif text-xl leading-snug text-navy sm:text-[1.4rem]">
            <Link href={`/events/${event.id}`} className="decoration-gold decoration-2 underline-offset-4 hover:underline">
              {event.title}
            </Link>
          </h4>
          <p className="mt-1.5 text-[13px] text-stone-600">Hosted by {event.hostName ?? "Purpose Course faculty"}</p>
          {event.description ? (
            <p className="mt-3 line-clamp-3 whitespace-pre-line break-words text-[14px] leading-relaxed text-stone-600">{event.description}</p>
          ) : null}
          <p className="dk-type mt-3 flex items-start gap-2 text-[12px] text-stone-600">
            <Users aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
            {event.cohortName ?? event.courseTitle ?? "All account holders"}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
            <Link href={`/events/${event.id}`} className="dk-btn" data-size="sm" data-variant={joinable ? "navy" : undefined}>
              {joinable ? "Open session" : "Event details"}
            </Link>
            {manage && event.status === "scheduled" ? (
              <Link href={`/admin/academy/live?edit=${event.id}`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-gold-dark underline underline-offset-4">
                Edit schedule
              </Link>
            ) : null}
            {event.myRsvp ? <span className="dk-stamp" data-ink="gold">You’re going</span> : null}
          </div>
        </div>
        <div className="dk-stub">
          <time dateTime={event.startsAt} className="flex flex-col items-center">
            <span className="sr-only">
              {parts.weekday} {parts.day} {parts.monthName} {parts.year}, {parts.start} to {parts.end}, {parts.zone} time
            </span>
            <span aria-hidden className="dk-stub-weekday">{parts.weekday.slice(0, 3)}</span>
            <span aria-hidden className="dk-stub-day">{parts.day}</span>
            <span aria-hidden className="dk-stub-month">{parts.monthName.slice(0, 3)}</span>
            <span aria-hidden className="dk-stub-time">{parts.start}</span>
            <span aria-hidden className="dk-stub-length">{event.durationMinutes} min</span>
          </time>
          <span aria-hidden className="dk-barcode" />
        </div>
      </article>
    </div>
  );
}

export function EventTicketBoard({
  events,
  past,
  manage,
  error,
}: {
  events: CalendarEvent[];
  past: boolean;
  manage: boolean;
  error: string;
}) {
  const months: { key: string; label: string; items: { event: CalendarEvent; parts: EventParts }[] }[] = [];
  for (const event of events) {
    const parts = eventParts(event.startsAt, event.durationMinutes, event.timezone);
    let month = months.at(-1);
    if (!month || month.key !== parts.monthKey) {
      month = { key: parts.monthKey, label: `${parts.monthName} ${parts.year}`, items: [] };
      months.push(month);
    }
    month.items.push({ event, parts });
  }

  return (
    <div className="space-y-12">
      {error ? (
        <p role="status" className="dk-type rounded-lg bg-[#fbeee0] px-4 py-3 text-[13px] text-[#7a3a12]">
          {error}
        </p>
      ) : null}
      {months.map((month) => (
        <section key={month.key} aria-labelledby={`month-${month.key}`}>
          <div className="dk-month">
            <h3 id={`month-${month.key}`} className="dk-plate">{month.label}</h3>
            <span aria-hidden className="dk-month-rule" />
          </div>
          <ol className="mt-7 grid gap-6 lg:grid-cols-2">
            {month.items.map(({ event, parts }, index) => (
              <Reveal as="li" key={event.id} delay={Math.min(index * 0.06, 0.3)} className="h-full">
                <EventTicket event={event} parts={parts} manage={manage} />
              </Reveal>
            ))}
          </ol>
        </section>
      ))}
      {!events.length ? (
        <div className="dk-ticket-empty">
          <CalendarClock aria-hidden className="mx-auto h-8 w-8 text-gold-dark" />
          <p className="mt-3 font-serif text-2xl text-navy">{past ? "No past events to show" : "The next live event will appear here"}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
            New schedules and changes refresh automatically. Join access follows course enrolment and cohort membership.
          </p>
        </div>
      ) : null}
    </div>
  );
}
