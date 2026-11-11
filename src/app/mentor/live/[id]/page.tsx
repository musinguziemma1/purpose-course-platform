import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Users, Video } from "lucide-react";
import { LiveRoom } from "@/components/academy/live-room";
import { RecordingForm } from "@/components/academy/admin-forms";
import { getLiveSessionRoom } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { setLiveStatus } from "@/app/actions/academy";
import { ensureRoomCode } from "@/db/conference";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function MentorLiveRoomPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const room = await getLiveSessionRoom(Number(id));
  if (!room) notFound();
  const roomCode = room.session.roomCode ?? (await ensureRoomCode(room.session.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/mentor/live" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
            <ArrowLeft className="h-3.5 w-3.5" /> Live teaching
          </Link>
          <h1 className="mt-1.5 font-serif text-2xl text-navy">{room.session.title}</h1>
          <p className="text-[11.5px] text-stone-500">
            {formatDateTime(room.session.startsAt)} · {room.session.status} · {room.attendees.length} RSVPs
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {roomCode ? (
            <Link
              href={`/room/${roomCode}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-3.5 text-[11px] font-semibold text-paper hover:bg-navy-700"
            >
              <Video className="h-3.5 w-3.5" /> Open video room
            </Link>
          ) : null}
          <form action={setLiveStatus}>
            <input type="hidden" name="sessionId" value={room.session.id} />
            <input type="hidden" name="status" value={room.session.status === "live" ? "ended" : "live"} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-full bg-[#155e63] px-3.5 text-[11px] font-semibold text-paper hover:bg-[#124a4e]"
            >
              {room.session.status === "live" ? "End session" : "Go live"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
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
        <div className="space-y-4">
          <div className="admin-card p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Close the session</p>
            <p className="mt-1 text-[11.5px] text-stone-600">
              Attach the recording so absent students can catch up, and students who missed it keep access.
            </p>
            <div className="mt-3">
              <RecordingForm sessionId={room.session.id} />
            </div>
          </div>
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <Users className="h-3.5 w-3.5" /> Attendees
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {room.attendees.length === 0 ? (
                <li className="px-5 py-4 text-[12px] text-stone-500">No RSVPs yet.</li>
              ) : (
                room.attendees.map((attendee, index) => (
                  <li key={`${attendee.name}-${index}`} className="px-5 py-2.5">
                    <p className="text-[11.5px] font-medium text-navy">{attendee.name}</p>
                    <p className="text-[10px] text-stone-500">{attendee.title ?? "Participant"}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
          <p className="inline-flex items-center gap-1.5 text-[10.5px] text-stone-400">
            <CalendarClock className="h-3 w-3" /> The feed is shared with students in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
