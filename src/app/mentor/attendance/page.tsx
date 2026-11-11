import Link from "next/link";
import { CalendarCheck2, Clock, Users } from "lucide-react";
import { db } from "@/db";
import { profiles, roles } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { learnerReadable } from "@/db/learner-access";
import { getAttendanceForSession, getSessionsForAttendance } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { AttendanceForm } from "@/components/platform/forms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Attendance" };

export default async function MentorAttendancePage() {
  const user = await getSessionUser();
  if (!user) return null;

  const sessions = await getSessionsForAttendance();
  const learners = await db
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(and(inArray(roles.slug, ["student"]), learnerReadable(profiles.id, user)));

  const withAttendance = sessions[0] ? await getAttendanceForSession(sessions[0].session.id) : [];
  const totalMarked = sessions.reduce((sum, row) => sum + Number(row.marked), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Attendance</h1>
        <p className="text-[12.5px] text-stone-600">
          Mark who attended each live session. Attendance rolls into cohort progress, mentor follow-up and certificate
          eligibility.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Sessions", value: sessions.length, icon: CalendarCheck2 },
          { label: "Learners", value: learners.length, icon: Users },
          { label: "Records", value: totalMarked, icon: Clock },
          { label: "Latest session", value: sessions[0] ? sessions[0].marked : 0, icon: Users },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Session register</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {sessions.map((row) => (
              <li key={row.session.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-navy">{row.session.title}</p>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                    {formatDateTime(row.session.startsAt)} · {row.session.status} · {row.cohortName ?? "no cohort"}
                  </p>
                </div>
                <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                  {row.marked} marked
                </span>
                <Link href={`/learn/live/${row.session.id}`} className="text-[10.5px] font-semibold text-gold-dark hover:underline">
                  Feed →
                </Link>
              </li>
            ))}
            {sessions.length === 0 ? <li className="px-5 py-5 text-[12px] text-stone-500">No sessions yet.</li> : null}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="admin-card p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Mark attendance</p>
            <div className="mt-2">
              <AttendanceForm
                sessions={sessions.map((row) => ({ id: row.session.id, title: row.session.title, startsAt: row.session.startsAt.toISOString() }))}
                students={learners}
              />
            </div>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-4 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                Latest register {sessions[0] ? `· ${sessions[0].session.title}` : ""}
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {withAttendance.map((row) => (
                <li key={row.attendance.id} className="flex items-center justify-between gap-2 px-4 py-2">
                  <p className="min-w-0 flex-1 truncate text-[11.5px] text-navy">{row.fullName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${row.attendance.status === "present" ? "bg-source/10 text-source" : row.attendance.status === "late" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-500"}`}>
                    {row.attendance.status}
                  </span>
                  <span className="text-[9.5px] text-stone-400">{row.attendance.minutesAttended}m</span>
                </li>
              ))}
              {withAttendance.length === 0 ? <li className="px-4 py-4 text-[12px] text-stone-500">No records for this session.</li> : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
