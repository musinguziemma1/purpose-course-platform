import Link from "next/link";
import { Bell, CalendarClock, Flag, NotebookPen, Target, UserRound } from "lucide-react";
import { getAttendanceForProfile, getLearnerFlags, getLearnerGoals, getMentoringNotes } from "@/db/learning";
import { getPreferences } from "@/lib/notifications";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";
import { updateNotificationPreference } from "@/app/actions/platform";

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
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Goals & mentorship</h1>
        <p className="text-[12.5px] text-stone-600">
          Development goals set with your mentor, their session notes, attendance and the notifications you receive.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Active goals", value: activeGoals.length, icon: Target },
          { label: "Achieved", value: goals.filter((row) => row.goal.status === "achieved").length, icon: Flag },
          { label: "Mentor notes", value: notes.length, icon: NotebookPen },
          { label: "Attendance", value: `${present}/${attendance.length}`, icon: CalendarClock },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      {flags.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-amber-900">
            <Flag className="h-3.5 w-3.5" /> Your mentor would like to check in
          </p>
          <ul className="mt-1.5 space-y-1">
            {flags.map((row) => (
              <li key={row.flag.id} className="text-[12px] leading-relaxed text-amber-900">
                {row.flag.reason}{" "}
                <Link href="/learn/mentor" className="font-semibold underline decoration-amber-400 underline-offset-2">
                  Book a conversation
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="space-y-4">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Development goals</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {goals.map(({ goal, mentorName }) => (
                <li key={goal.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-navy">{goal.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${goal.status === "achieved" ? "bg-source/10 text-source" : goal.status === "deferred" ? "bg-stone-100 text-stone-500" : "bg-gold/15 text-gold-dark"}`}>
                      {goal.status}
                    </span>
                  </div>
                  {goal.description ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-600">{goal.description}</p> : null}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${goal.progress}%` }} />
                    </span>
                    <span className="text-[10px] font-semibold text-navy">{goal.progress}%</span>
                    {goal.dueAt ? <span className="text-[10px] text-stone-500">due {formatDate(goal.dueAt, "short")}</span> : null}
                  </div>
                  {goal.reviewNotes ? (
                    <p className="mt-1 rounded-md bg-cream/60 px-2 py-1 text-[11px] leading-relaxed text-stone-600">
                      Review: {goal.reviewNotes}
                    </p>
                  ) : null}
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-stone-400">
                    <UserRound className="h-2.5 w-2.5" /> {mentorName ?? "Mentor"}
                  </p>
                </li>
              ))}
              {goals.length === 0 ? <li className="px-5 py-6 text-[12px] text-stone-500">No goals set yet — ask your mentor.</li> : null}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Mentor session notes</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {notes.map(({ note, mentorName }) => (
                <li key={note.id} className="px-5 py-3">
                  <p className="text-[12px] leading-relaxed text-stone-700">{note.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-stone-400">
                    {mentorName} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
              {notes.length === 0 ? <li className="px-5 py-5 text-[12px] text-stone-500">No notes shared yet.</li> : null}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <CalendarClock className="h-3.5 w-3.5" /> Attendance history
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {attendance.map((row) => (
                <li key={row.attendance.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${row.attendance.status === "present" ? "bg-source/10 text-source" : row.attendance.status === "late" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-500"}`}>
                    {row.attendance.status}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[12px] text-navy">{row.sessionTitle}</p>
                  <span className="text-[10px] text-stone-500">{formatDate(row.startsAt, "short")}</span>
                </li>
              ))}
              {attendance.length === 0 ? <li className="px-5 py-5 text-[12px] text-stone-500">No attendance recorded yet.</li> : null}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-navy/10 px-5 py-3">
              <Bell className="h-3.5 w-3.5 text-gold-dark" />
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Notification preferences</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {preferences.map((preference) => (
                <li key={preference.category} className="px-5 py-2.5">
                  <form action={updateNotificationPreference} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="category" value={preference.category} />
                    <p className="min-w-0 flex-1 text-[12px] capitalize text-navy">{preference.category}</p>
                    {([
                      ["inApp", "In-app", preference.inApp],
                      ["email", "Email", preference.email],
                      ["push", "Push", preference.push],
                    ] as const).map(([name, label, checked]) => (
                      <label key={name} className="inline-flex items-center gap-1 text-[10px] text-stone-600">
                        <input type="checkbox" name={name} defaultChecked={checked} className="h-3 w-3 rounded border-navy/30" />
                        {label}
                      </label>
                    ))}
                    <button type="submit" className="rounded-full border border-navy/15 px-2 py-0.5 text-[10px] font-semibold text-navy hover:bg-cream">
                      Save
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <p className="border-t border-navy/8 bg-cream/40 px-5 py-2 text-[10px] leading-relaxed text-stone-500">
              Email and push are queued to the platform outbox; in-app notifications appear in the bell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
