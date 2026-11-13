import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Radio, Users, Video } from "lucide-react";
import { getAttendanceForProfile, getCohortForProfile } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "My cohort" };

export default async function LearnerCohortPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [cohort, attendance] = await Promise.all([
    getCohortForProfile(user.profileId),
    getAttendanceForProfile(user.profileId),
  ]);

  if (!cohort) {
    return (
      <div className="admin-card p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-stone-300" />
        <p className="mt-2 font-serif text-lg text-navy">You are not in a cohort yet.</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] text-stone-600">
          Your programme team will place you in an eligible cohort. Keep learning from your enrolled courses
          while the next teaching schedule is prepared.
        </p>
        <Link href="/events" className="mt-3 inline-flex h-9 items-center rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper">
          View live events
        </Link>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/purity -- This dynamic Server Component reads the current request time.
  const now = Date.now();
  const currentWeek =
    cohort.weeks.find((week) => week.startsAt && week.endsAt && week.startsAt.getTime() <= now && week.endsAt.getTime() >= now) ??
    cohort.weeks[0];
  const learners = cohort.members.filter((member) => member.member.role === "learner");
  const faculty = cohort.members.filter((member) => member.member.role !== "learner");
  const present = attendance.filter((row) => row.attendance.status === "present" || row.attendance.status === "late").length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-navy/10">
        <img src={cohort.cohort.coverImageUrl ?? "/images/community.jpg"} alt="" className="h-40 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/55 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
            {cohort.cohort.status} · {cohort.levelName ?? "Purpose Course"}
          </p>
          <p className="mt-1 font-serif text-xl text-paper sm:text-2xl">{cohort.cohort.name}</p>
          <p className="mt-1 max-w-lg text-[11.5px] leading-relaxed text-paper/75">{cohort.cohort.description}</p>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.1em] text-paper/60">
            {formatDate(cohort.cohort.startsAt, "short")} → {formatDate(cohort.cohort.endsAt, "short")} · {cohort.cohort.cadence}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Learners", value: learners.length },
          { label: "Faculty", value: faculty.length },
          { label: "Weeks", value: cohort.weeks.length },
          { label: "Attendance", value: `${present}/${attendance.length}` },
        ].map((card) => (
          <div key={card.label} className="admin-card p-3.5">
            <p className="font-serif text-xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
              <CalendarDays className="h-3.5 w-3.5 text-gold-dark" /> Eight-week rhythm
            </p>
          </div>
          <ol className="divide-y divide-navy/8">
            {cohort.weeks.map((week) => {
              const active = currentWeek?.id === week.id;
              return (
                <li key={week.id} className={`px-5 py-3 ${active ? "bg-cream/60" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-navy">
                      {active ? <CheckCircle2 className="h-3.5 w-3.5 text-gold-dark" /> : <span className="h-3.5 w-3.5 rounded-full border border-navy/20" />}
                      {week.title}
                    </p>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{week.theme}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-600">{week.focus}</p>
                  {week.assignmentBrief ? (
                    <p className="mt-1 rounded-md bg-paper px-2.5 py-1.5 text-[11px] leading-relaxed text-stone-600">
                      <strong className="text-navy">Brief:</strong> {week.assignmentBrief}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <Radio className="h-3.5 w-3.5 text-gold-dark" /> Cohort live sessions
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {cohort.sessions.map((session) => (
                <li key={session.id} className="px-5 py-2.5">
                  <p className="text-[12px] font-medium text-navy">{session.title}</p>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                    {formatDateTime(session.startsAt)} · {session.status}
                  </p>
                </li>
              ))}
              {cohort.sessions.length === 0 ? <li className="px-5 py-4 text-[12px] text-stone-500">No cohort sessions scheduled yet.</li> : null}
            </ul>
            <Link href="/learn/live" className="flex items-center justify-between border-t border-navy/8 px-5 py-2.5 text-[11px] font-semibold text-gold-dark hover:bg-cream/40">
              <span className="inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5" /> All live sessions</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Faculty & peers</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {cohort.members.map((member) => (
                <li key={member.member.id} className="flex items-center justify-between gap-2 px-5 py-2">
                  <div>
                    <p className="text-[12px] font-medium text-navy">{member.fullName}</p>
                    <p className="text-[10px] text-stone-500">{member.title ?? "Participant"}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${member.member.role === "learner" ? "bg-cream text-stone-600" : "bg-navy text-paper"}`}>
                    {member.member.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">My attendance</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {attendance.slice(0, 6).map((row) => (
                <li key={row.attendance.id} className="flex items-center justify-between gap-2 px-5 py-2">
                  <p className="min-w-0 flex-1 truncate text-[11.5px] text-navy">{row.sessionTitle}</p>
                  <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-500">{row.attendance.status}</span>
                </li>
              ))}
              {attendance.length === 0 ? <li className="px-5 py-4 text-[12px] text-stone-500">Not marked yet.</li> : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
