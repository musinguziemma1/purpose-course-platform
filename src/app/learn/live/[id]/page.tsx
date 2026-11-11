import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Radio, Users, Video } from "lucide-react";
import { LiveRoom } from "@/components/academy/live-room";
import { getLiveSessionRoom } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { toggleRsvp } from "@/app/actions/academy";
import { ensureRoomCode } from "@/db/conference";

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
  const roomCode = room.session.roomCode ?? (await ensureRoomCode(room.session.id));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/learn/live" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> All live sessions
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
              {room.session.status === "live" ? (
                <>
                  <span className="live-pulse h-2 w-2 rounded-full bg-source" /> live now
                </>
              ) : (
                <>
                  <Radio className="h-3 w-3" /> {TYPE_LABEL[room.session.type] ?? "Session"}
                </>
              )}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-navy">{room.session.title}</h1>
            <p className="text-[12.5px] text-stone-600">
              Hosted by {room.hostName ?? "Purpose Course faculty"}
              {room.courseTitle ? ` · ${room.courseTitle}` : ""} · {room.session.durationMinutes} minutes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {roomCode ? (
              <Link
                href={`/room/${roomCode}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 text-[11px] font-semibold text-paper hover:bg-navy-700"
              >
                <Video className="h-3.5 w-3.5" /> Join video class
              </Link>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/12 bg-paper px-3 py-1.5 text-[11px] text-stone-600">
              <CalendarClock className="h-3.5 w-3.5 text-gold-dark" /> {formatDateTime(room.session.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/12 bg-paper px-3 py-1.5 text-[11px] text-stone-600">
              <Users className="h-3.5 w-3.5 text-gold-dark" /> {room.attendees.length} going
            </span>
            <form action={toggleRsvp}>
              <input type="hidden" name="sessionId" value={room.session.id} />
              <button
                type="submit"
                className={`inline-flex h-9 items-center rounded-full px-3.5 text-[11px] font-semibold ${
                  meta ? "border border-source/30 bg-source/5 text-source" : "bg-gold text-ink hover:bg-gold-dark hover:text-paper"
                }`}
              >
                {meta ? "Going — cancel RSVP" : "RSVP to this session"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
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
            meetingUrl={room.session.meetingUrl}
            recordingUrl={room.session.recordingUrl}
            defaultName={user.fullName}
            isLive={room.session.status === "live"}
          />
          {room.session.recordingUrl ? (
            <a
              href={room.session.recordingUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-navy/15 bg-paper px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
            >
              <Video className="h-3.5 w-3.5" /> Watch the recording
            </a>
          ) : null}
        </div>

        <div className="space-y-4">
          {room.session.description ? (
            <div className="admin-card p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">About this session</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone-700">{room.session.description}</p>
            </div>
          ) : null}
          {room.session.agenda ? (
            <div className="admin-card p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Agenda & group brief</p>
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-stone-700">{room.session.agenda}</p>
            </div>
          ) : null}
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">In the room</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {room.attendees.length === 0 ? (
                <li className="px-5 py-4 text-[12px] text-stone-500">No RSVPs yet. Be the first.</li>
              ) : (
                room.attendees.map((attendee, index) => (
                  <li key={`${attendee.name}-${index}`} className="flex items-center gap-2.5 px-5 py-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-paper">
                      {attendee.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div>
                      <p className="text-[11.5px] font-medium text-navy">{attendee.name}</p>
                      <p className="text-[10px] text-stone-500">{attendee.title ?? "Participant"}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-[#bcd9db] bg-[#e3eff0]/50 p-4 text-[11.5px] leading-relaxed text-stone-700">
            <p className="font-semibold text-[#155e63]">Round-table rules apply</p>
            <p className="mt-1">Speak from your own experience. Ask before advising. Confidentiality is not optional.</p>
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
