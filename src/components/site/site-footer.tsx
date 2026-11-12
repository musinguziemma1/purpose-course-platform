import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { PRINCIPLES } from "@/lib/media";
import { PrincipleIcon } from "@/components/site/principle-icon";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <div className="absolute inset-0 ink-grid opacity-25" aria-hidden />
      <div className="shell relative py-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold text-ink">
                <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
                  <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
                </svg>
              </span>
              <div>
                <p className="font-serif text-lg font-semibold tracking-tight">PURPOSE COURSE</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-gold">
                  Discover · Clarify · Live · Impact
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/65">
              From purpose discovery to kingdom impact — you were born for significance. A 15-week journey of
              teaching, reflection and community, rooted in five purpose principles.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {PRINCIPLES.map((principle) => (
                <span key={principle.name} className="group relative">
                  <PrincipleIcon icon={principle.icon} accent={principle.accent} size="sm" />
                  <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-paper px-2 py-1 text-[10px] font-semibold text-navy group-hover:block">
                    {principle.name}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm text-paper/70">
              {[
                { href: "/course", label: "The 15-session programme" },
                { href: "/blog", label: "Purpose journal" },
                { href: "/resources", label: "Downloadable resources" },
                { href: "/community", label: "Live community" },
                { href: "/about", label: "Our story & team" },
                { href: "/contact", label: "Contact the faculty" },
                { href: "/search", label: "Search the platform" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-gold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Principles</p>
            <ul className="mt-4 space-y-2.5 text-sm text-paper/70">
              {PRINCIPLES.map((principle) => (
                <li key={principle.name}>
                  <Link href={`/blog?category=${principle.name.toLowerCase()}`} className="transition-colors hover:text-gold">
                    {principle.name} — {principle.question}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Contact</p>
            <ul className="mt-4 space-y-3 text-sm text-paper/70">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  ssenyondolex@gmail.com
                  <br />
                  schoolofpurposeandleadership@gmail.com
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-gold" />
                <span>+256 708 376 997</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>Kampala, Uganda · Online worldwide</span>
              </li>
            </ul>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Dashboards · open for review</p>
              <div className="mt-1.5 space-y-1 text-sm">
                {[
                  { href: "/admin", label: "Admin console" },
                  { href: "/mentor", label: "Mentor desk" },
                  { href: "/learn", label: "Student portal" },
                  { href: "/login", label: "Sign in / switch role" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block text-paper/80 underline decoration-gold/60 underline-offset-4 hover:text-gold"
                  >
                    {item.label} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-paper/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Purpose Course & The School of Purpose and Leadership. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-gold">Journal</Link>
            <Link href="/privacy" className="hover:text-gold">Privacy</Link>
            <span>Built for the next generation of purposeful leaders.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
