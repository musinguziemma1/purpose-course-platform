import { CalendarClock, CheckCircle2, Clock, XCircle } from "lucide-react";
import { CompleteSessionForm, ScheduleSessionForm } from "@/components/mentor/forms";
import { getFirstMentorId, getMentorWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { respondToRequest } from "@/app/actions/mentorship";

export const dynamic = "force-dynamic";

export const metadata = { title: "Coaching sessions" };

export default async function MentorSessionsPage() {
  const user = await getSessionUser();
  const mentorId = user?.roleSlug === "admin" ? await getFirstMentorId() : user?.profileId ?? "";
  const workspace = mentorId ? await getMentorWorkspace(mentorId) : null;
  if (!workspace) return <p className="admin-card p-8 text-sm text-stone-600">Sign in with a mentor account.</p>;

  const groups = [
    {
      key: "requested",
      title: "Requests to confirm",
      icon: Clock,
      rows: workspace.requested,
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    },
    {
      key: "scheduled",
      title: "Confirmed & upcoming",
      icon: CalendarClock,
      rows: workspace.sessions.filter((row) => row.session.status === "scheduled"),
      tone: "border-[#bcd9db] bg-[#e3eff0] text-[#155e63]",
    },
    {
      key: "completed",
      title: "Completed",
      icon: CheckCircle2,
      rows: workspace.completed,
      tone: "border-source/30 bg-source/5 text-source",
    },
    {
      key: "cancelled",
      title: "Cancelled",
      icon: XCircle,
      rows: workspace.sessions.filter((row) => row.session.status === "cancelled"),
      tone: "border-stone-200 bg-stone-50 text-stone-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Coaching sessions</h1>
        <p className="text-[12.5px] text-stone-600">
          Confirm requests, run the session, then record notes. Students see the notes in their learning record.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="admin-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
                <p className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
                  <group.icon className="h-3.5 w-3.5" /> {group.title}
                </p>
                <span className="rounded-full bg-cream px-2 py-0.5 text-[10.5px] font-semibold text-stone-600">
                  {group.rows.length}
                </span>
              </div>
              <ul className="divide-y divide-navy/8">
                {group.rows.length === 0 ? (
                  <li className="px-5 py-6 text-[12px] text-stone-500">Nothing here.</li>
                ) : (
                  group.rows.map((row) => (
                    <li key={row.session.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-serif text-[16px] leading-snug text-navy">{row.session.title}</p>
                          <p className="text-[11.5px] text-stone-500">
                            {row.studentName} · {formatDateTime(row.session.scheduledAt)} · {row.session.durationMinutes} min
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${group.tone}`}>
                          {row.session.status}
                        </span>
                      </div>

                      {row.session.focus ? (
                        <p className="mt-2 rounded-md bg-cream/70 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-600">
                          Focus: {row.session.focus}
                        </p>
                      ) : null}

                      {row.session.status === "requested" ? (
                        <div className="mt-2.5 flex gap-2">
                          <form action={respondToRequest}>
                            <input type="hidden" name="sessionId" value={row.session.id} />
                            <input type="hidden" name="decision" value="accept" />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#155e63] px-3 text-[11px] font-semibold text-paper hover:bg-[#124a4e]"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Confirm time
                            </button>
                          </form>
                          <form action={respondToRequest}>
                            <input type="hidden" name="sessionId" value={row.session.id} />
                            <input type="hidden" name="decision" value="decline" />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center rounded-full border border-navy/15 px-3 text-[11px] font-medium text-navy hover:bg-cream"
                            >
                              Decline
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {row.session.status === "scheduled" || row.session.status === "completed" ? (
                        <CompleteSessionForm sessionId={row.session.id} existingNotes={row.session.mentorNotes} />
                      ) : null}

                      {row.session.status === "completed" && row.session.mentorNotes ? (
                        <p className="mt-2 rounded-md border border-source/20 bg-source/5 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-700">
                          Shared notes: {row.session.mentorNotes}
                        </p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-5 xl:sticky xl:top-24">
          <div className="admin-card p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Schedule a session</p>
            <p className="mt-0.5 text-[11.5px] text-stone-500">
              Book a clarity session with anyone on the student directory.
            </p>
            <div className="mt-3">
              <ScheduleSessionForm
                students={workspace.students.map((student) => ({ profileId: student.profileId, fullName: student.fullName }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#bcd9db] bg-[#e3eff0]/60 p-4 text-[11.5px] leading-relaxed text-stone-700">
            <p className="font-semibold text-[#155e63]">Coaching rhythm</p>
            <p className="mt-1">
              Every clarity session should leave the student with one named gift, one honest gap and one action they
              can complete before the next meeting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
