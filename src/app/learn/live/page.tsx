import Link from "next/link";
import { History } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getEventCalendar } from "@/db/live-events";
import { EventCalendar } from "@/components/academy/event-calendar";
import { LearnHero, btn } from "@/components/learn/kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live sessions" };

export default async function StudentLivePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const events = await getEventCalendar(user, { limit: 60 });
  return (
    <div className="space-y-7">
      <LearnHero
        size="md"
        eyebrow="Programme calendar"
        title="Live sessions"
        description="Explore the programme calendar. Your course enrolment and cohort placement determine which teaching rooms and recordings you can open."
        actions={
          <Link href="/events?past=1" className={btn.paper}>
            <History aria-hidden className="h-4 w-4" /> Past sessions and recordings
          </Link>
        }
      />
      <div className="lk-paper p-3 sm:p-5">
        <EventCalendar initialEvents={events.map((row) => ({ ...row, startsAt: row.startsAt.toISOString() }))} />
      </div>
    </div>
  );
}
