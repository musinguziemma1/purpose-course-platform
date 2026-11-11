import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PrincipleIcon, accentClasses } from "@/components/site/principle-icon";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type Level = {
  id: number;
  slug: string;
  name: string;
  levelNumber: number;
  tagline: string;
  description: string;
  accent: string;
  icon: string;
  weeks: number;
  sessions: { id: number; code: string; title: string }[];
};

export function ProgrammeRail({ levels }: { levels: Level[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-4">
      {levels.map((level, index) => {
        const accent = accentClasses(level.accent);
        return (
          <Reveal key={level.id} delay={index * 0.08} className="relative">
            <article className={cn("interactive flex h-full flex-col rounded-xl border bg-paper p-5", accent.border, "border-t-4")}>
              <div className="flex items-start justify-between">
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-full font-serif text-xl text-paper", accent.bg)}>
                  {level.levelNumber}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-navy/10 bg-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy">
                    {level.weeks} weeks
                  </span>
                  <PrincipleIcon icon={level.icon} accent={level.accent} size="sm" />
                </div>
              </div>

              <h3 className="mt-5 font-serif text-2xl text-navy">{level.name} Level</h3>
              <p className={cn("mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]", accent.fg)}>{level.tagline}</p>
              <p className="mt-3 line-clamp-4 text-[13.5px] leading-relaxed text-stone-600">{level.description}</p>

              <div className="mt-5 flex-1">
                <p className={cn("rounded-t-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper", accent.bg)}>
                  Sessions
                </p>
                <ul className="divide-y divide-navy/8 overflow-hidden rounded-b-md border border-t-0 border-navy/10">
                  {level.sessions.map((session) => (
                    <li key={session.id} className="flex gap-2.5 px-3 py-2.5 text-[12.5px]">
                      <span className={cn("w-16 shrink-0 font-semibold", accent.fg)}>{session.code}</span>
                      <span className="leading-snug text-stone-700">{session.title}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/course#${level.slug}`}
                className={cn("mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]", accent.fg)}
              >
                View level <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
            {index < levels.length - 1 ? (
              <span className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 text-navy/25 lg:block" aria-hidden>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            ) : null}
          </Reveal>
        );
      })}
    </div>
  );
}

export function LevelOutcomes({ outcomes, accent }: { outcomes: string[]; accent: string }) {
  return (
    <ul className="mt-5 grid gap-2.5">
      {outcomes.map((outcome) => (
        <li key={outcome} className="flex gap-2.5 text-sm text-stone-700">
          <span className={cn("mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full", accentClasses(accent).soft)}>
            <Check className={cn("h-3 w-3", accentClasses(accent).fg)} />
          </span>
          {outcome}
        </li>
      ))}
    </ul>
  );
}
