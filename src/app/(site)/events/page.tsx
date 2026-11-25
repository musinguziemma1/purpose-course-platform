import "../desk.css";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Globe2, MonitorPlay, ShieldCheck } from "lucide-react";
import { getEventCalendar } from "@/db/live-events";
import { getSessionUser } from "@/lib/auth";
import { EventCalendar } from "@/components/academy/event-calendar";
import { DeskCalendar } from "@/components/events/desk-calendar";
import { Reveal } from "@/components/motion/reveal";
import { rise } from "@/components/site/public-hero";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Live event calendar",
  description:
    "Upcoming Purpose Course classes, conversations and mentor-led sessions.",
};

const HOW_IT_WORKS = [
  { icon: MonitorPlay, title: "Join from your browser", body: "Camera and microphone in the event room, with no download.", tilt: "-1.6deg" },
  { icon: ShieldCheck, title: "Access follows enrolment", body: "Sessions open to your course, cohort or account.", tilt: "1.1deg" },
  { icon: Globe2, title: "Local times", body: "Each event lists its time zone and length.", tilt: "-0.7deg" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ past?: string }>;
}) {
  const user = await getSessionUser();
  const past = (await searchParams).past === "1";
  const events = (await getEventCalendar(user, { past, limit: 60 })).map((row) => ({
    ...row,
    startsAt: row.startsAt.toISOString(),
  }));
  const live = events.filter((event) => event.status === "live");
  const featured = past ? events[0] : (live[0] ?? events.find((event) => event.status === "scheduled") ?? events[0]);
  const views = [
    { href: "/events", label: "Upcoming and live", current: !past },
    { href: "/events?past=1", label: "Past and cancelled", current: past },
  ];

  return (
    <>
      <section className="dk-felt relative isolate overflow-hidden text-paper">
        <div className="shell grid grid-cols-1 items-center gap-14 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24">
          <div>
            <p className="rise dk-plate" style={rise(0)}>Learn together</p>
            <h1 className="rise display mt-5 text-[2.7rem] sm:text-6xl" style={rise(1)}>
              Live event <span className="dk-foil-dark">calendar</span>
            </h1>
            <p className="rise mt-6 max-w-xl text-[16px] leading-relaxed text-paper/80" style={rise(2)}>
              {user
                ? "Teaching sessions, group discussions and office hours. Open an event to see its details and join when it starts."
                : "Discover teaching sessions, group discussions and office hours. Sign in to join the sessions available to your account."}
            </p>
            <div className="rise mt-8" style={rise(3)}>
              <nav aria-label="Event calendar views" className="dk-switch" data-state={past ? "past" : "upcoming"}>
                <span aria-hidden className="dk-switch-thumb" />
                {views.map((view) => (
                  <Link key={view.href} href={view.href} aria-current={view.current ? "page" : undefined} className="dk-switch-option">
                    {view.label}
                  </Link>
                ))}
              </nav>
            </div>
            {live.length ? (
              <p className="rise mt-6 flex flex-wrap items-center gap-3 text-[14px] text-paper/85" style={rise(4)}>
                <span className="dk-lamp">
                  <span aria-hidden className="dk-lamp-bulb" />
                  On air
                </span>
                {live.length === 1 ? "One session is live right now." : `${live.length} sessions are live right now.`}
              </p>
            ) : null}
          </div>
          <div className="lg:justify-self-end">
            <DeskCalendar session={featured} past={past} />
          </div>
        </div>
      </section>

      <section className="dk-linen py-14 lg:py-20">
        <div className="shell">
          <h2 className="sr-only">{past ? "Past and cancelled events" : "Upcoming and live events"}</h2>
          <EventCalendar key={String(past)} initialEvents={events} past={past} appearance="ticket" />
        </div>
      </section>

      <section className="dk-linen border-t border-[#dccdab] pb-20 pt-14">
        <div className="shell">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Before you join</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-navy">How live sessions work</h2>
          </Reveal>
          <ul className="mt-12 grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, index) => (
              <Reveal as="li" key={item.title} delay={index * 0.07} className="h-full">
                <div className="dk-index" style={{ "--tilt": item.tilt } as CSSProperties}>
                  <span aria-hidden className="dk-pin" />
                  <h3 className="flex items-center gap-2.5 font-serif text-xl text-navy">
                    <item.icon aria-hidden className="h-5 w-5 text-[#8c241c]" />
                    {item.title}
                  </h3>
                  <p className="mt-4 text-[15px] leading-[1.55rem] text-stone-700">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          {!user ? (
            <Reveal className="mt-12 flex flex-wrap items-center gap-3">
              <Link href="/login?next=/events" className="dk-btn" data-variant="brass">Sign in to join</Link>
              <Link href="/signup" className="dk-btn">Apply for a student account</Link>
            </Reveal>
          ) : null}
        </div>
      </section>
    </>
  );
}
