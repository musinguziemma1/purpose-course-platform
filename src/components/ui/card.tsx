import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive = false,
  tone = "paper",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  tone?: "paper" | "muted" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border",
        tone === "paper" && "border-navy/10 bg-paper shadow-xs",
        tone === "muted" && "border-navy/8 bg-cream/55",
        tone === "dark" && "border-white/10 bg-ink text-paper",
        interactive && "interactive",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 px-5 pt-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-lg leading-snug text-navy", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[12.5px] leading-relaxed text-stone-600", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2 border-t border-navy/8 px-5 py-3", className)}
      {...props}
    />
  );
}

export function Separator({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  return (
    <div
      role="separator"
      className={cn(vertical ? "h-full w-px" : "h-px w-full", "bg-navy/10", className)}
    />
  );
}

/** Compact metric tile used across the dashboards. */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "navy",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "navy" | "gold" | "source" | "purple" | "teal" | "rose";
  className?: string;
}) {
  const tones: Record<string, string> = {
    navy: "bg-navy/[0.07] text-navy",
    gold: "bg-gold/15 text-gold-dark",
    source: "bg-source/10 text-source",
    purple: "bg-[#5a3a8a]/10 text-[#5a3a8a]",
    teal: "bg-[#155e63]/10 text-[#155e63]",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className={cn("admin-card group relative overflow-hidden p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9.5px] font-semibold uppercase leading-tight tracking-[0.1em] text-stone-500">{label}</p>
        {Icon ? (
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tones[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className="numeric mt-2 font-serif text-2xl leading-none text-navy">{value}</p>
      {hint ? <p className="mt-1.5 text-[10.5px] leading-snug text-stone-500">{hint}</p> : null}
    </div>
  );
}

/** Horizontal progress meter with an accessible label. */
export function Progress({
  value,
  label,
  tone = "gold",
  size = "md",
  showValue = false,
  className,
}: {
  value: number;
  label?: string;
  tone?: "gold" | "navy" | "source";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("w-full", className)}>
      {label || showValue ? (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label ? <span className="text-[11px] text-stone-600">{label}</span> : null}
          {showValue ? <span className="numeric text-[10.5px] font-semibold text-navy">{clamped}%</span> : null}
        </div>
      ) : null}
      <div
        className={cn(
          "meter",
          tone === "navy" && "meter-navy",
          tone === "source" && "meter-source",
          size === "sm" && "h-1",
          size === "lg" && "h-2",
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <span style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

/** Friendly empty state with optional action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("admin-card flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-gold-dark">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <p className="mt-3 font-serif text-lg text-navy">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-stone-600">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Consistent page header for every workspace route. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1.5 font-serif text-[1.6rem] leading-tight tracking-tight text-navy sm:text-[1.85rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-stone-600">{description}</p>
        ) : null}
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden />;
}
