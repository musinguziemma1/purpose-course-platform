import Link from "next/link";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
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
    <>
    <section className="relative isolate overflow-hidden border-b border-navy/10 bg-ink text-paper">
      <HeroBackdrop src="/images/hero-workshop.jpg" tone="dark" />
      <div className="shell relative py-14 lg:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
        Learn together
      </p>
      <h1 className="mt-3 font-serif text-4xl text-paper sm:text-5xl">
        Live event calendar
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/85">
        Discover teaching sessions, group discussions and office hours. Sign in
        to join the sessions available to your account.
      </p>
      <nav aria-label="Event calendar views" className="my-7 flex gap-3">
        <Link
          href="/events"
          aria-current={!past ? "page" : undefined}
          className="rounded-full border border-white/40 bg-ink/40 px-4 py-2 text-sm text-paper hover:bg-white/15"
        >
          Upcoming and live
        </Link>
        <Link
          href="/events?past=1"
          aria-current={past ? "page" : undefined}
          className="rounded-full border border-white/40 bg-ink/40 px-4 py-2 text-sm text-paper hover:bg-white/15"
        >
          Past and cancelled
        </Link>
      </nav>
      </div>
    </section>
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <EventCalendar
        key={String(past)}
        initialEvents={events.map((row) => ({
          ...row,
          startsAt: row.startsAt.toISOString(),
        }))}
        past={past}
      />
    </div>
    </>
  );
}
