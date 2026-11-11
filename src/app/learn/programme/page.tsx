import { CheckCircle2, Circle, Clock } from "lucide-react";
import { SessionToggle } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { accentClasses } from "@/components/site/principle-icon";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Programme" };

export default async function StudentProgrammePage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  const { levels, sessions, completedIds, level, completedInLevel, levelSessions, totalSessions, completedTotal } = workspace;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">The 15-session programme</h1>
          <p className="text-[12.5px] text-stone-600">
            {completedTotal} of {totalSessions} sessions complete overall · {completedInLevel} of {levelSessions.length} in your
            current level ({level?.name ?? "—"}).
          </p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-paper px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Overall progress</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-cream">
              <span
                className="block h-full rounded-full bg-gold"
                style={{ width: `${totalSessions ? Math.round((completedTotal / totalSessions) * 100) : 0}%` }}
              />
            </span>
            <span className="text-[11px] font-semibold text-navy">
              {totalSessions ? Math.round((completedTotal / totalSessions) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {levels.map((programmeLevel) => {
        const accent = accentClasses(programmeLevel.accent);
        const sessionsForLevel = sessions.filter((session) => session.levelId === programmeLevel.id);
        const isMine = level?.id === programmeLevel.id;
        const done = sessionsForLevel.filter((session) => completedIds.has(session.id)).length;
        return (
          <section key={programmeLevel.id} className="admin-card overflow-hidden">
            <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 px-5 py-4", isMine ? "bg-cream/60" : "")}>
              <div className="flex items-center gap-3">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-full font-serif text-lg text-paper", accent.bg)}>
                  {programmeLevel.levelNumber}
                </span>
                <div>
                  <p className="font-serif text-lg text-navy">
                    {programmeLevel.name} <span className="text-stone-400">· {programmeLevel.tagline}</span>
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">
                    {programmeLevel.weeks} weeks · {done}/{sessionsForLevel.length} complete
                  </p>
                </div>
              </div>
              {isMine ? (
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-paper", accent.bg)}>
                  your current level
                </span>
              ) : (
                <span className="rounded-full border border-navy/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                  {isMine ? "" : "preview"}
                </span>
              )}
            </div>
            <ul className="divide-y divide-navy/8">
              {sessionsForLevel.map((session) => {
                const completed = completedIds.has(session.id);
                return (
                  <li key={session.id} id={`session-${session.id}`} className="scroll-mt-24 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                          {completed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-source" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-stone-300" />
                          )}
                          <span className={accent.fg}>{session.code}</span>
                        </p>
                        <p className="mt-1 font-serif text-[16px] leading-snug text-navy">{session.title}</p>
                      </div>
                      {isMine ? <SessionToggle sessionId={session.id} completed={completed} compact /> : null}
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone-600">{session.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[10px] text-stone-600">
                        <Clock className="h-2.5 w-2.5" /> {session.durationMinutes} min
                      </span>
                      <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-stone-600">{session.format}</span>
                      {session.focusQuestions.map((question) => (
                        <span key={question} className="rounded-full border border-navy/10 px-2 py-0.5 text-[10px] text-stone-500">
                          {question}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
