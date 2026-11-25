import Link from "next/link";
import { getEventCalendar } from "@/db/live-events";
import { getSessionUser } from "@/lib/auth";
import { EventCalendar } from "@/components/academy/event-calendar";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading, SectionLink } from "@/components/site/section-heading";

/** The next three live events the viewer can see. `public` adds the editorial heading used on marketing pages. */
export async function UpcomingEvents({ variant = "workspace" }: { variant?: "workspace" | "public" }) {
  const rows = await getEventCalendar(await getSessionUser(), { limit: 3 });
  const calendar = (
    <EventCalendar
      initialEvents={rows.map((row) => ({
        ...row,
        startsAt: row.startsAt.toISOString(),
      }))}
      compact
    />
  );

  if (variant === "public") {
    return (
      <div>
        <SectionHeading
          eyebrow="Live sessions"
          title="Learn together, in real time."
          description="Teaching sessions, round tables and office hours run in the browser. Sign in to join the sessions open to your account."
          action={<SectionLink href="/events">Full event calendar</SectionLink>}
        />
        <Reveal className="mt-10">{calendar}</Reveal>
      </div>
    );
  }

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
      {calendar}
    </section>
  );
}
