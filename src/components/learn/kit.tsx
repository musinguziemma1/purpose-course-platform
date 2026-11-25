import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Learner material kit. The materials themselves live in app/learn/learn-kit.css;
 * these are thin server components over them, so the learner pages ship no extra
 * client JavaScript (the one interactive piece is TiltCard in ./tilt-card).
 */

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));

/** Tactile button classes, for <Link>, <a> and <button> alike. */
export const btn = {
  navy: "lk-btn lk-btn-navy",
  brass: "lk-btn lk-btn-brass",
  paper: "lk-btn lk-btn-paper",
  green: "lk-btn lk-btn-green",
  sm: "lk-btn-sm",
} as const;

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="lk-back">
      <ArrowLeft aria-hidden className="h-4 w-4" /> {children}
    </Link>
  );
}

/** The leather cover plate every learner page opens with. */
export function LearnHero({
  eyebrow,
  title,
  description,
  meta,
  actions,
  aside,
  size = "lg",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  size?: "lg" | "md";
  className?: string;
}) {
  return (
    <header className={cn("lk-leather", size === "lg" ? "px-6 py-8 sm:px-9 sm:py-10" : "px-6 py-7 sm:px-8", className)}>
      <div className={cn("grid gap-7", aside ? "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" : "")}>
        <div className="min-w-0">
          {eyebrow ? <p className="lk-eyebrow">{eyebrow}</p> : null}
          <h1
            className={cn(
              "lk-foil mt-3 font-serif leading-[1.06] tracking-tight",
              size === "lg" ? "text-[2.1rem] sm:text-[2.65rem]" : "text-[1.8rem] sm:text-[2.15rem]",
            )}
          >
            {title}
          </h1>
          {description ? <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-paper/80">{description}</div> : null}
          {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
          {actions ? <div className="mt-6 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>
        {aside ? <div className="flex flex-wrap items-center gap-4 lg:justify-end">{aside}</div> : null}
      </div>
    </header>
  );
}

export function LeatherChip({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <span className="lk-chip-leather">
      {Icon ? <Icon aria-hidden className="h-3.5 w-3.5 text-[#e6c867]" /> : null}
      {children}
    </span>
  );
}

type CoinTone = "brass" | "navy" | "green" | "muted";

export function Coin({ children, tone = "brass", className }: { children: ReactNode; tone?: CoinTone; className?: string }) {
  return <span className={cn("lk-coin", tone !== "brass" && `lk-coin-${tone}`, className)}>{children}</span>;
}

/** A sheet of paper on the desk, headed by a brass coin and a serif title. */
export function Panel({
  title,
  kicker,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  stacked = false,
  id,
}: {
  title?: ReactNode;
  kicker?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  stacked?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn("lk-paper", stacked && "lk-stack", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <span className="lk-coin h-9 w-9">
                <Icon aria-hidden className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              {kicker ? <p className="lk-kicker">{kicker}</p> : null}
              <h2 className="font-serif text-[1.2rem] leading-snug text-navy">{title}</h2>
            </div>
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(title ? "px-5 pb-5 pt-4 sm:px-6 sm:pb-6" : "p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

/** A brass plate screwed onto the desk, labelling a group of sheets. */
export function DeskHeading({ icon: Icon, children, count, id }: { icon?: LucideIcon; children: ReactNode; count?: ReactNode; id?: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 id={id} className="lk-plate">
        {Icon ? <Icon aria-hidden className="h-3.5 w-3.5" /> : null}
        {children}
      </h2>
      {count !== undefined ? <span className="lk-chip">{count}</span> : null}
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[rgba(120,96,52,0.3)] to-transparent" />
    </div>
  );
}

export type ChipTone = "plain" | "gold" | "green" | "amber" | "rose" | "teal" | "purple" | "navy";

export function Chip({ tone = "plain", children, className, icon: Icon }: { tone?: ChipTone; children: ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <span className={cn("lk-chip", tone !== "plain" && `lk-chip-${tone}`, className)}>
      {Icon ? <Icon aria-hidden className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

/** One colour language for every workflow status the learner sees. */
export function statusTone(status: string | null | undefined): ChipTone {
  switch (status) {
    case "reviewed":
    case "completed":
    case "achieved":
    case "passed":
    case "present":
    case "enrolled":
      return "green";
    case "submitted":
    case "requested":
    case "late":
    case "retake":
      return "amber";
    case "scheduled":
    case "active":
      return "teal";
    case "live":
    case "absent":
      return "rose";
    default:
      return "plain";
  }
}

/** A recessed groove with a polished fill that slides in once. */
export function Groove({
  value,
  label,
  color,
  size = "md",
  index = 0,
  className,
}: {
  value: number;
  label: string;
  color?: string;
  size?: "sm" | "md";
  index?: number;
  className?: string;
}) {
  const v = clamp(value);
  const style = { width: `${v}%`, "--lk-i": index, ...(color ? { "--lk-fill-color": color } : {}) } as CSSProperties;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn("lk-groove", size === "sm" && "lk-groove-sm", className)}
    >
      <span style={style} />
    </span>
  );
}

/* Dial geometry (viewBox 120): a 270° sweep of radius 40 from 135° to 45°. */
const DIAL_ARC = "M 31.716 88.284 A 40 40 0 1 1 88.284 88.284";
const DIAL_LENGTH = 2 * Math.PI * 40 * 0.75;
const DIAL_TICKS = Array.from({ length: 21 }, (_, index) => {
  const angle = ((135 + 13.5 * index) * Math.PI) / 180;
  const major = index % 5 === 0;
  const inner = major ? 45.5 : 47.5;
  const outer = 51;
  const point = (radius: number) => [Number((60 + radius * Math.cos(angle)).toFixed(3)), Number((60 + radius * Math.sin(angle)).toFixed(3))];
  const [x1, y1] = point(inner);
  const [x2, y2] = point(outer);
  return { x1, y1, x2, y2, major };
});

/** A brass instrument dial: bezel, engraved ticks, a needle that swings to the value. */
export function BrassDial({ value, label, caption, size = 152, id }: { value: number; label: string; caption?: ReactNode; size?: number; id?: string }) {
  const v = clamp(value);
  const uid = `dial-${(id ?? label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const offset = DIAL_LENGTH * (1 - v / 100);
  const rotation = -135 + 2.7 * v;
  return (
    <figure className="flex shrink-0 flex-col items-center">
      <div role="img" aria-label={`${label}: ${v}%`} className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" aria-hidden className="h-full w-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]">
          <defs>
            <linearGradient id={`${uid}-bezel`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff1c0" />
              <stop offset="0.28" stopColor="#e3c463" />
              <stop offset="0.52" stopColor="#a8841a" />
              <stop offset="0.74" stopColor="#f0d98a" />
              <stop offset="1" stopColor="#7a5d0d" />
            </linearGradient>
            <radialGradient id={`${uid}-face`} cx="0.42" cy="0.34" r="0.78">
              <stop offset="0" stopColor="#fffef9" />
              <stop offset="0.62" stopColor="#f6efe0" />
              <stop offset="1" stopColor="#e4d7bb" />
            </radialGradient>
            <linearGradient id={`${uid}-arc`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#a5811a" />
              <stop offset="0.5" stopColor="#e2c15a" />
              <stop offset="1" stopColor="#c9a227" />
            </linearGradient>
            <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="59" fill={`url(#${uid}-bezel)`} />
          <circle cx="60" cy="60" r="58.3" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
          <circle cx="60" cy="60" r="53.7" fill="#6b520d" />
          <circle cx="60" cy="60" r="53" fill={`url(#${uid}-face)`} />
          {DIAL_TICKS.map((tick, index) => (
            <line
              key={index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.major ? "#122a4d" : "rgba(18,42,77,0.45)"}
              strokeWidth={tick.major ? 1.6 : 0.9}
              strokeLinecap="round"
            />
          ))}
          <path d={DIAL_ARC} fill="none" stroke="rgba(18,42,77,0.1)" strokeWidth="6" strokeLinecap="round" />
          {v > 0 ? (
            <path
              className="lk-dial-arc"
              d={DIAL_ARC}
              fill="none"
              stroke={`url(#${uid}-arc)`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={DIAL_LENGTH}
              strokeDashoffset={offset}
              style={{ "--lk-from": DIAL_LENGTH } as CSSProperties}
            />
          ) : null}
          <g className="lk-needle" style={{ transform: `rotate(${rotation}deg)` }}>
            <path d="M60 21 L61.8 60 L60 69 L58.2 60 Z" fill="#0a1a30" />
          </g>
          <circle cx="60" cy="60" r="5" fill={`url(#${uid}-bezel)`} stroke="#6b520d" strokeWidth="0.6" />
          <path d="M14 58 A46 46 0 0 1 86 20 C64 25 34 36 14 58 Z" fill={`url(#${uid}-glass)`} opacity="0.5" />
        </svg>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[15%] text-center font-serif text-[1.5rem] leading-none tabular-nums text-navy">
          {v}%
        </span>
      </div>
      {caption ? <figcaption className="mt-2 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-paper/75">{caption}</figcaption> : null}
    </figure>
  );
}

/* Wax seal: a wavy pressed edge, a raised ring and the academy star struck into the centre. */
function sealEdge(radius: number, bumps: number) {
  const points: string[] = [];
  const steps = bumps * 6;
  for (let index = 0; index < steps; index += 1) {
    const t = (index / steps) * Math.PI * 2;
    const r = radius + 2.2 * Math.sin(bumps * t) + 1.1 * Math.sin(3 * t + 0.7) + 0.6 * Math.cos(5 * t + 1.3);
    points.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${points.join(" L")} Z`;
}
const SEAL_EDGE = sealEdge(44, 16);
const STAR = "M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z";
const SEAL_TONES = {
  crimson: { hi: "#d65a63", base: "#9b2c35", dark: "#561017", mark: "#6d1820" },
  gold: { hi: "#f6dc86", base: "#c9a227", dark: "#6f540b", mark: "#86660f" },
  navy: { hi: "#4a6fa5", base: "#1b3a63", dark: "#081426", mark: "#0d2040" },
} as const;

export function WaxSeal({
  tone = "crimson",
  size = 72,
  ribbons = false,
  className,
  muted = false,
}: {
  tone?: keyof typeof SEAL_TONES;
  size?: number;
  ribbons?: boolean;
  className?: string;
  muted?: boolean;
}) {
  const c = SEAL_TONES[tone];
  const uid = `seal-${tone}${ribbons ? "-r" : ""}`;
  return (
    <svg
      aria-hidden
      viewBox={ribbons ? "0 0 100 128" : "0 0 100 100"}
      width={size}
      height={ribbons ? size * 1.28 : size}
      className={cn("shrink-0 drop-shadow-[0_3px_4px_rgba(60,20,10,0.35)]", muted && "opacity-35 grayscale", className)}
    >
      <defs>
        <radialGradient id={`${uid}-wax`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor={c.hi} />
          <stop offset="0.55" stopColor={c.base} />
          <stop offset="1" stopColor={c.dark} />
        </radialGradient>
        <radialGradient id={`${uid}-press`} cx="0.62" cy="0.7" r="0.75">
          <stop offset="0" stopColor={c.hi} stopOpacity="0.55" />
          <stop offset="1" stopColor={c.dark} stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id={`${uid}-ribbon`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#24467a" />
          <stop offset="1" stopColor="#0a1a30" />
        </linearGradient>
      </defs>
      {ribbons ? (
        <>
          <polygon points="40,72 54,76 42,127 35,117 25,123" fill={`url(#${uid}-ribbon)`} />
          <polygon points="60,72 46,76 58,127 65,117 75,123" fill={`url(#${uid}-ribbon)`} />
        </>
      ) : null}
      <path d={SEAL_EDGE} fill={`url(#${uid}-wax)`} />
      <path d={SEAL_EDGE} fill="none" stroke={c.dark} strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="50" cy="50" r="30" fill={`url(#${uid}-press)`} />
      <circle cx="50" cy="50" r="31" fill="none" stroke={c.dark} strokeOpacity="0.55" strokeWidth="2.2" />
      <circle cx="50" cy="49.3" r="31" fill="none" stroke={c.hi} strokeOpacity="0.45" strokeWidth="0.9" />
      <g transform="translate(50 50) scale(1.3) translate(-16 -14)">
        <path d={STAR} fill={c.hi} fillOpacity="0.45" transform="translate(0.5 0.7)" />
        <path d={STAR} fill={c.mark} />
      </g>
      <ellipse cx="36" cy="30" rx="14" ry="7" fill="#ffffff" opacity="0.16" transform="rotate(-32 36 30)" />
    </svg>
  );
}

type StampTone = "green" | "gold" | "rose" | "amber" | "navy";

/** A rubber stamp, pressed once as the page opens. */
export function Stamp({ tone = "green", size = "md", children, className }: { tone?: StampTone; size?: "md" | "lg"; children: ReactNode; className?: string }) {
  return <span className={cn("lk-stamp", tone !== "green" && `lk-stamp-${tone}`, size === "lg" && "lk-stamp-lg", className)}>{children}</span>;
}

/** Mentor feedback always arrives on a sticky note. */
export function StickyNote({
  children,
  from,
  meta,
  tilt = "left",
  className,
}: {
  children: ReactNode;
  from?: ReactNode;
  meta?: ReactNode;
  tilt?: "left" | "right";
  className?: string;
}) {
  return (
    <figure className={cn("lk-note", tilt === "right" && "lk-note-r", className)}>
      <blockquote className="whitespace-pre-line font-serif text-[15px] italic leading-relaxed">{children}</blockquote>
      {from || meta ? (
        <figcaption className="mt-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6b5a22]">
          {from}
          {meta ? <span className="font-normal normal-case tracking-normal">{from ? " · " : ""}{meta}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** An admission ticket: a dated stub, a perforation and the details. */
export function Ticket({ date, stub, children, className }: { date?: Date | string | null; stub?: ReactNode; children: ReactNode; className?: string }) {
  const value = date ? new Date(date) : null;
  return (
    <div className={cn("lk-ticket-wrap", className)}>
      <div className="lk-ticket">
        <div className="lk-ticket-stub" aria-hidden={value && !stub ? true : undefined}>
          {stub ??
            (value ? (
              <>
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#9b2c35]">
                  {new Intl.DateTimeFormat("en-GB", { month: "short" }).format(value)}
                </span>
                <span className="font-serif text-[2rem] leading-none text-navy">{new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(value)}</span>
                <span className="mt-1 text-[12px] text-stone-600">{new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(value)}</span>
              </>
            ) : null)}
        </div>
        <div className="min-w-0 flex-1 py-3.5 pl-4 pr-6">{children}</div>
      </div>
    </div>
  );
}

/** A compact engraved figure on a paper tile; links lift under a fine pointer. */
export function StatPlaque({
  label,
  value,
  icon: Icon,
  hint,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase leading-tight tracking-[0.1em] text-stone-600">{label}</p>
        {Icon ? (
          <span className="lk-coin h-8 w-8">
            <Icon aria-hidden className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className="lk-emboss mt-2 font-serif text-[2rem] leading-none tabular-nums">{value}</p>
      {hint ? <p className="mt-2 text-[12px] text-stone-600">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className={cn("lk-paper lk-lift block p-4", className)}>
      {body}
    </Link>
  ) : (
    <div className={cn("lk-paper p-4", className)}>{body}</div>
  );
}

/** Small figures set into the leather plate (hero aside). */
export function LeatherFigures({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2.5 lg:w-[22rem]">
      {items.map((item) => (
        <div key={item.label} className="lk-chip-leather flex-col items-start gap-1 rounded-xl px-3.5 py-3">
          <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-paper/65">{item.label}</dt>
          <dd className="font-serif text-[1.6rem] leading-none tabular-nums text-[#f3dc8e]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyDesk({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("lk-paper lk-stack flex flex-col items-center px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="lk-coin h-14 w-14">
          <Icon aria-hidden className="h-6 w-6" />
        </span>
      ) : null}
      <h2 className="mt-4 font-serif text-xl text-navy">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-stone-600">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2.5">{action}</div> : null}
    </div>
  );
}

/** Ornamental rule: two hairlines, two studs and a diamond. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 240 16" fill="none" className={cn("h-4 w-56 text-[#b48e1d]", className)}>
      <path d="M0 8h100M140 8h100" stroke="currentColor" strokeOpacity="0.55" />
      <circle cx="106" cy="8" r="1.8" fill="currentColor" />
      <circle cx="134" cy="8" r="1.8" fill="currentColor" />
      <path d="M120 1.5l6.5 6.5-6.5 6.5-6.5-6.5z" fill="currentColor" />
    </svg>
  );
}

/** The studio's on-air sign: lit and glowing while a session is live. */
export function OnAirSign({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <span className={cn("lk-onair", !live && "lk-onair-off")}>
      {live ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      {children}
    </span>
  );
}

/** A steel paper clip holding a sheet together (decorative). */
export function PaperClip({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 60" width="20" height="50" fill="none" className={cn("pointer-events-none drop-shadow-[0_2px_1.5px_rgba(10,26,48,0.35)]", className)}>
      <defs>
        <linearGradient id="lk-clip-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8b939e" />
          <stop offset="0.45" stopColor="#f2f4f7" />
          <stop offset="1" stopColor="#6c747f" />
        </linearGradient>
      </defs>
      <path d="M7 14v30a5 5 0 0 0 10 0V8a3.5 3.5 0 0 0-7 0v34a2 2 0 0 0 4 0V16" stroke="url(#lk-clip-steel)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** A photograph taped to the leather. */
export function PinnedPhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={cn("lk-photo", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative print inside a fixed frame */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </figure>
  );
}
