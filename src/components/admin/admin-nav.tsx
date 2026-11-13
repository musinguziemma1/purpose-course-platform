"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Database,
  CalendarDays,
  ExternalLink,
  GraduationCap,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn, initials } from "@/lib/utils";
import { canAccessAdminPath } from "@/lib/admin-access";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/articles", label: "Articles", icon: BookOpen },
  { href: "/admin/media", label: "Media library", icon: BookOpen },
  { href: "/admin/admissions", label: "Student applications", icon: UserRound },
  { href: "/admin/assignments", label: "Assignments", icon: FileCheck2 },
  { href: "/admin/academy", label: "Academy builder", icon: GraduationCap },
  { href: "/admin/academy/live", label: "Live sessions", icon: CalendarDays },
  { href: "/admin/academy/assessments", label: "Assessments", icon: FileCheck2 },
  { href: "/admin/programme", label: "Programme control", icon: Users },
  { href: "/admin/analytics", label: "Learning analytics", icon: BarChart3 },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/contact", label: "Contact inbox", icon: MessagesSquare },
  { href: "/admin/architecture", label: "Data architecture", icon: Database },
  { href: "/admin/reviews", label: "Review queue", icon: FileCheck2 },
  { href: "/admin/students", label: "Audience & students", icon: Users },
  { href: "/admin/people", label: "People & access", icon: UserRound, adminOnly: true },
  { href: "/admin/community", label: "Community", icon: MessagesSquare },
  { href: "/admin/activity", label: "Activity log", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
  { href: "/account", label: "My profile & settings", icon: UserRound },
];

const WORKSPACES = [
  { href: "/mentor", label: "Mentor desk", hint: "Coaching & review" },
  { href: "/learn", label: "Student portal", hint: "Programme & progress" },
];

export function AdminNav({
  user,
  pendingReviews,
  reviewMode = false,
}: {
  user: { fullName: string; roleName: string; roleSlug: string; email: string; permissions: string[] };
  pendingReviews: number;
  reviewMode?: boolean;
}) {
  const pathname = usePathname();
  const visibleItems = ITEMS.filter((item) => item.href === "/account" || canAccessAdminPath(user, item.href));
  const activeHref = visibleItems
    .filter((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-ink">
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
            </svg>
          </span>
          <span>
            <span className="block font-serif text-sm font-semibold tracking-tight text-paper">PURPOSE COURSE</span>
            <span className="block text-[8.5px] font-semibold uppercase tracking-[0.24em] text-gold">Editorial desk</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Administration navigation" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 pb-3">
        {visibleItems.map((item) => {
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12.5px] transition-all",
                active
                  ? "bg-white/[0.12] text-paper shadow-[inset_2px_0_0_var(--color-gold)]"
                  : "text-paper/55 hover:bg-white/[0.06] hover:text-paper",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-paper/40 group-hover:text-gold/80")} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/admin/reviews" && pendingReviews > 0 ? (
                <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-ink">{pendingReviews}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {user.roleSlug === "admin" ? (
        <div className="mb-3 px-3">
          <p className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-paper/30">Other workspaces</p>
          {WORKSPACES.map((workspace) => (
            <Link
              key={workspace.href}
              href={workspace.href}
              className="mb-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-paper/55 hover:border-gold/40 hover:text-gold"
            >
              <span>{workspace.label}</span>
              <span className="text-[9px] uppercase tracking-[0.08em] text-paper/30">{workspace.hint}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="shrink-0 border-t border-white/10 px-3 pb-4 pt-3">
        {reviewMode ? (
          <div className="mb-3 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">Review mode</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-paper/60">
              Open demo session — data is seeded for review.
            </p>
            <Link href="/login" className="mt-1 inline-flex text-[10px] font-semibold text-paper underline decoration-gold/60 underline-offset-2">
              Switch role
            </Link>
          </div>
        ) : null}
        <Link
          href="/"
          target="_blank"
          className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11.5px] text-paper/55 hover:text-gold"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View public site
        </Link>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold font-serif text-[11px] font-semibold text-ink">
              {initials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-paper">{user.fullName}</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-paper/40">{user.roleName}</p>
            </div>
          </div>
          <Link href="/account" className="mt-2 block text-center text-[11px] text-gold hover:underline">Account &amp; password</Link>
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
    </div>
  );
}
