import Link from "next/link";
import { Bell, CalendarClock, Flag, NotebookPen, Target, UserRound } from "lucide-react";
import { getAttendanceForProfile, getLearnerFlags, getLearnerGoals, getMentoringNotes } from "@/db/learning";
import { getPreferences } from "@/lib/notifications";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Chip, Groove, LeatherFigures, LearnHero, Panel, StickyNote, statusTone } from "@/components/learn/kit";
import { PreferenceList } from "@/components/learn/preference-list";

export const dynamic = "force-dynamic";

export const metadata = { title: "Goals & mentor" };

export default async function LearnerGoalsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [goals, notes, flags, attendance, preferences] = await Promise.all([
    getLearnerGoals(user.profileId),
    getMentoringNotes(user.profileId),
    getLearnerFlags(user.profileId),
    getAttendanceForProfile(user.profileId),
    getPreferences(user.profileId),
  ]);

  const activeGoals = goals.filter((row) => row.goal.status === "active");
  const present = attendance.filter((row) => row.attendance.status === "present" || row.attendance.status === "late").length;

  return (
    <div className="space-y-7">
      <LearnHero
        eyebrow="Set with your mentor"
        title="Goals & mentorship"
        description="Development goals set with your mentor, their session notes, attendance and the notifications you receive."
        aside={
          <LeatherFigures
            items={[
              { label: "Active goals", value: activeGoals.length },
              { label: "Achieved", value: goals.filter((row) => row.goal.status === "achieved").length },
              { label: "Mentor notes", value: notes.length },
              { label: "Attendance", value: `${present}/${attendance.length}` },
            ]}
          />
        }
      />

      {flags.length > 0 ? (
        <div role="note" className="lk-note max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6b4a05]">
            <Flag aria-hidden className="h-4 w-4" /> Your mentor would like to check in
          </p>
          <ul className="mt-2 space-y-1.5">
            {flags.map((row) => (
              <li key={row.flag.id} className="font-serif text-[15px] italic leading-relaxed">
                {row.flag.reason}{" "}
                <Link href="/learn/mentor" className="not-italic font-sans text-[14px] font-semibold text-navy underline decoration-[#a5811a] decoration-2 underline-offset-4">
                  Book a conversation
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="space-y-6">
          <Panel title="Development goals" icon={Target} stacked>
            <ul className="space-y-4">
              {goals.map(({ goal, mentorName }, index) => (
                <li key={goal.id} className="lk-well p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold text-navy">{goal.title}</p>
                    <Chip tone={goal.status === "active" ? "gold" : statusTone(goal.status)}>{goal.status}</Chip>
                  </div>
                  {goal.description ? <p className="mt-1 text-[14px] leading-relaxed text-stone-600">{goal.description}</p> : null}
                  <div className="mt-3 flex items-center gap-3">
                    <Groove value={goal.progress} label={`${goal.title} progress`} className="flex-1" index={Math.min(index, 6)} />
                    <span className="text-[13px] font-semibold tabular-nums text-navy">{goal.progress}%</span>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] uppercase tracking-[0.08em] text-stone-600">
                    <span className="inline-flex items-center gap-1">
                      <UserRound aria-hidden className="h-3.5 w-3.5" /> {mentorName ?? "Mentor"}
                    </span>
                    {goal.dueAt ? <span>Due {formatDate(goal.dueAt, "short")}</span> : null}
                  </p>
                  {goal.reviewNotes ? (
                    <StickyNote from="Review" className="mt-3" tilt={index % 2 ? "right" : "left"}>
                      {goal.reviewNotes}
                    </StickyNote>
                  ) : null}
                </li>
              ))}
              {goals.length === 0 ? <li className="py-4 text-[14px] text-stone-600">No goals set yet — ask your mentor.</li> : null}
            </ul>
          </Panel>

          <Panel title="Mentor session notes" icon={NotebookPen}>
            {notes.length ? (
              <ul className="grid gap-5 sm:grid-cols-2">
                {notes.map(({ note, mentorName }, index) => (
                  <li key={note.id}>
                    <StickyNote from={mentorName} meta={formatDateTime(note.createdAt)} tilt={index % 2 ? "right" : "left"}>
                      {note.body}
                    </StickyNote>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-stone-600">No notes shared yet.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Attendance history" icon={CalendarClock} bodyClassName="px-3 pb-3 pt-2 sm:px-4">
            <ul className="lk-ledger">
              {attendance.map((row) => (
                <li key={row.attendance.id} className="flex flex-wrap items-center gap-2.5 px-2 py-3">
                  <Chip tone={statusTone(row.attendance.status)}>{row.attendance.status}</Chip>
                  <p className="min-w-0 flex-1 truncate text-[14px] text-navy">{row.sessionTitle}</p>
                  <span className="text-[13px] text-stone-600">{formatDate(row.startsAt, "short")}</span>
                </li>
              ))}
              {attendance.length === 0 ? <li className="px-2 py-5 text-[14px] text-stone-600">No attendance recorded yet.</li> : null}
            </ul>
          </Panel>

          <Panel title="Notification preferences" icon={Bell} bodyClassName="px-3 pb-2 pt-2 sm:px-4">
            <PreferenceList preferences={preferences} />
            <p className="lk-well mt-2 px-3 py-2.5 text-[13px] leading-relaxed text-stone-600">
              Email and push are queued to the platform outbox; in-app notifications appear in the bell.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
