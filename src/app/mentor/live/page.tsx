import Link from "next/link";
import { ArrowRight, CalendarClock, Radio, Users, Video } from "lucide-react";
import { getMentorLiveSessions } from "@/db/courses";
import { ensureRoomCode } from "@/db/conference";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { setLiveStatus } from "@/app/actions/academy";

export const dynamic = "force-dynamic";

export const metadata = { title: "Live teaching" };

export default async function MentorLivePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const rows = await getMentorLiveSessions(user.profileId);
  const roomCodes = new Map<number, string>();
  for (const row of rows) {
    const code = row.session.roomCode ?? (await ensureRoomCode(row.session.id));
    if (code) roomCodes.set(row.session.id, code);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Live teaching</h1>
        <p className="text-[12.5px] text-stone-600">
          Run your classes, group work and discussions from here. Opening a room starts the live feed for students.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.session.id} className="admin-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#155e63]">
                  {row.session.type.replace("_", " ")} · {row.session.status}
                </p>
                <p className="mt-0.5 font-serif text-[16px] text-navy">{row.session.title}</p>
                <p className="text-[11px] text-stone-500">
                  {formatDateTime(row.session.startsAt)} · {row.session.durationMinutes} min · {row.messageCount} feed messages
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.session.status !== "live" ? (
                  <form action={setLiveStatus}>
                    <input type="hidden" name="sessionId" value={row.session.id} />
                    <input type="hidden" name="status" value="live" />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-[#155e63] px-3 text-[10.5px] font-semibold text-paper hover:bg-[#124a4e]"
                    >
                      <Radio className="h-3 w-3" /> Go live
                    </button>
                  </form>
                ) : (
                  <form action={setLiveStatus}>
                    <input type="hidden" name="sessionId" value={row.session.id} />
                    <input type="hidden" name="status" value="ended" />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-navy/15 px-3 text-[10.5px] font-medium text-navy hover:bg-cream"
                    >
                      End session
                    </button>
                  </form>
                )}
                {roomCodes.get(row.session.id) ? (
                  <Link
                    href={`/room/${roomCodes.get(row.session.id)}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy px-3 text-[10.5px] font-semibold text-paper hover:bg-navy-700"
                  >
                    <Video className="h-3 w-3" /> Video room
                  </Link>
                ) : null}
                <Link
                  href={`/mentor/live/${row.session.id}`}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-navy/15 px-3 text-[10.5px] font-medium text-navy hover:bg-cream"
                >
                  Feed <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            {row.session.agenda ? (
              <p className="mt-2 whitespace-pre-line rounded-md bg-cream/60 px-3 py-2 text-[11.5px] leading-relaxed text-stone-600">
                {row.session.agenda}
              </p>
            ) : null}
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="admin-card p-8 text-center">
            <CalendarClock className="mx-auto h-7 w-7 text-stone-300" />
            <p className="mt-2 font-serif text-lg text-navy">You are not hosting a session yet.</p>
            <p className="mt-1 text-[12.5px] text-stone-600">Ask an administrator to schedule one, or create it from the admin console.</p>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#bcd9db] bg-[#e3eff0]/50 p-4 text-[11.5px] leading-relaxed text-stone-700">
        <p className="inline-flex items-center gap-1.5 font-semibold text-[#155e63]">
          <Users className="h-3.5 w-3.5" /> Group work
        </p>
        <p className="mt-1">
          For group work, post the brief in the agenda, split the room into groups of three or four, and ask each group
          to post one finding in the live feed before the session closes.
        </p>
      </div>
    </div>
  );
}
