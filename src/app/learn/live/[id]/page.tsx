import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Info, ListOrdered, Users, Video } from "lucide-react";
import { LiveRoom } from "@/components/academy/live-room";
import { getLiveSessionRoom } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { toggleRsvp } from "@/app/actions/academy";
import { ensureRoomCode } from "@/db/conference";
import { nativeConferenceAvailable } from "@/lib/conference-config";
import { sessionStillOpen } from "@/db/live-lifecycle";
import { BackLink, Chip, Coin, LeatherChip, LearnHero, OnAirSign, Panel, Ticket, btn } from "@/components/learn/kit";
import { SubmitButton } from "@/components/learn/forms";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const TYPE_LABEL: Record<string, string> = {
  class: "Live class",
  group_work: "Group work",
  discussion: "Discussion",
  office_hours: "Office hours",
};

export default async function StudentLiveRoomPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const room = await getLiveSessionRoom(Number(id));
  if (!room) notFound();

  const meta = await dbRsvpState(room.session.id, user.profileId);
  const roomCode = nativeConferenceAvailable() && sessionStillOpen(room.session) ? room.session.roomCode ?? (await ensureRoomCode(room.session.id)) : null;
  const live = room.session.status === "live";

  return (
    <div className="space-y-6">
      <BackLink href="/learn/live">All live sessions</BackLink>

      <LearnHero
        size="md"
        eyebrow={<OnAirSign live={live}>{live ? "On air · live now" : TYPE_LABEL[room.session.type] ?? "Session"}</OnAirSign>}
        title={room.session.title}
        description={
          <>
            Hosted by {room.hostName ?? "Purpose Course faculty"}
            {room.courseTitle ? ` · ${room.courseTitle}` : ""} · {room.session.durationMinutes} minutes
          </>
        }
        meta={
          <>
            <LeatherChip icon={CalendarClock}>{formatDateTime(room.session.startsAt)}</LeatherChip>
            <LeatherChip icon={Users}>{room.attendees.length} going</LeatherChip>
          </>
        }
        actions={
          <>
            {roomCode ? (
              <Link href={`/room/${roomCode}`} className={btn.brass}>
                <Video aria-hidden className="h-4 w-4" /> Join video class
              </Link>
            ) : null}
            <form action={toggleRsvp}>
              <input type="hidden" name="sessionId" value={room.session.id} />
              <SubmitButton className={cn("lk-btn", meta ? "lk-btn-down" : "lk-btn-paper")}>{meta ? "Going — cancel RSVP" : "RSVP to this session"}</SubmitButton>
            </form>
          </>
        }
        aside={
          <Ticket date={room.session.startsAt} className="w-full max-w-xs rotate-1 text-ink sm:w-72">
            <p className="lk-kicker">Admit one</p>
            <p className="mt-0.5 line-clamp-2 font-serif text-[1.05rem] leading-snug text-navy">{room.session.title}</p>
            <p className="mt-1 text-[13px] text-stone-600">
              {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(room.session.startsAt))} · {room.session.durationMinutes} min
            </p>
            <p className="mt-1.5">
              <Chip tone={meta ? "green" : "plain"}>{meta ? "RSVP confirmed" : "No RSVP yet"}</Chip>
            </p>
          </Ticket>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-4">
          <LiveRoom
            sessionId={room.session.id}
            initialMessages={room.messages.map((message) => ({
              id: message.id,
              authorName: message.authorName,
              authorRole: message.authorRole,
              kind: message.kind,
              body: message.body,
              createdAt: message.createdAt.toISOString(),
            }))}
            initialStatus={room.session.status}
            recordingUrl={room.session.recordingUrl}
            defaultName={user.fullName}
            isLive={live}
          />
          {room.session.recordingUrl ? (
            <a href={room.session.recordingUrl} target="_blank" rel="noreferrer noopener" className={btn.paper}>
              <Video aria-hidden className="h-4 w-4" /> Watch the recording
            </a>
          ) : null}
        </div>

        <div className="space-y-5">
          {room.session.description ? (
            <Panel title="About this session" icon={Info}>
              <p className="text-[14px] leading-relaxed text-stone-700">{room.session.description}</p>
            </Panel>
          ) : null}
          {room.session.agenda ? (
            <Panel title="Agenda & group brief" icon={ListOrdered}>
              <p className="lk-lined whitespace-pre-line text-[14px] text-stone-700">{room.session.agenda}</p>
            </Panel>
          ) : null}
          <Panel title="In the room" icon={Users} bodyClassName="px-3 pb-3 pt-2 sm:px-4">
            <ul className="lk-ledger">
              {room.attendees.length === 0 ? (
                <li className="px-2 py-4 text-[14px] text-stone-600">No RSVPs yet. Be the first.</li>
              ) : (
                room.attendees.map((attendee, index) => (
                  <li key={`${attendee.name}-${index}`} className="flex items-center gap-3 px-2 py-2.5">
                    <Coin tone="navy" className="h-9 w-9 text-[12px]">
                      {initials(attendee.name)}
                    </Coin>
                    <div>
                      <p className="text-[14px] font-medium text-navy">{attendee.name}</p>
                      <p className="text-[12px] text-stone-600">{attendee.title ?? "Participant"}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Panel>
          <div className="lk-note lk-note-r">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#6b4a05]">Round-table rules apply</p>
            <p className="mt-2 font-serif text-[15px] italic leading-relaxed">Speak from your own experience. Ask before advising. Confidentiality is not optional.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function dbRsvpState(sessionId: number, profileId: string) {
  const { db } = await import("@/db");
  const { liveRsvps } = await import("@/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const rows = await db
    .select({ status: liveRsvps.status })
    .from(liveRsvps)
    .where(and(eq(liveRsvps.liveSessionId, sessionId), eq(liveRsvps.profileId, profileId)))
    .limit(1);
  return rows[0]?.status ?? null;
}
