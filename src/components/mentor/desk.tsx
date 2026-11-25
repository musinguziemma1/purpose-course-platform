import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/*
 * Mentor desk building blocks. Server components only: every effect is CSS
 * (see app/mentor/mentor-desk.css), so nothing here ships JavaScript.
 */

/** Decelerating stagger for page entrances, in ms: later items wait less. */
const RISE_DELAYS = [0, 50, 90, 125, 155, 180, 200, 215, 228, 240];

/** Inline style that places an element in the page's entrance sequence. */
export function rise(index: number): CSSProperties {
  return { "--d": `${RISE_DELAYS[Math.min(index, RISE_DELAYS.length - 1)]}ms` } as CSSProperties;
}

/** Resting angle for loose paper, so a pile never looks machine-aligned. */
export function tilt(index: number, scale = 1): CSSProperties {
  const angles = [-0.6, 0.45, -0.3, 0.55, -0.45, 0.3];
  return { "--tilt": `${angles[index % angles.length] * scale}deg` } as CSSProperties;
}

type Tone = "teal" | "navy" | "plum" | "green" | "oxblood" | "gold" | "rust";
const SEAL_TONES: Tone[] = ["teal", "navy", "plum", "green", "oxblood"];

function toneForName(name: string): Tone {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SEAL_TONES[hash % SEAL_TONES.length];
}

/* ------------------------------------------------------------------ *
 * Leather hero
 * ------------------------------------------------------------------ */

export function DeskHero({
  eyebrow,
  title,
  description,
  meta,
  actions,
  aside,
  back,
  lead,
  compact = false,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  back?: { href: string; label: string };
  /** Shown before the title, e.g. a learner's seal. */
  lead?: ReactNode;
  compact?: boolean;
}) {
  return (
    <header className={cn("desk-leather desk-rise", compact ? "px-6 py-7 sm:px-9 sm:py-8" : "px-6 py-8 sm:px-10 sm:py-11")}>
      <div className={cn("grid gap-7", aside ? "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10" : "")}>
        <div className="min-w-0">
          {back ? (
            <Link
              href={back.href}
              className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-full text-[13px] font-medium text-paper/70 transition-colors hover:text-paper"
            >
              <span aria-hidden>←</span> {back.label}
            </Link>
          ) : null}
          <div className={cn(lead ? "flex flex-wrap items-center gap-5" : "")}>
            {lead}
            <div className="min-w-0">
              {eyebrow ? <span className="desk-plate">{eyebrow}</span> : null}
              <h1
                className={cn(
                  "desk-emboss mt-4 font-serif leading-[1.08] tracking-tight text-paper",
                  compact ? "text-[1.75rem] sm:text-[2.1rem]" : "text-[2rem] sm:text-[2.6rem]",
                )}
              >
                {title}
              </h1>
            </div>
          </div>
          {description ? <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-paper/75">{description}</p> : null}
          {meta ? <div className="mt-5 flex flex-wrap gap-2">{meta}</div> : null}
          {actions ? <div className="mt-6 flex flex-wrap gap-2.5">{actions}</div> : null}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
    </header>
  );
}

export function LeatherChip({ tone, children }: { tone?: "green" | "gold" | "teal" | "rose"; children: ReactNode }) {
  return (
    <span className="desk-chip" data-tone={tone}>
      {tone ? <i aria-hidden /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Split-flap board
 * ------------------------------------------------------------------ */

export type FlapItem = { label: string; value: number; href?: string };

/** Recessed board of split-flap counters for the hero. Digits flip in once. */
export function FlapBoard({ items, label }: { items: FlapItem[]; label: string }) {
  return (
    <div className="desk-board desk-rise" style={rise(2)}>
      <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/65">{label}</p>
      <ul className={cn("grid gap-1", items.length === 4 ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {items.map((item, index) => {
          const digits = String(Math.max(0, item.value)).padStart(2, "0").split("");
          const body = (
            <>
              <span className="desk-flap text-[1.7rem]" aria-hidden>
                {digits.map((digit, position) => (
                  <span key={position} style={{ "--i": index * 2 + position } as CSSProperties}>
                    {digit}
                  </span>
                ))}
              </span>
              <span aria-hidden className="mt-2 block text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-paper/75">
                {item.label}
              </span>
              <span className="sr-only">
                {item.label}: {item.value}
              </span>
            </>
          );
          return (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href} className="desk-flap-cell">
                  {body}
                </Link>
              ) : (
                <div className="desk-flap-cell">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Paper
 * ------------------------------------------------------------------ */

export function DeskSheet({
  children,
  className,
  style,
  as: Tag = "section",
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "section" | "div" | "article" | "aside";
  labelledBy?: string;
}) {
  return (
    <Tag className={cn("desk-sheet", className)} style={style} aria-labelledby={labelledBy}>
      {children}
    </Tag>
  );
}

/** Loose sheets under a queue: one more per waiting item, at most two. */
export function InTray({ count, children, className, style }: { count: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("desk-stack", className)} data-depth={Math.min(2, Math.max(0, count))} style={style}>
      {children}
    </div>
  );
}

export function SheetHead({
  id,
  title,
  eyebrow,
  icon: Icon,
  tone = "teal",
  count,
  action,
}: {
  id?: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="desk-sheet-head flex flex-wrap items-center justify-between gap-3 px-5 pb-3.5 pt-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="desk-enamel" data-tone={tone}>
            <Icon aria-hidden className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">{eyebrow}</p> : null}
          <h2 id={id} className="desk-letterpress font-serif text-[1.15rem] leading-tight">
            {title}
          </h2>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {count !== undefined ? (
          <span className="desk-coin" data-empty={count === 0 ? "" : undefined}>
            {count}
            <span className="sr-only"> items</span>
          </span>
        ) : null}
        {action}
      </div>
    </div>
  );
}

/** Text link styled for sheet headers. */
export function SheetLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-destiny underline decoration-destiny/30 decoration-2 underline-offset-4 transition-colors hover:decoration-destiny"
    >
      {children}
    </Link>
  );
}

/** A quiet empty line written on the sheet. */
export function DeskEmpty({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("px-5 py-7 text-center font-serif text-[15px] italic text-stone-500", className)}>{children}</p>;
}

/* ------------------------------------------------------------------ *
 * Desk calendar
 * ------------------------------------------------------------------ */

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Time of day, formatted like the rest of the app (en-GB, server zone). */
export function timeOfDay(date: Date) {
  return TIME.format(date);
}

/** Tear-off desk calendar page for a session date. */
export function DeskCalendar({ date, tone = "teal" }: { date: Date; tone?: "teal" | "gold" | "green" | "navy" | "stone" }) {
  return (
    <time dateTime={date.toISOString()} className="desk-cal" data-tone={tone}>
      <span className="desk-cal-month">{MONTH.format(date)}</span>
      <span className="desk-cal-day">{DAY.format(date)}</span>
      <span className="desk-cal-dow">{WEEKDAY.format(date)}</span>
    </time>
  );
}

/* ------------------------------------------------------------------ *
 * Ink, enamel, brass
 * ------------------------------------------------------------------ */

/** Round ink stamp for a score. `passed` picks the ink; omit it for neutral teal. */
export function GradeStamp({
  score,
  passed,
  caption,
  size = "md",
  delay,
}: {
  score: number;
  passed?: boolean;
  caption?: string;
  size?: "sm" | "md";
  delay?: number;
}) {
  const ink = passed === undefined ? "teal" : passed ? "green" : "rust";
  return (
    <span
      className="desk-stamp"
      data-ink={ink}
      data-size={size}
      style={delay !== undefined ? ({ "--d": `${delay}ms` } as CSSProperties) : undefined}
    >
      <span className="desk-stamp-score">{score}%</span>
      {caption ? <span className="desk-stamp-caption">{caption}</span> : null}
    </span>
  );
}

/** Rectangular rubber stamp for a decision or status. */
export function DecisionStamp({ children, ink = "teal", delay }: { children: ReactNode; ink?: "teal" | "gold" | "green" | "rust" | "stone"; delay?: number }) {
  return (
    <span className="desk-stamp-rect" data-ink={ink} style={delay !== undefined ? ({ "--d": `${delay}ms` } as CSSProperties) : undefined}>
      {children}
    </span>
  );
}

/** Enamel monogram for a person. The colour is stable per name. */
export function Seal({ name, size = "md" }: { name: string; size?: "md" | "lg" | "xl" }) {
  return (
    <span aria-hidden className="desk-seal" data-tone={toneForName(name)} data-size={size}>
      {initials(name) || "·"}
    </span>
  );
}

/** Small paper tag for a fact on a sheet. */
export function DeskTag({ tone, children, className }: { tone?: "gold" | "amber" | "green" | "teal" | "rose"; children: ReactNode; className?: string }) {
  return (
    <span className={cn("desk-tag", className)} data-tone={tone}>
      {children}
    </span>
  );
}

/** Inset groove meter with a glossy fill that slides in once. */
export function GrooveMeter({
  value,
  label,
  tone = "teal",
  size = "md",
  delay,
  className,
}: {
  value: number;
  label: string;
  tone?: "teal" | "gold" | "navy" | "green";
  size?: "sm" | "md";
  delay?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span
      className={cn("desk-groove", className)}
      data-tone={tone}
      data-size={size}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${clamped}%`, ...(delay !== undefined ? { "--d": `${delay}ms` } : {}) } as CSSProperties} />
    </span>
  );
}

/** Paper stat tile with an enamel icon and a letterpress number. */
export function DeskStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "teal",
  style,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  style?: CSSProperties;
}) {
  return (
    <div className="desk-sheet desk-rise flex items-start gap-4 p-5" style={style}>
      <span className="desk-enamel" data-tone={tone}>
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="desk-letterpress numeric font-serif text-[2rem] leading-none">{value}</p>
        <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">{label}</p>
        {hint ? <p className="mt-1 text-[13px] leading-snug text-stone-600">{hint}</p> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Loose paper
 * ------------------------------------------------------------------ */

export function PinnedNote({
  title,
  children,
  tone = "yellow",
  angle = -1,
  style,
}: {
  title: ReactNode;
  children: ReactNode;
  tone?: "yellow" | "teal";
  angle?: number;
  style?: CSSProperties;
}) {
  return (
    <div className="desk-rise" style={style}>
      <div className="desk-note" data-tone={tone === "teal" ? "teal" : undefined} style={{ "--tilt": `${angle}deg` } as CSSProperties}>
        <p className="font-serif text-[17px] font-semibold leading-tight">{title}</p>
        <div className="mt-2 text-[13.5px] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/** <details> styled as a desk drawer with a brass pull. */
export function DeskDrawer({
  summary,
  children,
  tone,
  className,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  tone?: "rose";
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className={cn("desk-drawer", className)} data-tone={tone} open={defaultOpen || undefined}>
      <summary>
        <span>{summary}</span>
        <ChevronDown aria-hidden />
      </summary>
      <div>{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------ *
 * Instruments
 * ------------------------------------------------------------------ */

/** ON AIR lamp: lit and breathing only while the session is live. */
export function OnAirLamp({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="desk-lamp" data-on={on ? "" : undefined}>
      <span aria-hidden className="desk-lamp-bulb" />
      {label}
    </span>
  );
}

/**
 * Analog gauge for a 0–100 value. The needle sweeps up from zero once.
 * The coloured arc reads "higher is better" without implying a pass mark.
 */
export function DeskDial({ value, label, caption, id = "desk-dial" }: { value: number | null; label: string; caption?: ReactNode; id?: string }) {
  const clamped = value === null ? null : Math.max(0, Math.min(100, Math.round(value)));
  const angle = clamped === null ? -90 : -90 + clamped * 1.8;
  const cx = 120;
  const cy = 118;
  const point = (radius: number, percent: number) => {
    const theta = Math.PI - (percent / 100) * Math.PI;
    return [cx + radius * Math.cos(theta), cy - radius * Math.sin(theta)] as const;
  };
  const ticks = Array.from({ length: 21 }, (_, index) => index * 5);

  return (
    <figure className="desk-dial desk-rise" style={rise(2)} role="img" aria-label={`${label}: ${clamped === null ? "no scores yet" : `${clamped}%`}`}>
      <svg viewBox="0 0 240 150" aria-hidden>
        <defs>
          <linearGradient id={`${id}-bezel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6e2a3" />
            <stop offset="0.5" stopColor="#c9a227" />
            <stop offset="1" stopColor="#8a6610" />
          </linearGradient>
          <radialGradient id={`${id}-face`} cx="0.5" cy="0.95" r="0.9">
            <stop offset="0" stopColor="#fffdf6" />
            <stop offset="0.75" stopColor="#f5eedb" />
            <stop offset="1" stopColor="#e6dbbf" />
          </radialGradient>
          <linearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a14a1f" />
            <stop offset="0.5" stopColor="#c9a227" />
            <stop offset="1" stopColor="#2f6b40" />
          </linearGradient>
          <radialGradient id={`${id}-hub`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff3c9" />
            <stop offset="0.6" stopColor="#c9a227" />
            <stop offset="1" stopColor="#7a5a0e" />
          </radialGradient>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Brass bezel and paper face */}
        <path d={`M ${cx - 110} ${cy} A 110 110 0 0 1 ${cx + 110} ${cy} Z`} fill={`url(#${id}-bezel)`} />
        <path d={`M ${cx - 102} ${cy} A 102 102 0 0 1 ${cx + 102} ${cy} Z`} fill={`url(#${id}-face)`} />
        <rect x={cx - 110} y={cy} width="220" height="14" rx="3" fill={`url(#${id}-bezel)`} />

        {/* Colour arc */}
        <path
          d={`M ${cx - 86} ${cy} A 86 86 0 0 1 ${cx + 86} ${cy}`}
          fill="none"
          stroke={`url(#${id}-arc)`}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Ticks */}
        {ticks.map((tick) => {
          const major = tick % 10 === 0;
          const [x1, y1] = point(major ? 70 : 74, tick);
          const [x2, y2] = point(80, tick);
          return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#122a4d" strokeOpacity={major ? 0.7 : 0.35} strokeWidth={major ? 1.6 : 1} />;
        })}
        {[0, 50, 100].map((tick) => {
          const [x, y] = point(56, tick);
          return (
            <text key={tick} x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="#57534e" fontFamily="Inter, sans-serif">
              {tick}
            </text>
          );
        })}

        {/* Needle */}
        <g className="desk-needle" style={{ "--angle": `${angle}deg` } as CSSProperties}>
          <path d={`M ${cx - 3.2} ${cy} L ${cx} ${cy - 86} L ${cx + 3.2} ${cy} Z`} fill="#8f2416" />
          <path d={`M ${cx - 2} ${cy} L ${cx} ${cy + 16} L ${cx + 2} ${cy} Z`} fill="#5a160d" />
        </g>
        <circle cx={cx} cy={cy} r="8" fill={`url(#${id}-hub)`} stroke="#6f530c" strokeWidth="0.8" />

        {/* Glass reflection */}
        <path d={`M ${cx - 96} ${cy - 6} A 98 98 0 0 1 ${cx + 70} ${cy - 76} Q ${cx - 10} ${cy - 66} ${cx - 96} ${cy - 6} Z`} fill={`url(#${id}-glass)`} />
      </svg>
      <figcaption className="mt-3 text-center">
        <span className="desk-emboss numeric block font-serif text-[2.1rem] leading-none text-paper">{clamped === null ? "—" : `${clamped}%`}</span>
        <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/70">{label}</span>
        {caption ? <span className="mt-1 block text-[12.5px] text-paper/65">{caption}</span> : null}
      </figcaption>
    </figure>
  );
}
