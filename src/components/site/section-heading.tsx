import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/** Eyebrow, serif title and optional lede for a public section, with an optional action aligned to the right. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = "light",
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-col justify-between gap-6 lg:flex-row lg:items-end", className)}>
      <Reveal className="max-w-2xl">
        <p className={cn("eyebrow", dark && "!text-gold")}>{eyebrow}</p>
        <h2 className={cn("mt-4 font-serif text-4xl leading-tight sm:text-[2.75rem]", dark ? "text-paper" : "text-navy")}>{title}</h2>
        {description ? (
          <p className={cn("mt-4 max-w-xl text-[16px] leading-relaxed", dark ? "text-paper/70" : "text-stone-600")}>{description}</p>
        ) : null}
      </Reveal>
      {action ? <Reveal delay={0.08}>{action}</Reveal> : null}
    </div>
  );
}

/** Quiet uppercase link that sits beside a section heading. */
export function SectionLink({ href, children, tone = "light" }: { href: string; children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
        tone === "dark" ? "text-paper hover:text-gold" : "text-navy hover:text-gold-dark",
      )}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
