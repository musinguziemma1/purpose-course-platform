import Link from "next/link";
import { getEventCalendar } from "@/db/live-events";
import { getSessionUser } from "@/lib/auth";
import { EventCalendar } from "@/components/academy/event-calendar";
export async function UpcomingEvents() {
  const rows = await getEventCalendar(await getSessionUser(), { limit: 3 });
  return (
    <section className="my-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-navy">Upcoming live events</h2>
        <Link
          href="/events"
          className="text-sm font-semibold text-gold-dark underline underline-offset-4"
        >
          View event calendar
        </Link>
      </div>
      <EventCalendar
        initialEvents={rows.map((row) => ({
          ...row,
          startsAt: row.startsAt.toISOString(),
        }))}
        compact
      />
    </section>
  );
}
