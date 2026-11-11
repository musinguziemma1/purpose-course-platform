"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Home,
  Layers,
  Target,
  Award,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  MessagesSquare,
  NotebookPen,
  PenLine,
  Settings,
  Sparkles,
  Bell,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { NotificationBell } from "@/components/site/notification-bell";
import { CommandPalette } from "@/components/platform/command-palette";
import { cn, initials } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  book: BookOpen,
  calendar: CalendarDays,
  clipboard: ClipboardCheck,
  pen: PenLine,
  users: Users,
  message: MessagesSquare,
  user: UserRound,
  dashboard: LayoutDashboard,
  notebook: NotebookPen,
  graduation: GraduationCap,
  layers: Layers,
  target: Target,
  award: Award,
  bell: Bell,
  settings: Settings,
  sparkles: Sparkles,
};

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
};

export function WorkspaceShell({
  children,
  nav,
  user,
  workspaceName,
  workspaceTitle,
  accent = "gold",
  reviewMode = false,
}: {
  children: ReactNode;
  nav: WorkspaceNavItem[];
  user: { profileId: string; fullName: string; roleName: string; title: string | null };
  workspaceName: string;
  workspaceTitle: string;
  accent?: "gold" | "teal" | "purple";
  reviewMode?: boolean;
}) {
  const pathname = usePathname();
  const accentText = accent === "teal" ? "text-[#7fc7c9]" : accent === "purple" ? "text-[#c4a9ea]" : "text-gold";
  const accentBg = accent === "teal" ? "bg-[#155e63]" : accent === "purple" ? "bg-[#5a3a8a]" : "bg-gold";

  return (
    <div className="min-h-screen bg-[#f6f2e9] lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 self-start flex-col overflow-hidden bg-ink lg:flex">
        <div className="shrink-0 px-4 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-ink", accentBg)}>
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2 8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
              </svg>
            </span>
            <span>
              <span className="block font-serif text-sm font-semibold tracking-tight text-paper">PURPOSE COURSE</span>
              <span className={cn("block text-[8.5px] font-semibold uppercase tracking-[0.24em]", accentText)}>
                {workspaceName}
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label={`${workspaceName} navigation`} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 pb-3">
          {nav.map((item) => {
            const Icon = ICONS[item.icon] ?? Home;
            const active = item.href.endsWith("/") ? pathname === item.href : pathname === item.href || (item.href.split("/").length > 2 && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all",
                  active
                    ? "bg-white/[0.12] text-paper shadow-[inset_2px_0_0_var(--color-gold)]"
                    : "text-paper/55 hover:bg-white/[0.06] hover:text-paper",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? accentText : "text-paper/40 group-hover:text-gold/80")} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-ink">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-3 pb-4 pt-3">
          <Link
            href="/"
            className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11.5px] text-paper/55 hover:text-gold"
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Public website
          </Link>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2.5">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full font-serif text-[11px] font-semibold text-ink", accentBg)}>
                {initials(user.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-paper">{user.fullName}</p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-paper/40">{user.roleName}</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-2.5">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/15 px-2 py-1.5 text-[11px] text-paper/60 transition-colors hover:border-gold/50 hover:text-gold"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {reviewMode ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-gold/40 bg-gold/15 px-4 py-2 text-[11.5px] text-stone-700">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.1em] text-gold-dark">
              <Sparkles className="h-3.5 w-3.5" /> Review mode
            </span>
            <span>
              Viewing the {user.roleName.toLowerCase()} workspace as <strong className="text-navy">{user.fullName}</strong> —
              demo data, no sign-in required.
            </span>
            <Link href="/login" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
              Open a real session
            </Link>
          </div>
        ) : null}
        <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-navy/10 bg-paper/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className={cn("text-[9.5px] font-semibold uppercase tracking-[0.2em]", accent === "teal" ? "text-[#155e63]" : accent === "purple" ? "text-[#5a3a8a]" : "text-gold-dark")}>
              {workspaceTitle}
            </p>
            <p className="truncate font-serif text-[15px] text-navy">{user.title ?? user.fullName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CommandPalette signedIn />
            <NotificationBell profileId={user.profileId} />
            <span className="hidden rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-navy sm:inline">
              {user.roleName}
            </span>
            <form action={logoutAction} className="lg:hidden">
              <button
                type="submit"
                aria-label="Sign out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy/15 text-navy"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </header>

        <div className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-navy/10 bg-paper px-3 py-2 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-navy/10 px-3 py-1.5 text-[11.5px] font-medium text-navy"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
