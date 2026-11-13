import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { liveSessions } from "@/db/schema";
import { getEventCalendar, canScheduleEvents } from "@/db/live-events";
import { getSessionUser } from "@/lib/auth";
import { ensureRoomCode } from "@/db/conference";
import { eventDate } from "@/lib/event-time";
import {
  EventRsvpForm,
  EventStatusForm,
} from "@/components/academy/event-forms";
import { safeContentUrl } from "@/lib/content-media";
import { can } from "@/lib/rbac";
import { liveReadable } from "@/db/learning-access";
export const dynamic = "force-dynamic";
export const metadata = { title: "Live event" };
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const viewer = await getSessionUser(),
    [event] = await getEventCalendar(viewer, { id });
  if (!event) notFound();
  const [privateSession] = event.canJoin
    ? await db
        .select()
        .from(liveSessions)
        .where(and(eq(liveSessions.id, id), liveReadable(viewer)))
        .limit(1)
    : [];
  const open = ["scheduled", "live"].includes(event.status),
    code =
      open && privateSession
        ? (privateSession.roomCode ?? (await ensureRoomCode(id)))
        : null;
  const manages = Boolean(
    viewer &&
      (canScheduleEvents(viewer) ||
        (viewer.profileId === event.hostId && can(viewer, "mentorship.coach"))),
  );
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <Link
        href="/events"
        className="text-sm font-semibold text-gold-dark underline"
      >
        ← Event calendar
      </Link>
      <p className="mt-7 text-xs font-semibold uppercase tracking-widest text-source">
        {event.type.replaceAll("_", " ")} · {event.status}
      </p>
      <h1 className="mt-3 break-words font-serif text-4xl text-navy">
        {event.title}
      </h1>
      <p className="mt-4 text-lg text-stone-700">
        {eventDate(event.startsAt, event.timezone)} · {event.timezone}
      </p>
      <p className="mt-2 text-sm text-stone-500">
        {event.durationMinutes} minutes ·{" "}
        {event.hostName ?? "Purpose Course faculty"}
      </p>
      <p className="mt-2 text-sm text-stone-500">
        {event.cohortName ?? event.courseTitle ?? "All account holders"}
      </p>
      <p className="mt-6 whitespace-pre-line break-words text-base leading-relaxed text-stone-700">
        {event.description}
      </p>
      <section className="mt-8 space-y-4 rounded-2xl border border-navy/15 bg-paper p-6">
        <h2 className="font-serif text-2xl text-navy">
          {open
            ? "Join this session"
            : event.status === "cancelled"
              ? "Session cancelled"
              : "Session closed"}
        </h2>
        {event.canJoin && privateSession ? (
          <>
            {privateSession.agenda ? (
              <div>
                <h3 className="font-semibold text-navy">
                  Agenda and preparation
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm text-stone-600">
                  {privateSession.agenda}
                </p>
              </div>
            ) : null}
            {open ? (
              <>
                <div className="flex flex-wrap gap-3">
                  {code ? (
                    <Link
                      href={`/room/${code}`}
                      className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-paper"
                    >
                      Open video room
                    </Link>
                  ) : null}
                  <Link
                    href={`${viewer?.roleSlug === "student" ? "/learn" : "/mentor"}/live/${id}`}
                    className="rounded-full border border-navy/20 px-5 py-2.5 text-sm font-semibold text-navy"
                  >
                    Session feed
                  </Link>
                  {privateSession.meetingUrl &&
                  safeContentUrl(privateSession.meetingUrl, true) ? (
                    <a
                      href={privateSession.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-navy/20 px-5 py-2.5 text-sm font-semibold text-navy"
                    >
                      External meeting ↗
                    </a>
                  ) : null}
                </div>
                <EventRsvpForm id={id} going={event.myRsvp} />
              </>
            ) : null}
            {event.status === "ended" &&
            privateSession.recordingUrl &&
            safeContentUrl(privateSession.recordingUrl, true) ? (
              <a
                href={privateSession.recordingUrl}
                className="font-semibold text-gold-dark underline"
              >
                Watch session recording
              </a>
            ) : null}
          </>
        ) : !viewer ? (
          <p className="text-sm text-stone-600">
            <Link
              href={`/login?next=${encodeURIComponent("/events/" + id)}`}
              className="font-semibold text-gold-dark underline"
            >
              Sign in
            </Link>{" "}
            to check your access. Course and cohort sessions require the
            appropriate enrolment or membership.
          </p>
        ) : (
          <p className="text-sm text-stone-600">
            This event is listed for discovery. Joining and recordings require
            the relevant course enrolment or cohort membership. Contact your
            programme team if you need help.
          </p>
        )}
        {manages ? (
          <EventStatusForm
            id={id}
            status={event.status}
            version={event.updatedAt.toISOString()}
          />
        ) : null}
        {manages && event.status === "scheduled" ? (
          <Link
            href={`/admin/academy/live?edit=${id}`}
            className="inline-block text-sm font-semibold text-gold-dark underline"
          >
            Edit schedule
          </Link>
        ) : null}
      </section>
    </main>
  );
}
