"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/site/notification-bell";
import { CommandPalette } from "@/components/platform/command-palette";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/course", label: "The Program" },
  { href: "/blog", label: "Journal" },
  { href: "/resources", label: "Resources" },
  { href: "/community", label: "Community" },
  { href: "/about", label: "About" },
];

export function SiteHeader({
  user,
  dashboardHref = "/admin",
  dashboardLabel = "Dashboard",
}: {
  user: { fullName: string; roleSlug: string; profileId: string } | null;
  dashboardHref?: string;
  dashboardLabel?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);

  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-navy/10 bg-paper transition-shadow duration-300",
        scrolled
          ? "border-navy/10 bg-paper/95 backdrop-blur-md shadow-[0_10px_30px_-24px_rgba(10,26,48,0.5)]"
          : "shadow-none",
      )}
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 sm:gap-x-6 sm:px-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:px-8 xl:py-4">
        <Link href="/" aria-label="Purpose Course home" className="group flex w-fit min-w-0 items-center gap-2.5 max-[360px]:gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy text-gold shadow-[0_10px_20px_-12px_rgba(10,26,48,0.9)] max-[360px]:h-8 max-[360px]:w-8 sm:h-11 sm:w-11">
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
              <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
            </svg>
          </span>
          <span className="whitespace-nowrap leading-tight">
            <span className="block font-serif text-[15px] font-semibold tracking-tight text-navy max-[360px]:text-xs sm:text-lg">PURPOSE COURSE</span>
            <span className="mt-0.5 block text-[7px] font-semibold uppercase tracking-[0.14em] text-gold-dark max-[360px]:hidden sm:text-[8px] sm:tracking-[0.2em]">
              Discover · Clarify · Live · Impact
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="col-span-2 row-start-2 mt-3 hidden items-center justify-center gap-1 border-t border-navy/10 pt-2 lg:flex xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:mt-0 xl:border-0 xl:pt-0">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active ? "bg-cream text-navy" : "text-stone-600 hover:bg-cream/60 hover:text-navy",
                )}
              >
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gold"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2 xl:col-start-3">
          <CommandPalette signedIn={Boolean(user)} compact />
          {user ? (
            <>
              <NotificationBell profileId={user.profileId} />
              <Link
                href={dashboardHref}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden whitespace-nowrap md:inline-flex")}
              >
                <LayoutDashboard className="h-4 w-4" />
                {dashboardLabel}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-[12px] font-medium text-stone-600 transition-colors hover:text-navy md:inline-flex xl:px-3 xl:text-[13px]"
            >
              <LogIn className="h-4 w-4" />
              Staff login
            </Link>
          )}
          <Link
            href="/course#enrol"
            className={cn(buttonVariants({ variant: "gold", size: "sm" }), "hidden whitespace-nowrap md:inline-flex")}
          >
            Join the cohort
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy/15 text-navy lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-navy/10 bg-paper lg:hidden"
          >
            <div className="shell flex flex-col gap-1 py-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "page" : undefined}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy hover:bg-cream aria-[current=page]:bg-cream"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-navy/10 pt-3">
                {user ? (
                  <Link href={dashboardHref} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy hover:bg-cream">
                    {dashboardLabel}
                  </Link>
                ) : (
                  <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy hover:bg-cream">
                    Staff login
                  </Link>
                )}
                <Link
                  href="/course#enrol"
                  className="rounded-full bg-gold px-4 py-2.5 text-center text-sm font-semibold text-ink"
                >
                  Join the next cohort
                </Link>
              </div>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
