import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowRight, CalendarPlus, Inbox, RadioTower } from "lucide-react";
import { db } from "@/db";
import { liveSessions } from "@/db/schema";
import {
  canScheduleEvents,
  getEventCalendar,
  getEventOptions,
  getSessionRequests,
} from "@/db/live-events";
import { EventCalendar } from "@/components/academy/event-calendar";
import {
  EventForm,
  RequestReviewForm,
} from "@/components/academy/event-forms";
import { eventDate } from "@/lib/event-time";
import { nativeConferenceAvailable } from "@/lib/conference-config";
import { requireAdminPage } from "@/lib/page-access";
import { Led } from "@/components/admin/console/instruments";
import { Caption, ConsoleHeader, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live session scheduling" };

export default async function AdminLivePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireAdminPage("/admin/academy/live");
  if (!canScheduleEvents(user)) notFound();

  const params = await searchParams;
  const editId = Number(params.edit) || 0;
  const [events, options, requests, editing] = await Promise.all([
    getEventCalendar(user, { limit: 60 }),
    getEventOptions(user),
    getSessionRequests(user),
    editId
      ? db
          .select()
          .from(liveSessions)
          .where(eq(liveSessions.id, editId))
          .limit(1)
      : [],
  ]);
  const session = editing[0];
  const nativeAvailable = nativeConferenceAvailable();
  if (editId && (!session || session.status !== "scheduled")) notFound();

  return (
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/academy", label: "Academy builder" }}
        eyebrow="Live programme"
        title="Live sessions"
        description="Schedule once for the shared event calendar, account notifications and public event pages. Course and cohort restrictions protect room access, agendas and recordings."
        meta={
          <span className="inline-flex items-center gap-2 text-[13px] text-stone-700">
            <Led tone={nativeAvailable ? "green" : "amber"} pulse={!nativeAvailable} />
            {nativeAvailable ? "In-platform conference relay ready" : "Conference relay not connected"}
          </span>
        }
      />

      {!nativeAvailable ? (
        <section className="admin-card k-danger p-5 text-sm text-amber-950" style={{ borderColor: "rgba(217,139,19,0.45)", backgroundImage: "linear-gradient(180deg,#fffaf0,#fdf1dc)" }}>
          <h2 className="flex items-center gap-2.5 font-semibold">
            <RadioTower aria-hidden className="h-4 w-4" /> Conference relay connection required
          </h2>
          <p className="mt-1 max-w-4xl leading-relaxed">
            The scheduler is paused because production cannot yet provide a
            reliable in-platform audio/video path. Connect the project-owned
            TURN service using server-only TURN_URL, TURN_USERNAME and
            TURN_CREDENTIAL settings, then redeploy. Mentor proposals remain
            available, but approval waits for relay readiness.
          </p>
          <Link href="/admin/operations" className={keyClass("paper", "sm", "mt-3")}>
            View operational readiness <ArrowRight aria-hidden />
          </Link>
        </section>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <Caption>Calendar</Caption>
                <h2 className="mt-1 font-serif text-[1.45rem] text-navy">Scheduled and live events</h2>
              </div>
              <Link href="/events?past=1" className={keyClass("paper", "sm")}>
                Past and cancelled events
              </Link>
            </div>
            <EventCalendar
              initialEvents={events.map((row) => ({
                ...row,
                startsAt: row.startsAt.toISOString(),
              }))}
              manage
            />
          </section>

          <Panel
            id="requests"
            title="Mentor session requests"
            icon={Inbox}
            description="Approval publishes the proposed schedule. Decline with a reason if the mentor should propose another date."
            bodyClassName="p-4 sm:p-5"
          >
            {requests.length ? (
              <div className="k-stagger space-y-4">
                {requests.map(({ request, mentorName }, index) => (
                  <article key={request.id} style={staggerStyle(index)} className="rounded-2xl border border-navy/10 bg-paper p-4 shadow-[inset_0_1px_0_#fff,0_2px_6px_-3px_rgba(10,26,48,0.2)]">
                    <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-source">
                      <Led tone={request.status === "pending" ? "amber" : request.status === "approved" ? "green" : "off"} pulse={request.status === "pending"} />
                      {request.status} · {mentorName}
                    </p>
                    <h3 className="mt-2 font-serif text-[18px] text-navy">{request.title}</h3>
                    <p className="mt-1.5 text-[13px] text-stone-600">
                      {eventDate(request.startsAt, request.timezone)} · {request.timezone} · {request.durationMinutes} minutes
                    </p>
                    <p className="mt-2 whitespace-pre-line text-[14px] text-stone-700">{request.description}</p>
                    {request.agenda ? <p className="mt-2 whitespace-pre-line rounded-xl bg-cream/60 px-3.5 py-2.5 text-[13.5px] text-stone-700 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">{request.agenda}</p> : null}
                    {request.status === "pending" ? (
                      <RequestReviewForm key={request.updatedAt.toISOString()} id={request.id} version={request.updatedAt.toISOString()} />
                    ) : (
                      <p className="mt-2 text-[13px] text-stone-600">{request.reviewNote ?? "Decision recorded."}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-stone-600">No mentor requests yet.</p>
            )}
          </Panel>
        </div>

        <Panel title={session ? "Edit scheduled event" : "Schedule an event"} icon={CalendarPlus} riveted bodyClassName="px-5 pb-6 pt-4">
          <EventForm
            nativeAvailable={nativeAvailable}
            key={session?.updatedAt.toISOString() ?? "new"}
            options={options}
            hostId={user.profileId}
            timezone={user.timezone ?? "Africa/Kampala"}
            existing={
              session
                ? {
                    ...session,
                    startsAt: session.startsAt.toISOString(),
                    updatedAt: session.updatedAt.toISOString(),
                  }
                : undefined
            }
          />
          {session ? (
            <Link href="/admin/academy/live" className={keyClass("paper", "sm", "mt-4")}>
              Create another event
            </Link>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
