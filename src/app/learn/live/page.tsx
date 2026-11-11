import Link from "next/link";
import { ArrowRight, CalendarClock, MessageSquare, Radio, Users, Video } from "lucide-react";
import { getLiveSessions } from "@/db/courses";
import { ensureRoomCode } from "@/db/conference";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { toggleRsvp } from "@/app/actions/academy";

export const dynamic = "force-dynamic";

export const metadata = { title: "Live sessions" };

const TYPE_META: Record<string, { label: string; tone: string; icon: typeof Video; blurb: string }> = {
  class: { label: "Live class", tone: "bg-navy text-paper", icon: Video, blurb: "Facilitated teaching with Q&A" },
  group_work: { label: "Group work", tone: "bg-[#155e63] text-paper", icon: Users, blurb: "Small groups, shared brief" },
  discussion: { label: "Discussion", tone: "bg-gold text-ink", icon: MessageSquare, blurb: "Round-table conversation" },
  office_hours: { label: "Office hours", tone: "bg-[#5a3a8a] text-paper", icon: CalendarClock, blurb: "Bring one question" },
};

export default async function StudentLivePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const sessions = await getLiveSessions({ profileId: user.profileId, limit: 30 });
  const roomCodes = new Map<number, string>();
  for (const row of sessions) {
    const code = row.session.roomCode ?? (await ensureRoomCode(row.session.id));
    if (code) roomCodes.set(row.session.id, code);
  }
  // eslint-disable-next-line react-hooks/purity -- This dynamic Server Component reads the current request time.
  const now = Date.now();
  const upcoming = sessions.filter((row) => row.session.startsAt.getTime() >= now && row.session.status !== "ended");
  const past = sessions.filter((row) => row.session.startsAt.getTime() < now || row.session.status === "ended");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Live sessions</h1>
          <p className="text-[12.5px] text-stone-600">
            Online classes, group work, round-table discussions and office hours — with a live feed for every room.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-source/30 bg-source/5 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-source">
          <span className="live-pulse h-2 w-2 rounded-full bg-source" /> {upcoming.length} upcoming
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {upcoming.map((row) => {
          const meta = TYPE_META[row.session.type] ?? TYPE_META.class;
          const going = Boolean(row.myRsvp);
          const isLive = row.session.status === "live";
          return (
            <div key={row.session.id} className="admin-card flex flex-col overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/10 px-5 py-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${meta.tone}`}>
                  <meta.icon className="h-3 w-3" /> {meta.label}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-stone-600">
                  {isLive ? (
                    <>
                      <span className="live-pulse h-2 w-2 rounded-full bg-source" /> live now
                    </>
                  ) : (
                    <>
                      <CalendarClock className="h-3 w-3" /> {formatDateTime(row.session.startsAt)}
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-serif text-xl leading-snug text-navy">{row.session.title}</h2>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-stone-500">
                  {row.hostName ?? "Purpose Course faculty"} · {row.session.durationMinutes} min
                  {row.courseTitle ? ` · ${row.courseTitle}` : ""}
                </p>
                {row.session.description ? (
                  <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-stone-600">{row.session.description}</p>
                ) : (
                  <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-stone-500">{meta.blurb}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {row.attending} going
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {row.messageCount} in feed
                  </span>
                  {row.session.groupSize ? <span>groups of {row.session.groupSize}</span> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-navy/8 pt-3">
                  {roomCodes.get(row.session.id) ? (
                    <Link
                      href={`/room/${roomCodes.get(row.session.id)}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
                    >
                      <Video className="h-3.5 w-3.5" /> Join video class
                    </Link>
                  ) : null}
                  <Link
                    href={`/learn/live/${row.session.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
                  >
                    <Radio className="h-3.5 w-3.5" /> Live feed
                  </Link>
                  <form action={toggleRsvp}>
                    <input type="hidden" name="sessionId" value={row.session.id} />
                    <button
                      type="submit"
                      className={`inline-flex h-9 items-center rounded-full border px-4 text-[11.5px] font-medium ${
                        going ? "border-source/30 bg-source/5 text-source" : "border-navy/15 text-navy hover:bg-cream"
                      }`}
                    >
                      {going ? "Going — cancel RSVP" : "RSVP"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {upcoming.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <CalendarClock className="mx-auto h-7 w-7 text-stone-300" />
          <p className="mt-2 font-serif text-lg text-navy">No sessions scheduled yet.</p>
          <p className="mt-1 text-[12.5px] text-stone-600">Your faculty will publish the next live class and group work here.</p>
        </div>
      ) : null}

      {past.length > 0 ? (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Past sessions & recordings</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {past.map((row) => (
              <li key={row.session.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-navy">{row.session.title}</p>
                  <p className="text-[10.5px] text-stone-500">
                    {formatDateTime(row.session.startsAt)} · {TYPE_META[row.session.type]?.label ?? "Session"} · {row.messageCount} messages
                  </p>
                </div>
                {row.session.recordingUrl ? (
                  <a
                    href={row.session.recordingUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-navy/15 px-3 text-[10.5px] font-medium text-navy hover:bg-cream"
                  >
                    <Video className="h-3 w-3" /> Recording
                  </a>
                ) : null}
                <Link
                  href={`/learn/live/${row.session.id}`}
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gold-dark hover:underline"
                >
                  Feed <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
