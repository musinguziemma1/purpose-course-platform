import Link from "next/link";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { Compass, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
export function AuthShell({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "login" | "signup";
}) {
  return (
    <main className="min-h-screen bg-[#f8f6f0] lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative flex min-h-56 flex-col justify-between overflow-hidden bg-[#112b35] p-6 text-paper sm:p-8 lg:min-h-screen lg:p-10 xl:p-14">
        <HeroBackdrop src={mode === "signup" ? "/images/learning-together.jpg" : "/images/online-learning.jpg"} tone="dark" />
        <Link href="/" className="relative hidden items-center gap-3 lg:flex">
          <span className="rounded-full border border-gold/40 p-2.5 text-gold">
            <Compass className="h-7 w-7" />
          </span>
          <span>
            <span className="block font-serif text-xl tracking-wide">
              Purpose Course
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-paper/60">
              School of Purpose &amp; Leadership
            </span>
          </span>
        </Link>
        <div className="relative py-4 lg:py-16">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold lg:mb-6 lg:text-xs">
            Discover. Clarify. Live. Impact.
          </p>
          <h2 className="max-w-lg font-serif text-3xl leading-[1.13] sm:text-4xl lg:text-5xl xl:text-6xl">
            A clearer purpose.
            <br />
            <span className="text-[#d8bf81]">A life of impact.</span>
          </h2>
          <p className="mt-7 hidden max-w-sm text-base leading-relaxed text-paper/85 lg:block">
            Learn with intention, grow with a mentor, and turn your calling into
            meaningful action.
          </p>
          <div className="mt-9 hidden flex-wrap gap-x-5 gap-y-3 text-xs text-paper/85 lg:flex">
            {["Identity", "Source", "Purpose", "Potential", "Destiny"].map(
              (item, index) => (
                <span key={item}>
                  <span className="mr-1.5 text-gold">0{index + 1}</span>
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="relative hidden items-center justify-between border-t border-paper/20 pt-5 text-xs text-paper/80 lg:flex">
          <span>Grow through every level.</span>
          <Link
            href="/course"
            className="inline-flex items-center gap-1 text-paper"
          >
            Explore the programme <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>
      <section className="flex min-h-[calc(100svh-14rem)] flex-col px-5 py-6 sm:px-10 lg:min-h-screen lg:px-12 xl:px-20">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-serif text-base text-navy sm:text-lg"
          >
            <Compass className="h-6 w-6 text-gold-dark" />
            Purpose Course
          </Link>
          <nav
            aria-label="Account access"
            className="flex shrink-0 rounded-full border border-navy/10 bg-paper p-1 text-xs font-semibold"
          >
            <Link
              aria-current={mode === "login" ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-2 sm:px-4 ${mode === "login" ? "bg-navy text-paper" : "text-stone-500"}`}
              href="/login"
            >
              Sign in
            </Link>
            <Link
              aria-current={mode === "signup" ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-2 sm:px-4 ${mode === "signup" ? "bg-navy text-paper" : "text-stone-500"}`}
              href="/signup"
            >
              Sign up
            </Link>
          </nav>
        </header>
        <div className="mx-auto my-auto w-full max-w-md py-12 lg:py-14">
          {children}
        </div>
        <footer className="flex flex-wrap justify-between gap-3 text-[11px] text-stone-500">
          <span>© {new Date().getFullYear()} Purpose Course</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-navy">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-navy">
              Get help
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
