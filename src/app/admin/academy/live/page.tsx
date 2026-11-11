import Link from "next/link";
import { ArrowRight, CalendarClock, Radio, Trash2, Video } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, roles } from "@/db/schema";
import { getAcademyTree, getLiveSessions } from "@/db/courses";
import { LiveSessionForm } from "@/components/academy/admin-forms";
import { deleteLiveSession, setLiveStatus } from "@/app/actions/academy";
import { ensureRoomCode } from "@/db/conference";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Live sessions" };

export default async function AdminLivePage() {
  const user = await getSessionUser();
  const [sessions, tree, hosts, mentors] = await Promise.all([
    getLiveSessions({ limit: 40 }),
    getAcademyTree({ includeDrafts: true }),
    db
      .select({ id: profiles.id, fullName: profiles.fullName })
      .from(profiles)
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .orderBy(asc(profiles.fullName)),
    db
      .select({ id: profiles.id, fullName: profiles.fullName })
      .from(profiles)
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(eq(roles.slug, "mentor")),
  ]);
  const roomCodes = new Map<number, string>();
  for (const row of sessions) {
    const code = row.session.roomCode ?? (await ensureRoomCode(row.session.id));
    if (code) roomCodes.set(row.session.id, code);
  }
  const canSchedule = canManagePeople(user) || Boolean(user && ["mentor", "admin"].includes(user.roleSlug));
  const hostOptions = canManagePeople(user) ? hosts : mentors;

  const counts = {
    scheduled: sessions.filter((row) => row.session.status === "scheduled").length,
    live: sessions.filter((row) => row.session.status === "live").length,
    ended: sessions.filter((row) => row.session.status === "ended").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/academy" className="text-[11.5px] text-stone-600 hover:text-navy">
          ← Academy builder
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-navy">Live sessions</h1>
        <p className="text-[12.5px] text-stone-600">
          Online classes, group work, round-table discussions and office hours. Each room carries a live feed students
          can join.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Scheduled", value: counts.scheduled, icon: CalendarClock },
          { label: "Live now", value: counts.live, icon: Radio },
          { label: "Completed", value: counts.ended, icon: ArrowRight },
          { label: "Total rooms", value: sessions.length, icon: CalendarClock },
        ].map((card) => (
          <div key={card.label} className="admin-card p-3.5">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Session calendar</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {sessions.map((row) => (
              <li key={row.session.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-navy">
                    {row.session.title}
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                      {row.session.type.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                        row.session.status === "live" ? "bg-source/10 text-source" : row.session.status === "ended" ? "bg-stone-100 text-stone-500" : "bg-gold/20 text-gold-dark"
                      }`}
                    >
                      {row.session.status}
                    </span>
                  </p>
                  <p className="text-[10.5px] text-stone-500">
                    {formatDateTime(row.session.startsAt)} · {row.session.durationMinutes} min · {row.hostName ?? "host TBD"} ·{" "}
                    {row.attending} going · {row.messageCount} feed posts
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <form action={setLiveStatus}>
                    <input type="hidden" name="sessionId" value={row.session.id} />
                    <input type="hidden" name="status" value={row.session.status === "live" ? "ended" : "live"} />
                    <button
                      type="submit"
                      className="inline-flex h-7 items-center rounded-full border border-navy/15 px-2.5 text-[10px] font-medium text-navy hover:bg-cream"
                    >
                      {row.session.status === "live" ? "End" : "Go live"}
                    </button>
                  </form>
                  {roomCodes.get(row.session.id) ? (
                    <Link
                      href={`/room/${roomCodes.get(row.session.id)}`}
                      className="inline-flex h-7 items-center gap-1 rounded-full bg-navy px-2.5 text-[10px] font-semibold text-paper hover:bg-navy-700"
                    >
                      <Video className="h-3 w-3" /> Video
                    </Link>
                  ) : null}
                  <Link
                    href={`/learn/live/${row.session.id}`}
                    className="inline-flex h-7 items-center rounded-full border border-navy/15 px-2.5 text-[10px] font-medium text-navy hover:bg-cream"
                  >
                    Feed
                  </Link>
                  {canManagePeople(user) ? (
                    <form action={deleteLiveSession}>
                      <input type="hidden" name="sessionId" value={row.session.id} />
                      <button
                        type="submit"
                        aria-label="Delete session"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
            {sessions.length === 0 ? <li className="px-5 py-6 text-[12px] text-stone-500">No sessions yet.</li> : null}
          </ul>
        </div>

        <div className="admin-card p-5 xl:sticky xl:top-6">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
            <CalendarClock className="h-3.5 w-3.5 text-gold-dark" /> Schedule a session
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">Students see it immediately and can RSVP.</p>
          <div className="mt-3">
            {canSchedule ? (
              <LiveSessionForm
                courses={tree.map((course) => ({ id: course.id, title: course.title }))}
                hosts={hostOptions}
              />
            ) : (
              <p className="text-[12px] text-stone-600">Administrators and mentors can schedule sessions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
