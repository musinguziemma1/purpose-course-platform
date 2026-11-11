import { CalendarCheck2, CalendarPlus, CheckCircle2, MessageSquareQuote, UserRound } from "lucide-react";
import { CoachingRequestForm } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "My mentor" };

const STATUS_TONE: Record<string, string> = {
  requested: "bg-amber-50 text-amber-800 border-amber-200",
  scheduled: "bg-[#e3eff0] text-[#155e63] border-[#bcd9db]",
  completed: "bg-source/5 text-source border-source/25",
  cancelled: "bg-stone-50 text-stone-600 border-stone-200",
};

export default async function StudentMentorPage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  const { mentor, coaching, upcomingCoaching } = workspace;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Mentorship & coaching</h1>
        <p className="text-[12.5px] text-stone-600">
          Clarity sessions are part of the Intermediate level. Bring work, not admiration.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="space-y-5">
          <div className="admin-card p-5">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#155e63] font-serif text-lg text-paper">
                {mentor
                  ? mentor.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                  : "PC"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#155e63]">
                  <UserRound className="h-3 w-3" /> Your clarity coach
                </p>
                <p className="mt-1 font-serif text-xl text-navy">{mentor?.fullName ?? "Matching in progress"}</p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">{mentor?.title ?? "Purpose Course faculty"}</p>
                {mentor?.bio ? <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600">{mentor.bio}</p> : null}
              </div>
            </div>
            {upcomingCoaching[0] ? (
              <div className="mt-4 rounded-lg border border-[#bcd9db] bg-[#e3eff0]/60 px-3.5 py-3">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#155e63]">
                  <CalendarCheck2 className="h-3 w-3" /> Next confirmed session
                </p>
                <p className="mt-1 text-[13px] font-medium text-navy">{upcomingCoaching[0].title}</p>
                <p className="text-[11.5px] text-stone-600">
                  {formatDateTime(upcomingCoaching[0].scheduledAt)} · {upcomingCoaching[0].durationMinutes} minutes
                </p>
              </div>
            ) : null}
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Session history & notes</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {coaching.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-stone-500">No sessions yet — request your first one.</li>
              ) : (
                coaching.map((session) => (
                  <li key={session.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-serif text-[15px] text-navy">{session.title}</p>
                        <p className="text-[11px] text-stone-500">
                          {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${STATUS_TONE[session.status] ?? "border-stone-200 bg-stone-50 text-stone-600"}`}
                      >
                        {session.status}
                      </span>
                    </div>
                    {session.focus ? (
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-stone-600">Focus: {session.focus}</p>
                    ) : null}
                    {session.mentorNotes ? (
                      <p className="mt-2 inline-flex gap-2 rounded-md border border-source/20 bg-source/5 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-700">
                        <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-source" />
                        {session.mentorNotes}
                      </p>
                    ) : session.status === "completed" ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-stone-500">
                        <CheckCircle2 className="h-3 w-3 text-source" /> Completed — notes will appear here shortly.
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="admin-card p-5 xl:sticky xl:top-24">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
            <CalendarPlus className="h-3.5 w-3.5 text-gold-dark" /> Request a session
          </p>
          <p className="mt-0.5 text-[11.5px] text-stone-500">
            Your mentor confirms the time, or proposes an alternative.
          </p>
          <div className="mt-3">
            <CoachingRequestForm />
          </div>
        </div>
      </div>
    </div>
  );
}
