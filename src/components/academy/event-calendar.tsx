"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, Radio, Users } from "lucide-react";
import { eventDate } from "@/lib/event-time";
export type CalendarEvent = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  hostName: string | null;
  courseTitle: string | null;
  cohortName: string | null;
  canJoin: boolean;
  myRsvp: boolean;
};
export function EventCalendar({
  initialEvents,
  past = false,
  compact = false,
  manage = false,
}: {
  initialEvents: CalendarEvent[];
  past?: boolean;
  compact?: boolean;
  manage?: boolean;
}) {
  const [events, setEvents] = useState(initialEvents),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch(
          `/api/events?past=${past ? "1" : "0"}&limit=${compact ? 3 : 60}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok)
          throw Error(
            "The calendar could not refresh. Your last loaded events are shown.",
          );
        const data = await response.json();
        if (active) {
          setEvents(data.events);
          setError("");
        }
      } catch (e) {
        if (active && !controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Calendar unavailable.");
      }
    }
    const interval = setInterval(() => void refresh(), 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [past, compact]);
  const visible = compact ? events.slice(0, 3) : events;
  return (
    <div className="space-y-3">
      {error ? (
        <p role="status" className="text-xs text-amber-800">
          {error}
        </p>
      ) : null}
      <div
        className={`grid gap-4 ${compact ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
      >
        {visible.map((event) => (
          <article
            key={event.id}
            className="flex min-w-0 flex-col rounded-xl border border-navy/15 bg-paper p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider">
              <span className="text-gold-dark">
                {event.type.replaceAll("_", " ")}
              </span>
              <span
                className={
                  event.status === "live" ? "text-source" : "text-stone-500"
                }
              >
                {event.status === "live" ? (
                  <Radio className="mr-1 inline h-3 w-3" />
                ) : null}
                {event.status}
              </span>
            </div>
            <h3 className="mt-2 break-words font-serif text-xl text-navy">
              <Link href={`/events/${event.id}`} className="hover:underline">
                {event.title}
              </Link>
            </h3>
            <p className="mt-2 flex items-start gap-2 text-sm text-stone-600">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {eventDate(event.startsAt, event.timezone)}
                <span className="block text-xs">
                  {event.timezone} · {event.durationMinutes} minutes
                </span>
              </span>
            </p>
            <p className="mt-2 text-xs text-stone-500">
              {event.hostName ?? "Purpose Course faculty"}
            </p>
            {!compact ? (
              <>
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-stone-600">
                  {event.description}
                </p>
                <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                  <Users className="h-3.5 w-3.5" />
                  {event.cohortName ??
                    event.courseTitle ??
                    "All account holders"}
                </p>
              </>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/events/${event.id}`}
                className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-paper"
              >
                {event.canJoin && ["scheduled", "live"].includes(event.status)
                  ? "Open session"
                  : "Event details"}
              </Link>
              {manage && event.status === "scheduled" ? (
                <Link
                  href={`/admin/academy/live?edit=${event.id}`}
                  className="text-xs font-semibold text-gold-dark underline"
                >
                  Edit schedule
                </Link>
              ) : null}
              {event.myRsvp ? (
                <span className="text-xs font-semibold text-source">
                  You’re going
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!visible.length ? (
        <div className="rounded-xl border border-dashed border-navy/20 p-8 text-center">
          <CalendarClock className="mx-auto h-7 w-7 text-gold-dark" />
          <p className="mt-3 font-serif text-xl text-navy">
            {past
              ? "No past events to show"
              : "The next live event will appear here"}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            New schedules and changes refresh automatically. Join access follows
            course enrolment and cohort membership.
          </p>
        </div>
      ) : null}
    </div>
  );
}
