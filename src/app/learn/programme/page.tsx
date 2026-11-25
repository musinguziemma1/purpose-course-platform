import { CheckCircle2, Circle, Clock, Info } from "lucide-react";
import Link from "next/link";
import { SessionToggle } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { accentClasses } from "@/components/site/principle-icon";
import { cn } from "@/lib/utils";
import { BrassDial, Chip, DeskHeading, LearnHero } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Programme" };

/* An enamel level badge: the level's own colour under a domed highlight. */
const ENAMEL = "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-3px_4px_rgba(0,0,0,0.3),0_0_0_2px_#e3c463,0_0_0_3px_#8f6f12,0_3px_6px_rgba(10,26,48,0.35)]";

export default async function StudentProgrammePage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  const { enrollment, programmeGroups, sessions, completedIds, level, completedInLevel, levelSessions, totalSessions, completedTotal, programmeModules } = workspace;
  const overall = totalSessions ? Math.round((completedTotal / totalSessions) * 100) : 0;

  return (
    <div className="space-y-8">
      <LearnHero
        eyebrow="Self-reported checklist"
        title={`The ${totalSessions}-session programme checklist`}
        description={
          <>
            {completedTotal} of {totalSessions} sessions checked across your enrolments · {completedInLevel} of {levelSessions.length} in your current level ({level?.name ?? "not enrolled"}).
          </>
        }
        aside={<BrassDial value={overall} label="Self-reported checklist" caption={`${completedTotal}/${totalSessions} sessions`} size={148} />}
      />

      <div className="lk-well flex items-start gap-3 p-4 text-[14px] leading-relaxed text-stone-700">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#7a5d0d]" />
        <p>
          Record sessions you have attended or reviewed. This checklist does not complete digital lessons, pass assessments or issue certificates.{" "}
          <Link href="/learn/courses" className="font-semibold text-navy underline decoration-[#a5811a] decoration-2 underline-offset-4">
            Open digital lessons
          </Link>{" "}
          for recorded learning progress. Linked modules show the available digital material; some programme sessions do not yet have a published digital module.
        </p>
      </div>

      {programmeGroups.map(({ programme, levels }) => (
        <section key={programme.id} aria-labelledby={`programme-${programme.id}`} className="space-y-5">
          <div className="space-y-2">
            <DeskHeading id={`programme-${programme.id}`}>{programme.name}</DeskHeading>
            <p className="max-w-3xl text-[14px] leading-relaxed text-stone-600">{programme.description}</p>
          </div>

          {levels.map((programmeLevel) => {
            const accent = accentClasses(programmeLevel.accent);
            const sessionsForLevel = sessions.filter((session) => session.levelId === programmeLevel.id);
            const isMine = level?.id === programmeLevel.id;
            const done = sessionsForLevel.filter((session) => completedIds.has(session.id)).length;
            return (
              <section key={programmeLevel.id} className={cn("lk-paper overflow-hidden", isMine && "lk-stack")}>
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(120,96,52,0.16)] px-5 py-4 sm:px-6",
                    isMine && "bg-[linear-gradient(180deg,#fbf3dc,#fffdf8)]",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-lg text-paper", accent.bg, ENAMEL)}>
                      {programmeLevel.levelNumber}
                    </span>
                    <div>
                      <h3 className="font-serif text-[1.2rem] text-navy">
                        {programmeLevel.name} <span className="text-stone-600">· {programmeLevel.tagline}</span>
                      </h3>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                        {programmeLevel.weeks} weeks · {done}/{sessionsForLevel.length} checked
                      </p>
                    </div>
                  </div>
                  {isMine ? <Chip tone="gold">Your current level</Chip> : <Chip>Preview</Chip>}
                </div>
                <ul className="lk-ledger px-3 sm:px-4">
                  {sessionsForLevel.map((session) => {
                    const completed = completedIds.has(session.id);
                    const modules = programmeModules.filter((module) => module.sessionCode === session.code && module.levelId === programmeLevel.id);
                    return (
                      <li key={session.id} id={`session-${session.id}`} className="scroll-mt-24 px-2 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#7a5d0d]">
                              {completed ? <CheckCircle2 aria-hidden className="h-4 w-4 text-source" /> : <Circle aria-hidden className="h-4 w-4 text-stone-400" />}
                              {session.code}
                              <span className="sr-only">{completed ? " (checked)" : " (not checked)"}</span>
                            </p>
                            <h4 className="mt-1 font-serif text-[1.1rem] leading-snug text-navy">{session.title}</h4>
                          </div>
                          {isMine && enrollment?.status === "enrolled" ? <SessionToggle sessionId={session.id} completed={completed} compact /> : null}
                        </div>
                        <p className="mt-2 text-[14px] leading-relaxed text-stone-600">{session.summary}</p>
                        <div className="mt-2 text-[13px] text-stone-600">
                          {modules.length ? (
                            <ul className="space-y-1">
                              {modules.map((module) => (
                                <li key={module.id}>
                                  <Link href={`/learn/courses/${module.courseSlug}`} className="font-semibold text-navy underline decoration-[#a5811a] decoration-2 underline-offset-4">
                                    {module.title}
                                  </Link>{" "}
                                  · {module.lessons} published digital lessons
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>Digital module not yet published for this session.</p>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Chip icon={Clock}>{session.durationMinutes} min</Chip>
                          <Chip>{session.format}</Chip>
                          {session.focusQuestions.map((question) => (
                            <Chip key={question} className="whitespace-normal font-medium">
                              {question}
                            </Chip>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </section>
      ))}
    </div>
  );
}
