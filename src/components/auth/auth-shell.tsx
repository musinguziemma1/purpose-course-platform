import Link from "next/link";
import Image from "next/image";
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
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#112b35] p-10 text-paper lg:flex xl:p-14">
        <Image
          src="/images/level-foundation.jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 52vw, 1px"
          className="object-cover opacity-30"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[#112b35]/65 via-[#112b35]/40 to-[#112b35]"
        />
        <Link href="/" className="relative flex items-center gap-3">
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
        <div className="relative py-16">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            Discover. Clarify. Live. Impact.
          </p>
          <h2 className="max-w-lg font-serif text-5xl leading-[1.13] xl:text-6xl">
            A clearer purpose.
            <br />
            <span className="text-[#d8bf81]">A life of impact.</span>
          </h2>
          <p className="mt-7 max-w-sm text-base leading-relaxed text-paper/75">
            Learn with intention, grow with a mentor, and turn your calling into
            meaningful action.
          </p>
          <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-xs text-paper/65">
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
        <div className="relative flex items-center justify-between border-t border-paper/20 pt-5 text-xs text-paper/60">
          <span>Grow through every level.</span>
          <Link
            href="/course"
            className="inline-flex items-center gap-1 text-paper"
          >
            Explore the programme <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif text-lg text-navy"
          >
            <Compass className="h-6 w-6 text-gold-dark" />
            Purpose Course
          </Link>
          <nav
            aria-label="Account access"
            className="flex rounded-full border border-navy/10 bg-paper p-1 text-xs font-semibold"
          >
            <Link
              aria-current={mode === "login" ? "page" : undefined}
              className={`rounded-full px-4 py-2 ${mode === "login" ? "bg-navy text-paper" : "text-stone-500"}`}
              href="/login"
            >
              Sign in
            </Link>
            <Link
              aria-current={mode === "signup" ? "page" : undefined}
              className={`rounded-full px-4 py-2 ${mode === "signup" ? "bg-navy text-paper" : "text-stone-500"}`}
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
