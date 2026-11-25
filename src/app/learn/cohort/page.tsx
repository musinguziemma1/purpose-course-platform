import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardCheck, GraduationCap, Radio, Users, Video } from "lucide-react";
import { getAttendanceForProfile, getCohortForProfile } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { cn, formatDate, formatDateTime, initials } from "@/lib/utils";
import { Chip, Coin, EmptyDesk, LeatherChip, LearnHero, Panel, PinnedPhoto, StatPlaque, btn, statusTone } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "My cohort" };

export default async function LearnerCohortPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [cohort, attendance] = await Promise.all([getCohortForProfile(user.profileId), getAttendanceForProfile(user.profileId)]);

  if (!cohort) {
    return (
      <div className="space-y-7">
        <LearnHero size="md" eyebrow="Learning together" title="My cohort" />
        <EmptyDesk
          icon={Users}
          title="You are not in a cohort yet."
          description="Your programme team will place you in an eligible cohort. Keep learning from your enrolled courses while the next teaching schedule is prepared."
          action={
            <Link href="/events" className={btn.navy}>
              View live events
            </Link>
          }
        />
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/purity -- This dynamic Server Component reads the current request time.
  const now = Date.now();
  const currentWeek =
    cohort.weeks.find((week) => week.startsAt && week.endsAt && week.startsAt.getTime() <= now && week.endsAt.getTime() >= now) ?? cohort.weeks[0];
  const learners = cohort.members.filter((member) => member.member.role === "learner");
  const faculty = cohort.members.filter((member) => member.member.role !== "learner");
  const present = attendance.filter((row) => row.attendance.status === "present" || row.attendance.status === "late").length;

  return (
    <div className="space-y-7">
      <LearnHero
        eyebrow={`${cohort.cohort.status} · ${cohort.levelName ?? "Purpose Course"}`}
        title={cohort.cohort.name}
        description={cohort.cohort.description}
        meta={
          <>
            <LeatherChip icon={CalendarDays}>
              {formatDate(cohort.cohort.startsAt, "short")} → {formatDate(cohort.cohort.endsAt, "short")}
            </LeatherChip>
            <LeatherChip>{cohort.cohort.cadence}</LeatherChip>
          </>
        }
        aside={<PinnedPhoto src={cohort.cohort.coverImageUrl ?? "/images/community.jpg"} alt="" className="hidden h-48 w-64 sm:block" />}
      />

      <section aria-label="Cohort at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatPlaque label="Learners" value={learners.length} icon={Users} />
        <StatPlaque label="Faculty" value={faculty.length} icon={GraduationCap} />
        <StatPlaque label="Weeks" value={cohort.weeks.length} icon={CalendarDays} />
        <StatPlaque label="Attendance" value={`${present}/${attendance.length}`} icon={ClipboardCheck} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <Panel title="Eight-week rhythm" icon={CalendarDays} stacked>
          {/* A timeline pinned with brass tacks; this week's tack is lit. */}
          <ol className="relative space-y-1 before:absolute before:inset-y-3 before:left-[11px] before:w-px before:bg-[rgba(165,129,26,0.45)]">
            {cohort.weeks.map((week) => {
              const active = currentWeek?.id === week.id;
              return (
                <li key={week.id} className={cn("relative rounded-xl py-3 pl-9 pr-3", active && "bg-[linear-gradient(180deg,#fbf3dc,#fffaf0)] shadow-[inset_0_0_0_1px_rgba(165,129,26,0.35)]")}>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[5px] top-4 h-[13px] w-[13px] rounded-full border",
                      active
                        ? "border-[#7a5d0d] bg-[radial-gradient(circle_at_35%_30%,#fff4c8,#c9a227_60%,#8f6f12)] shadow-[0_0_0_4px_rgba(201,162,39,0.22)]"
                        : "border-[rgba(18,42,77,0.3)] bg-[radial-gradient(circle_at_35%_30%,#ffffff,#e4dccb)]",
                    )}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-navy">
                      {week.title}
                      {active ? <span className="sr-only"> (this week)</span> : null}
                    </p>
                    <div className="flex items-center gap-2">
                      {active ? <Chip tone="gold">This week</Chip> : null}
                      <span className="text-[12px] uppercase tracking-[0.08em] text-stone-600">{week.theme}</span>
                    </div>
                  </div>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-stone-600">{week.focus}</p>
                  {week.assignmentBrief ? (
                    <p className="lk-well mt-2 px-3 py-2 text-[13px] leading-relaxed text-stone-700">
                      <strong className="text-navy">Brief:</strong> {week.assignmentBrief}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Panel>

        <div className="space-y-5">
          <Panel
            title="Cohort live sessions"
            icon={Radio}
            action={
              <Link href="/learn/live" className="lk-link">
                <Video aria-hidden className="h-4 w-4" /> All live sessions <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            }
            bodyClassName="px-3 pb-3 pt-2 sm:px-4"
          >
            <ul className="lk-ledger">
              {cohort.sessions.map((session) => (
                <li key={session.id} className="flex items-center gap-3 px-2 py-3">
                  <span aria-hidden className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-[rgba(120,96,52,0.22)] bg-[#fffaf0] py-1 leading-none">
                    <span className="text-[12px] font-bold uppercase text-[#9b2c35]">{new Intl.DateTimeFormat("en-GB", { month: "short" }).format(session.startsAt)}</span>
                    <span className="font-serif text-[1.15rem] text-navy">{new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(session.startsAt)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-navy">{session.title}</p>
                    <p className="text-[12px] text-stone-600">{formatDateTime(session.startsAt)}</p>
                  </div>
                  <Chip tone={statusTone(session.status)}>{session.status}</Chip>
                </li>
              ))}
              {cohort.sessions.length === 0 ? <li className="px-2 py-4 text-[14px] text-stone-600">No cohort sessions scheduled yet.</li> : null}
            </ul>
          </Panel>

          <Panel title="Faculty & peers" icon={Users} bodyClassName="px-3 pb-3 pt-2 sm:px-4">
            <ul className="lk-ledger">
              {cohort.members.map((member) => (
                <li key={member.member.id} className="flex items-center gap-3 px-2 py-2.5">
                  <Coin tone={member.member.role === "learner" ? "brass" : "navy"} className="h-9 w-9 text-[12px]">
                    {initials(member.fullName)}
                  </Coin>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-navy">{member.fullName}</p>
                    <p className="text-[12px] text-stone-600">{member.title ?? "Participant"}</p>
                  </div>
                  <Chip tone={member.member.role === "learner" ? "plain" : "navy"}>{member.member.role}</Chip>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="My attendance" icon={ClipboardCheck} bodyClassName="px-3 pb-3 pt-2 sm:px-4">
            <ul className="lk-ledger">
              {attendance.slice(0, 6).map((row) => (
                <li key={row.attendance.id} className="flex items-center justify-between gap-2 px-2 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-[14px] text-navy">{row.sessionTitle}</p>
                  <Chip tone={statusTone(row.attendance.status)}>{row.attendance.status}</Chip>
                </li>
              ))}
              {attendance.length === 0 ? <li className="px-2 py-4 text-[14px] text-stone-600">Not marked yet.</li> : null}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
