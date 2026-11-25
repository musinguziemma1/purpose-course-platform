import Link from "next/link";
import { notFound } from "next/navigation";
import { Clapperboard, NotebookTabs, Video } from "lucide-react";
import { LiveRoom } from "@/components/academy/live-room";
import { RecordingForm } from "@/components/academy/admin-forms";
import { getLiveSessionRoom } from "@/db/courses";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { EventStatusForm } from "@/components/academy/event-forms";
import { ensureRoomCode, isRoomHost } from "@/db/conference";
import { nativeConferenceAvailable } from "@/lib/conference-config";
import { sessionStillOpen } from "@/db/live-lifecycle";
import { DeskEmpty, DeskHero, DeskSheet, LeatherChip, OnAirLamp, SheetHead, rise } from "@/components/mentor/desk";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const LAMP_LABEL: Record<string, string> = { live: "On air", scheduled: "Standby", ended: "Off air", cancelled: "Cancelled" };

export default async function MentorLiveRoomPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const room = await getLiveSessionRoom(Number(id));
  if (!room) notFound();
  const roomCode = nativeConferenceAvailable() && sessionStillOpen(room.session) ? room.session.roomCode ?? (await ensureRoomCode(room.session.id)) : null;
  const canHost = isRoomHost(room.session.hostId, user);
  const live = room.session.status === "live";

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        back={{ href: "/mentor/live", label: "Live teaching" }}
        eyebrow="Live room"
        title={room.session.title}
        meta={
          <>
            <LeatherChip tone={live ? "rose" : undefined}>{room.session.status}</LeatherChip>
            <LeatherChip>{formatDateTime(room.session.startsAt)}</LeatherChip>
            <LeatherChip tone="teal">{room.attendees.length} RSVPs</LeatherChip>
          </>
        }
        aside={
          roomCode || canHost ? (
            <div className="desk-console desk-rise w-full px-5 pb-5 pt-6 lg:w-72" style={rise(2)}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-600">Broadcast</p>
                <OnAirLamp on={live} label={LAMP_LABEL[room.session.status] ?? room.session.status} />
              </div>
              {roomCode ? (
                <Link href={`/room/${roomCode}`} className="desk-btn mt-4 w-full" data-variant="teal">
                  <Video aria-hidden /> Open video room
                </Link>
              ) : null}
              {canHost ? <EventStatusForm id={room.session.id} status={room.session.status} version={room.session.updatedAt.toISOString()} /> : null}
            </div>
          ) : (
            <OnAirLamp on={live} label={LAMP_LABEL[room.session.status] ?? room.session.status} />
          )
        }
      />

      <div className="grid gap-7 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="desk-rise min-w-0" style={rise(1)}>
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
        </div>
        <div className="space-y-7">
          <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="close-session">
            <SheetHead id="close-session" eyebrow="After the bell" title="Close the session" icon={Clapperboard} tone="navy" />
            <div className="px-5 pb-5 pt-4">
              <p className="text-[13.5px] leading-relaxed text-stone-600">
                Attach the recording so absent students can catch up, and students who missed it keep access.
              </p>
              {canHost ? (
                <div className="mt-3">
                  <RecordingForm sessionId={room.session.id} version={room.session.updatedAt.toISOString()} />
                </div>
              ) : (
                <p className="mt-3 font-serif text-[14px] italic text-stone-500">Only the session host can attach the recording.</p>
              )}
            </div>
          </DeskSheet>

          <DeskSheet className="desk-rise overflow-hidden" style={rise(3)} labelledBy="attendees">
            <SheetHead id="attendees" eyebrow="Sign-in sheet" title="Attendees" icon={NotebookTabs} tone="teal" count={room.attendees.length} />
            {room.attendees.length === 0 ? (
              <DeskEmpty>No RSVPs yet.</DeskEmpty>
            ) : (
              <ol className="desk-ledger">
                {room.attendees.map((attendee, index) => (
                  <li key={`${attendee.name}-${index}`} className="flex items-baseline gap-3 py-2.5 pr-5">
                    <span aria-hidden className="numeric w-5 shrink-0 text-right font-serif text-[13px] italic text-stone-400">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-navy">{attendee.name}</span>
                      <span className="block text-[12px] text-stone-500">{attendee.title ?? "Participant"}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </DeskSheet>
          <p className="desk-rise px-1 font-serif text-[14px] italic text-stone-500" style={rise(4)}>
            The feed is shared with students in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
