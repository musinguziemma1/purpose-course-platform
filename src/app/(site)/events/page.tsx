import Link from "next/link";
import { getEventCalendar } from "@/db/live-events";
import { getSessionUser } from "@/lib/auth";
import { EventCalendar } from "@/components/academy/event-calendar";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Live event calendar",
  description:
    "Upcoming Purpose Course classes, conversations and mentor-led sessions.",
};
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ past?: string }>;
}) {
  const past = (await searchParams).past === "1",
    events = await getEventCalendar(await getSessionUser(), {
      past,
      limit: 60,
    });
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
        Learn together
      </p>
      <h1 className="mt-3 font-serif text-4xl text-navy sm:text-5xl">
        Live event calendar
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600">
        Discover teaching sessions, group discussions and office hours. Sign in
        to join the sessions available to your account.
      </p>
      <nav aria-label="Event calendar views" className="my-7 flex gap-3">
        <Link
          href="/events"
          aria-current={!past ? "page" : undefined}
          className="rounded-full border border-navy/20 px-4 py-2 text-sm text-navy"
        >
          Upcoming and live
        </Link>
        <Link
          href="/events?past=1"
          aria-current={past ? "page" : undefined}
          className="rounded-full border border-navy/20 px-4 py-2 text-sm text-navy"
        >
          Past and cancelled
        </Link>
      </nav>
      <EventCalendar
        key={String(past)}
        initialEvents={events.map((row) => ({
          ...row,
          startsAt: row.startsAt.toISOString(),
        }))}
        past={past}
      />
    </div>
  );
}
