import Link from "next/link";
import { BookOpenCheck, ClipboardPen, NotebookTabs } from "lucide-react";
import { db } from "@/db";
import { profiles, roles } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { learnerReadable } from "@/db/learner-access";
import { getAttendanceForSession, getSessionsForAttendance } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { AttendanceForm } from "@/components/platform/forms";
import { DeskCalendar, DeskEmpty, DeskHero, DeskSheet, DeskTag, FlapBoard, SheetHead, rise } from "@/components/mentor/desk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Attendance" };

const MARKS: Record<string, { mark: string; className: string }> = {
  present: { mark: "✓", className: "text-source" },
  late: { mark: "L", className: "text-amber-700" },
};

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
    <div className="space-y-7">
      <DeskHero
        compact
        eyebrow="Register"
        title="Attendance"
        description="Mark who attended each live session. Attendance rolls into cohort progress, mentor follow-up and certificate eligibility."
        aside={
          <FlapBoard
            label="Register book"
            items={[
              { label: "Sessions", value: sessions.length },
              { label: "Learners", value: learners.length },
              { label: "Records", value: totalMarked },
              { label: "Latest", value: sessions[0] ? Number(sessions[0].marked) : 0 },
            ]}
          />
        }
      />

      <div className="grid gap-7 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <DeskSheet className="desk-rise overflow-hidden" style={rise(1)} labelledBy="session-register">
          <SheetHead id="session-register" eyebrow="Ledger" title="Session register" icon={NotebookTabs} tone="navy" count={sessions.length} />
          {sessions.length === 0 ? (
            <DeskEmpty>No sessions yet.</DeskEmpty>
          ) : (
            <ul className="desk-ledger">
              {sessions.map((row) => (
                <li key={row.session.id} className="flex flex-wrap items-center gap-4 py-3.5 pr-5">
                  <DeskCalendar date={row.session.startsAt} tone={row.session.status === "cancelled" ? "stone" : row.session.status === "ended" ? "green" : "navy"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[16px] text-navy">{row.session.title}</p>
                    <p className="text-[12px] uppercase tracking-[0.08em] text-stone-500">
                      {formatDateTime(row.session.startsAt)} · {row.session.status} · {row.cohortName ?? "no cohort"}
                    </p>
                  </div>
                  <DeskTag tone={Number(row.marked) > 0 ? "teal" : undefined}>{row.marked} marked</DeskTag>
                  <Link
                    href={`/learn/live/${row.session.id}`}
                    className="inline-flex min-h-10 items-center text-[13px] font-semibold text-destiny underline decoration-destiny/30 decoration-2 underline-offset-4 hover:decoration-destiny"
                  >
                    Feed<span className="sr-only"> for {row.session.title}</span> →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DeskSheet>

        <div className="space-y-7">
          <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="mark-attendance">
            <SheetHead id="mark-attendance" title="Mark attendance" icon={ClipboardPen} tone="teal" />
            <div className="px-5 pb-5 pt-4">
              <AttendanceForm
                sessions={sessions.map((row) => ({ id: row.session.id, title: row.session.title, startsAt: row.session.startsAt.toISOString() }))}
                students={learners}
              />
            </div>
          </DeskSheet>

          <DeskSheet className="desk-rise overflow-hidden" style={rise(3)} labelledBy="latest-register">
            <SheetHead
              id="latest-register"
              eyebrow={sessions[0] ? sessions[0].session.title : "Sign-in sheet"}
              title="Latest register"
              icon={BookOpenCheck}
              tone="green"
              count={withAttendance.length}
            />
            {withAttendance.length === 0 ? (
              <DeskEmpty>No records for this session.</DeskEmpty>
            ) : (
              <ul className="desk-ledger">
                {withAttendance.map((row) => {
                  const mark = MARKS[row.attendance.status];
                  return (
                    <li key={row.attendance.id} className="flex items-center gap-3 py-2.5 pr-5">
                      <span aria-hidden className={`desk-tick w-5 text-center ${mark?.className ?? "text-stone-400"}`}>
                        {mark?.mark ?? "–"}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[13.5px] text-navy">{row.fullName}</p>
                      <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-stone-500">{row.attendance.status}</span>
                      <span className="numeric w-12 text-right font-serif text-[13px] italic text-stone-600">{row.attendance.minutesAttended}m</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </DeskSheet>
        </div>
      </div>
    </div>
  );
}
