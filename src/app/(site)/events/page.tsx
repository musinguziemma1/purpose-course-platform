import Link from "next/link";
import { CalendarClock, Globe2, MonitorPlay, ShieldCheck } from "lucide-react";
import { getEventCalendar } from "@/db/live-events";
import { getSessionUser } from "@/lib/auth";
import { EventCalendar } from "@/components/academy/event-calendar";
import { PublicHero } from "@/components/site/public-hero";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Live event calendar",
  description:
    "Upcoming Purpose Course classes, conversations and mentor-led sessions.",
};

const HOW_IT_WORKS = [
  { icon: MonitorPlay, title: "Join from your browser", body: "Camera and microphone in the event room, with no download." },
  { icon: ShieldCheck, title: "Access follows enrolment", body: "Sessions open to your course, cohort or account." },
  { icon: Globe2, title: "Local times", body: "Each event lists its time zone and length." },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ past?: string }>;
}) {
  const user = await getSessionUser();
  const past = (await searchParams).past === "1",
    events = await getEventCalendar(user, {
      past,
      limit: 60,
    });
  const views = [
    { href: "/events", label: "Upcoming and live", current: !past },
    { href: "/events?past=1", label: "Past and cancelled", current: past },
  ];

  return (
    <>
      <PublicHero
        image="/images/online-learning.jpg"
        eyebrow="Learn together"
        title={
          <>
            Live event <span className="text-sheen">calendar</span>
          </>
        }
        description={
          user
            ? "Teaching sessions, group discussions and office hours. Open an event to see its details and join when it starts."
            : "Discover teaching sessions, group discussions and office hours. Sign in to join the sessions available to your account."
        }
        actions={
          <nav aria-label="Event calendar views" className="glass-dark inline-flex rounded-full p-1">
            {views.map((view) => (
              <Link
                key={view.href}
                href={view.href}
                aria-current={view.current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-full px-5 text-sm font-medium transition-colors duration-200",
                  view.current ? "bg-paper text-navy shadow-sm" : "text-paper/80 hover:bg-white/10 hover:text-paper",
                )}
              >
                {view.label}
              </Link>
            ))}
          </nav>
        }
        aside={
          <div className="glass-dark rounded-3xl p-6 sm:p-7">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              <CalendarClock className="h-4 w-4" /> How live sessions work
            </p>
            <ul className="mt-5 space-y-4">
              {HOW_IT_WORKS.map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium text-paper">{item.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-paper/65">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!user ? (
              <Link
                href="/login?next=/events"
                className="mt-6 inline-flex h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-ink transition-[background-color,transform] duration-150 hover:bg-gold-soft active:scale-[0.97]"
              >
                Sign in to join
              </Link>
            ) : null}
          </div>
        }
      />
      <section className="mesh-light py-12 lg:py-16">
        <div className="shell">
          <h2 className="sr-only">{past ? "Past and cancelled events" : "Upcoming and live events"}</h2>
          <EventCalendar
            key={String(past)}
            initialEvents={events.map((row) => ({
              ...row,
              startsAt: row.startsAt.toISOString(),
            }))}
            past={past}
          />
        </div>
      </section>
    </>
  );
}
