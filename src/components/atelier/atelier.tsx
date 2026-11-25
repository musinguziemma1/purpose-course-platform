import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { InView } from "@/components/atelier/in-view";
import { PrincipleGlyph } from "@/components/atelier/icons";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/*
 * Atelier pieces for the public home and /course pages. Server components;
 * the only client code is <InView> (arms scroll reveals) and the Stagger
 * helpers. Styles live in app/(site)/atelier.css.
 */

type Principle = { name: string; question: string; color: string; icon: string };

/** Enamel medallion for a principle. */
export function Medal({ principle, size = "md", style }: { principle: Principle; size?: "sm" | "md" | "lg"; style?: CSSProperties }) {
  return (
    <span className="at-medal" data-size={size} style={{ "--c": principle.color, ...style } as CSSProperties}>
      <PrincipleGlyph icon={principle.icon} aria-hidden className={size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.8} />
    </span>
  );
}

export function WaxSeal({ children, tone, className, style }: { children: ReactNode; tone?: "gold" | "green" | "navy"; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("at-seal", className)} data-tone={tone} style={style}>
      <span>{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Bookshelf: pathways as clothbound books on an oak shelf
 * ------------------------------------------------------------------ */

type ShelfProgramme = {
  id: number;
  slug: string;
  name: string;
  description: string;
  duration: string;
  levels: { id: number; name: string; sessions: unknown[] }[];
};

export function Bookshelf({ programmes }: { programmes: ShelfProgramme[] }) {
  return (
    <Stagger className="grid gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
      {programmes.map((programme, index) => {
        const number = String(index + 1).padStart(2, "0");
        const sessions = programme.levels.reduce((total, level) => total + level.sessions.length, 0);
        return (
          <StaggerItem key={programme.id} className="at-shelf-item h-full">
            <Link href={`/course#${programme.slug}`} className="at-book" data-cloth={index % 5}>
              <p className="at-foil-dark relative z-[1] text-[11px] font-bold uppercase tracking-[0.24em]">Pathway {number}</p>
              <div className="at-book-label mt-4">
                <h3 className="font-serif text-[1.3rem] leading-tight">{programme.name}</h3>
                <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-stone-600">{programme.description}</p>
              </div>
              <div className="relative z-[1] mt-auto pt-6 text-center">
                <p aria-hidden className="at-foil-dark font-serif text-lg leading-none">❦</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ecd9a0]">{programme.duration}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ecd9a0]/80">
                  {programme.levels.length} levels · {sessions} sessions
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-paper">
                  Open the pathway <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
            <div aria-hidden className="at-plank" />
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/* ------------------------------------------------------------------ *
 * Newspaper masthead for the journal
 * ------------------------------------------------------------------ */

export function Masthead({ title, tagline, action }: { title: string; tagline: ReactNode; action?: ReactNode }) {
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <header className="at-masthead">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-navy/25 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">
        <span>Writing on purpose</span>
        <span className="hidden sm:inline">{today}</span>
        <span>Five principles · one journal</span>
      </div>
      <h2 className="py-5 text-center font-serif text-[clamp(2.5rem,7vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.025em] text-navy">{title}</h2>
      <div aria-hidden className="at-masthead-rule" />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5">
        <p className="font-serif text-[16px] italic text-stone-700">{tagline}</p>
        {action}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Parchment route map for the roadmap
 * ------------------------------------------------------------------ */

type Phase = { phase: string; title: string; status: string; body: string; ink: "green" | "gold" | "teal"; seal: "green" | "gold" | "navy" };

export function RouteMap({ phases }: { phases: Phase[] }) {
  return (
    <InView className="at-parchment px-5 pb-8 pt-4 sm:px-8">
      <div className="relative">
        <svg aria-hidden className="at-route pointer-events-none absolute inset-x-0 top-0 hidden h-24 w-full sm:block" viewBox="0 0 600 120" preserveAspectRatio="none">
          <path
            d="M 0 60 C 33 30, 66 60, 100 60 C 166 60, 233 100, 300 60 C 366 20, 433 60, 500 60 C 533 60, 566 30, 600 60"
            fill="none"
            stroke="#8a5a2b"
            strokeOpacity="0.75"
            strokeWidth="2.5"
            strokeDasharray="8 8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol className="relative grid gap-8 sm:grid-cols-3 sm:gap-5">
          {phases.map((phase, index) => (
            <li key={phase.phase} className="flex flex-col items-center">
              <div className="flex h-24 items-center">
                <WaxSeal tone={phase.seal} className="at-waypoint" style={{ "--d": `${250 + index * 480}ms` } as CSSProperties}>
                  {phase.phase}
                </WaxSeal>
              </div>
              <span aria-hidden className="h-5 w-px bg-[#8a5a2b]/55" />
              <div className="at-luggage w-full text-center">
                <p className="font-serif text-[17px] leading-snug text-navy">{phase.title}</p>
                <span className="at-stamp mt-2.5" data-ink={phase.ink}>
                  {phase.status}
                </span>
                <p className="mt-3 text-[13.5px] leading-relaxed text-stone-600">{phase.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </InView>
  );
}

/* ------------------------------------------------------------------ *
 * Envelope with a letter that slides out (newsletter)
 * ------------------------------------------------------------------ */

export function Envelope({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="at-envelope-shadow" />
      <InView className="at-envelope">
        <div aria-hidden className="at-envelope-flap" />
        <div aria-hidden className="at-envelope-back" />
        <div className="at-letter">{children}</div>
        <div aria-hidden className="at-envelope-pocket">
          <WaxSeal>P</WaxSeal>
        </div>
      </InView>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Course: card-catalogue drawer
 * ------------------------------------------------------------------ */

export function CatalogueDrawer({
  programmes,
  totals,
  details,
}: {
  programmes: { slug: string; name: string; levels: unknown[] }[];
  totals: { programmes: number; levels: number; sessions: number };
  details: [string, string][];
}) {
  const columns = Math.min(3, Math.max(1, programmes.length));
  const width = 100 / columns;
  return (
    <div className="at-catalogue">
      <ul aria-label="Pathways in the catalogue" className="at-guide-cards" style={{ height: `${programmes.length * 1.3 + 6.6}rem` }}>
        {programmes.map((programme, index) => (
          <li key={programme.slug} className="at-guide" style={{ "--i": index } as CSSProperties}>
            <Link
              href={`#${programme.slug}`}
              title={programme.name}
              className="at-guide-tab"
              style={{ "--tab": `${(index % columns) * width}%`, "--tab-w": `calc(${width}% - 0.4rem)` } as CSSProperties}
            >
              <span className="at-typecode text-gold-dark">{String(index + 1).padStart(2, "0")}</span> {programme.name}
              <span className="sr-only">, {programme.levels.length} levels</span>
            </Link>
          </li>
        ))}
        <li aria-hidden className="at-guide" style={{ "--i": programmes.length } as CSSProperties}>
          <p className="px-4 pt-2.5 font-[family-name:var(--at-type)] text-[12px] font-bold text-[#1d2a3c]">Pull a card to open its pathway</p>
        </li>
      </ul>
      <div className="at-drawer">
        <div className="at-label-holder">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Programme catalogue</p>
            <p className="mt-0.5 text-[17px] font-bold">
              {totals.programmes} · {totals.levels} · {totals.sessions}
            </p>
            <p className="text-[9.5px] uppercase tracking-[0.14em]">pathways · levels · sessions</p>
          </div>
        </div>
        <div aria-hidden className="at-pull" />
      </div>
      <dl className="at-typed mt-6 space-y-[0.55rem]">
        <p className="pb-2.5 text-[11px] font-bold uppercase tracking-[0.16em]">Catalogue card</p>
        {details.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 text-[13px]">
            <dt className="uppercase tracking-[0.06em] text-[#4b5563]">{label}</dt>
            <dd className="text-right font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Course: enamel medallions in a velvet tray
 * ------------------------------------------------------------------ */

export function MedallionTray({ principles }: { principles: readonly Principle[] }) {
  return (
    <InView className="at-velvet">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-5">
        {principles.map((principle, index) => (
          <li key={principle.name} className="text-center last:col-span-2 sm:last:col-span-1">
            <div className="at-slot">
              <Medal principle={principle} size="lg" style={{ "--d": `${120 + index * 110}ms` } as CSSProperties} />
            </div>
            <span className="at-brass-caption">{principle.name}</span>
            <p className="mt-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-paper/75">{principle.question}</p>
          </li>
        ))}
      </ul>
    </InView>
  );
}

/* ------------------------------------------------------------------ *
 * Split-flap board: digits flip into place when the board is seen
 * ------------------------------------------------------------------ */

export function SplitFlapBoard({ items }: { items: [string, string][] }) {
  return (
    <InView className="at-flapboard">
      <dl className="grid grid-cols-2 gap-2">
        {items.map(([value, label], index) => (
          <div key={label} className="flex flex-col-reverse items-center rounded-xl px-2 py-3.5 text-center">
            <dt className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/75">{label}</dt>
            <dd>
              <span className="sr-only">{value}</span>
              <span aria-hidden className="at-flap text-[2.1rem]">
                {value
                  .padStart(2, "0")
                  .split("")
                  .map((digit, position) => (
                    <span key={position} style={{ "--i": index * 2 + position } as CSSProperties}>
                      {digit}
                    </span>
                  ))}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </InView>
  );
}
