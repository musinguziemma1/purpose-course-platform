import Link from "next/link";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Odometer, Led, type LedTone } from "./instruments";

/*
 * Console surfaces: the letterhead page header, cardstock panels, metric
 * tiles, raised keys and the segmented filter control. Server components;
 * styling lives in src/app/admin/console.css under the k- prefix.
 */

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
type Vars = CSSProperties & Record<`--${string}`, string | number>;

export type KeyVariant = "paper" | "navy" | "brass" | "danger" | "source" | "ghost";

/** Class names for a raised key; use on Link, a or button. */
export function keyClass(variant: KeyVariant = "paper", size: "sm" | "md" = "md", className?: string) {
  return cn("k-key", variant !== "paper" && `k-key-${variant}`, size === "sm" && "k-key-sm", className);
}

/** Position in a staggered list (pairs with the .k-stagger container). */
export function staggerStyle(index: number): Vars {
  return { "--i": index };
}

/** Engraved brass nameplate. */
export function Plate({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("k-plate", className)}>{children}</span>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={keyClass("paper", "sm", "mb-4")}>
      <ArrowLeft aria-hidden /> {children}
    </Link>
  );
}

const STAR = "M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z";

/** Page header: a letterhead card with a brass eyebrow plate, an embossed watermark and a gold foil rule. */
export function ConsoleHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  back,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  back?: { href: string; label: string };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("k-letterhead", className)}>
      <svg viewBox="0 0 32 32" className="k-watermark" aria-hidden focusable="false">
        <path d={STAR} fill="currentColor" />
      </svg>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}
          {eyebrow ? (
            <div>
              <Plate>{eyebrow}</Plate>
            </div>
          ) : null}
          <h1 className="k-title break-words">{title}</h1>
          {description ? <div className="k-lede">{description}</div> : null}
          {meta ? <div className="mt-3.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}

/** Cardstock panel with a letterpressed label strip. */
export function Panel({
  title,
  description,
  icon: IconComponent,
  action,
  children,
  className,
  bodyClassName,
  riveted = false,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: Icon;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  riveted?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn("admin-card overflow-hidden", riveted && "k-riveted", className)}>
      <div className="k-panel-head">
        {IconComponent ? (
          <span className="k-well">
            <IconComponent aria-hidden className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="k-panel-title">{title}</h2>
          {description ? <p className="k-panel-sub">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children !== undefined ? <div className={bodyClassName}>{children}</div> : null}
    </section>
  );
}

export type DomeTone = "navy" | "gold" | "source" | "potential" | "destiny" | "rose" | "amber";

export function Dome({ icon: IconComponent, tone = "navy", className }: { icon: Icon; tone?: DomeTone; className?: string }) {
  return (
    <span className={cn("k-dome", tone !== "navy" && `k-dome-${tone}`, className)}>
      <IconComponent aria-hidden />
    </span>
  );
}

/** Metric tile: domed icon key, engraved label and an odometer reading. */
export function MetricTile({
  label,
  value,
  icon,
  tone = "navy",
  hint,
  href,
  led,
  className,
}: {
  label: string;
  value: number | string | null;
  icon?: Icon;
  tone?: DomeTone;
  hint?: ReactNode;
  href?: string;
  led?: { tone: LedTone; pulse?: boolean };
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="k-metric-label">{label}</p>
        {icon ? <Dome icon={icon} tone={tone} /> : null}
      </div>
      <p className="k-metric-value flex items-center gap-2.5">
        <Odometer value={value} />
        {led ? <Led tone={led.tone} pulse={led.pulse} /> : null}
      </p>
      {hint ? <p className="k-metric-hint">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className={cn("admin-card k-metric block", className)}>
      {body}
    </Link>
  ) : (
    <div className={cn("admin-card k-metric", className)}>{body}</div>
  );
}

/** Recessed track of filter keys; the current one stands proud. */
export function SegmentedNav({
  label,
  items,
  className,
}: {
  label: string;
  items: { href: string; label: string; count?: number; current: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("k-segments", className)}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined} className="k-segment">
          {item.label}
          {item.count !== undefined ? <span className="k-segment-count">{item.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Empty state: an engraved icon in a recessed well. */
export function ConsoleEmpty({
  icon: IconComponent,
  title,
  description,
  action,
  className,
  bare = false,
}: {
  icon?: Icon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Without its own card, for use inside a panel. */
  bare?: boolean;
}) {
  return (
    <div className={cn(!bare && "admin-card", "flex flex-col items-center px-6 py-10 text-center", className)}>
      {IconComponent ? (
        <span className="k-well" style={{ width: "3.25rem", height: "3.25rem", borderRadius: "9999px" }}>
          <IconComponent aria-hidden className="h-6 w-6" />
        </span>
      ) : null}
      <p className="mt-3 font-serif text-lg text-navy">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-[14px] leading-relaxed text-stone-600">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Small engraved caption for groups inside a panel. */
export function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11.5px] font-bold uppercase tracking-[0.14em] text-stone-600 [text-shadow:0_1px_0_#fff]", className)}>{children}</p>;
}
