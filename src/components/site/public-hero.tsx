import type { CSSProperties, ReactNode } from "react";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { cn } from "@/lib/utils";

/** Slow-drifting colour fields behind a hero. Decorative and hidden from assistive tech. */
export function Aurora({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <div aria-hidden className={cn("aurora", tone === "light" && "aurora-light", className)}>
      <span />
      <span />
      <span />
    </div>
  );
}

/** Position in the hero's entrance sequence (see `.rise` in globals.css). */
export const rise = (position: number) => ({ "--rise": position }) as CSSProperties;

/**
 * Shared public-page hero: photography (optional) under a drifting aurora,
 * content that rises in once on arrival, and an optional glass aside.
 */
export function PublicHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  image,
  tone = "dark",
  children,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  image?: string;
  tone?: "dark" | "light";
  children?: ReactNode;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <section className={cn("relative isolate overflow-hidden border-b", dark ? "border-white/10 bg-ink text-paper" : "border-navy/10 mesh-light text-navy", className)}>
      {image ? <HeroBackdrop src={image} tone={dark ? "dark" : "paper"} /> : null}
      <Aurora tone={dark ? "dark" : "light"} />
      <div className={cn("shell relative z-10 grid grid-cols-1 gap-10 py-16 sm:py-20 lg:items-center lg:py-24", aside ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" : "")}>
        <div className="max-w-3xl">
          <p className={cn("rise text-[12px] font-semibold uppercase tracking-[0.22em]", dark ? "text-gold" : "text-gold-dark")} style={rise(0)}>
            {eyebrow}
          </p>
          <h1 className={cn("rise display mt-4 text-[2.6rem] sm:text-5xl lg:text-[3.6rem]", dark ? "text-paper" : "text-navy")} style={rise(1)}>
            {title}
          </h1>
          {description ? (
            <p className={cn("rise mt-5 max-w-2xl text-[16px] leading-relaxed sm:text-[17px]", dark ? "text-paper/80" : "text-stone-700")} style={rise(2)}>
              {description}
            </p>
          ) : null}
          {actions ? <div className="rise mt-8 flex flex-wrap items-center gap-3" style={rise(3)}>{actions}</div> : null}
          {children ? <div className="rise mt-8" style={rise(4)}>{children}</div> : null}
        </div>
        {aside ? <div className="rise" style={rise(3)}>{aside}</div> : null}
      </div>
    </section>
  );
}
