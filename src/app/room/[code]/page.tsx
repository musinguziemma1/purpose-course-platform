import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, Lock, Radio, Users, Video } from "lucide-react";
import { VideoRoom } from "@/components/conference/video-room";
import { LiveRoom } from "@/components/academy/live-room";
import { getRoomByCode, isRoomHost } from "@/db/conference";
import { getLiveSessionRoom } from "@/db/courses";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live video room",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ code: string }> };

export default async function VideoRoomPage({ params }: Params) {
  const { code } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/room/${code}`);

  const record = await getRoomByCode(code, user);
  if (!record) notFound();

  const feed = await getLiveSessionRoom(record.session.id);
  const backHref =
    user.roleSlug === "student"
      ? `/learn/live/${record.session.id}`
      : user.roleSlug === "mentor"
        ? `/mentor/live/${record.session.id}`
        : "/admin/academy/live";

  return (
    <div className="min-h-screen bg-[#f6f2e9]">
      <header className="border-b border-navy/10 bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
              <ArrowLeft className="h-3.5 w-3.5" /> Session
            </Link>
            <span className="h-4 w-px bg-navy/15" />
            <div>
              <p className="font-serif text-[15px] leading-tight text-navy">{record.session.title}</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-stone-500">
                {record.session.type.replace("_", " ")} · {record.courseTitle ?? record.levelName ?? "Purpose Course"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/12 px-2.5 py-1">
              <Radio className="h-3 w-3 text-gold-dark" /> {record.session.status}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/12 px-2.5 py-1">
              <CalendarClock className="h-3 w-3 text-gold-dark" /> {formatDateTime(record.session.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/12 px-2.5 py-1">
              <Users className="h-3 w-3 text-gold-dark" /> {record.session.durationMinutes} min
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 lg:grid-cols-[1.65fr_1fr] lg:items-start">
        <div className="space-y-3">
          <VideoRoom
            roomCode={code}
            selfName={user.fullName}
            isHostRole={isRoomHost(record.hostProfileId, user)}
            onLeaveHref={backHref}
          />
          <div className="rounded-xl border border-navy/10 bg-paper p-3.5 text-[11px] leading-relaxed text-stone-600">
            <p className="inline-flex items-center gap-1.5 font-semibold text-navy">
              <Video className="h-3.5 w-3.5 text-gold-dark" /> How this room stays fast
            </p>
            <p className="mt-1">
              Video and audio travel directly between participants over WebRTC, so there is no media server in the middle
              and no upload bottleneck beyond your own connection. The first seats are interactive (camera and mic);
              beyond that, joiners watch the host&apos;s stage stream, which keeps large classes light. The live feed on
              the right is the shared backchannel for questions and group work.
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-stone-500">
              <Lock className="h-3 w-3" /> Room code <span className="font-mono text-navy">{code}</span> · only signed-in
              participants with session access can enter.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {feed ? (
            <LiveRoom
              sessionId={record.session.id}
              initialMessages={feed.messages.map((message) => ({
                id: message.id,
                authorName: message.authorName,
                authorRole: message.authorRole,
                kind: message.kind,
                body: message.body,
                createdAt: message.createdAt.toISOString(),
              }))}
              initialStatus={record.session.status}
              meetingUrl={null}
              recordingUrl={record.session.recordingUrl}
              defaultName={user.fullName}
              isLive={record.session.status === "live"}
            />
          ) : null}
          {record.session.agenda ? (
            <div className="rounded-xl border border-navy/10 bg-paper p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Agenda & group brief</p>
              <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-stone-700">{record.session.agenda}</p>
            </div>
          ) : null}
          <Link
            href={
              user.roleSlug === "student"
                ? "/learn/live"
                : user.roleSlug === "mentor"
                  ? "/mentor/live"
                  : homePathForRole(user.roleSlug)
            }
            className="inline-flex text-[11.5px] font-semibold text-gold-dark hover:underline"
          >
            All live sessions →
          </Link>
        </div>
      </main>
    </div>
  );
}
