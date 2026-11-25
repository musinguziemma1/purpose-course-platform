import Link from "next/link";
import { ArrowRight, CalendarPlus, History } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getEventCalendar, getEventOptions, getSessionRequests } from "@/db/live-events";
import { EventCalendar } from "@/components/academy/event-calendar";
import { EventForm, RequestReviewForm } from "@/components/academy/event-forms";
import { eventDate } from "@/lib/event-time";
import { DecisionStamp, DeskEmpty, DeskHero, DeskSheet, SheetHead, rise, tilt } from "@/components/mentor/desk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live teaching and requests" };

/* Request statuses are pending | approved | declined | withdrawn (schema check). */
const REQUEST_INK: Record<string, "teal" | "gold" | "green" | "rust" | "stone"> = {
  pending: "gold",
  approved: "green",
  declined: "rust",
  withdrawn: "stone",
};

export default async function MentorLivePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [events, options, requests] = await Promise.all([getEventCalendar(user, { limit: 60 }), getEventOptions(user), getSessionRequests(user)]);
  const mine = requests.filter((row) => row.request.requestedById === user.profileId);

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        eyebrow="Lecture hall"
        title="Live teaching"
        description="See upcoming events across the programme, open your hosted sessions and request a new teaching session from the programme team."
        actions={
          <Link href="/events?past=1" className="desk-btn" data-variant="leather">
            <History aria-hidden /> Past sessions and recordings
          </Link>
        }
      />

      <div className="grid items-start gap-7 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-7">
          <div className="desk-rise" style={rise(1)}>
            <EventCalendar initialEvents={events.map((row) => ({ ...row, startsAt: row.startsAt.toISOString() }))} />
          </div>

          <section aria-labelledby="my-requests" className="desk-rise" style={rise(2)}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Card file</p>
                <h2 id="my-requests" className="desk-letterpress font-serif text-[1.3rem] leading-tight">
                  My session requests
                </h2>
              </div>
              <span className="desk-coin" data-empty={mine.length === 0 ? "" : undefined}>
                {mine.length}
                <span className="sr-only"> requests</span>
              </span>
            </div>
            {mine.length === 0 ? (
              <div className="desk-index" data-still="">
                <DeskEmpty>Your requests and scheduling decisions will appear here.</DeskEmpty>
              </div>
            ) : (
              <ul className="grid gap-5 md:grid-cols-2">
                {mine.map(({ request }, index) => (
                  <li key={request.id} className="desk-index" style={tilt(index)}>
                    <div className="desk-index-head flex items-start justify-between gap-3 px-4 pb-2.5 pt-4">
                      <h3 className="min-w-0 font-serif text-[16.5px] leading-snug text-navy">{request.title}</h3>
                      <DecisionStamp ink={REQUEST_INK[request.status] ?? "teal"} delay={240 + index * 50}>
                        {request.status}
                      </DecisionStamp>
                    </div>
                    <div className="px-4 pb-4 pt-2.5">
                      <p className="text-[13px] text-stone-600">
                        {eventDate(request.startsAt, request.timezone)} · {request.timezone}
                      </p>
                      {request.reviewNote ? (
                        <p className="desk-ruled mt-1 text-[13px] text-stone-700">
                          <span className="font-semibold text-navy">Programme team:</span> {request.reviewNote}
                        </p>
                      ) : null}
                      {request.scheduledSessionId ? (
                        <Link href={"/events/" + request.scheduledSessionId} className="desk-btn mt-3" data-variant="teal" data-size="sm">
                          Open approved session <ArrowRight aria-hidden />
                        </Link>
                      ) : null}
                      {request.status === "pending" ? <RequestReviewForm id={request.id} version={request.updatedAt.toISOString()} own /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="request-session">
          <SheetHead id="request-session" eyebrow="Request slip" title="Request a live session" icon={CalendarPlus} tone="teal" />
          <div className="px-5 pb-5 pt-4">
            <EventForm request options={options} hostId={user.profileId} timezone={user.timezone ?? "Africa/Kampala"} />
          </div>
        </DeskSheet>
      </div>
    </div>
  );
}
