import { CoverImage } from "@/components/site/cover-image";
import { cn } from "@/lib/utils";

/** Decorative photography with a readable text surface at every screen size. */
export function HeroBackdrop({ src, tone = "paper", className, eager = true }: {
  src: string;
  tone?: "paper" | "dark";
  className?: string;
  eager?: boolean;
}) {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none" data-hero-backdrop>
    <CoverImage src={src} eager={eager} className={className} />
    <div className={cn("absolute inset-0", tone === "paper" ? "hero-photo-paper" : "hero-photo-dark")} />
  </div>;
}
