"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Database,
  Fingerprint,
  Flag,
  Gauge,
  GraduationCap,
  Home,
  ImageIcon,
  Inbox,
  Layers,
  ListChecks,
  LogOut,
  type LucideIcon,
  Megaphone,
  Menu,
  MessagesSquare,
  NotebookPen,
  PenLine,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { NotificationBell } from "@/components/site/notification-bell";
import { CommandPalette } from "@/components/platform/command-palette";
import { activeNavHref, type NavIcon, type NavSection, type WorkspaceLink } from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home, compass: Compass, fingerprint: Fingerprint, layers: Layers, book: BookOpen, calendar: CalendarDays,
  clipboard: ClipboardCheck, target: Target, gauge: Gauge, notebook: NotebookPen, award: Award, user: UserRound,
  users: Users, message: MessagesSquare, bell: Bell, settings: Settings, pen: PenLine, image: ImageIcon,
  megaphone: Megaphone, inbox: Inbox, chart: BarChart3, activity: Activity, shield: ShieldCheck, database: Database,
  cart: ShoppingBag, graduation: GraduationCap, check: ListChecks, flag: Flag, video: Video,
};

type Accent = "gold" | "teal" | "purple";
const ACCENTS: Record<Accent, { text: string; bg: string; eyebrow: string }> = {
  gold: { text: "text-gold", bg: "bg-gold", eyebrow: "text-gold-dark" },
  teal: { text: "text-[#7fc7c9]", bg: "bg-[#7fc7c9]", eyebrow: "text-destiny" },
  purple: { text: "text-[#c4a9ea]", bg: "bg-[#c4a9ea]", eyebrow: "text-potential" },
};

/* Press feedback that never changes layout bounds, on a strong ease-out so the press registers at once. */
const PRESS = "transition-[transform,background-color,color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";

export type ShellUser = { profileId: string; fullName: string; roleName: string; title: string | null };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside an open dialog, closes it on Escape and restores focus (WAI-ARIA dialog pattern). */
function useDialogFocus(open: boolean, container: RefObject<HTMLElement | null>, onClose: () => void, restoreFocus: () => void) {
  useEffect(() => {
    if (!open) return;
    const node = container.current;
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null);
      if (!items.length) return;
      const firstItem = items[0], lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      restoreFocus();
    };
  }, [open, container, onClose, restoreFocus]);
}

export function WorkspaceShell({
  children,
  sections,
  user,
  workspaceName,
  workspaceHome,
  workspaces = [],
  accent = "gold",
  reviewMode = false,
  banner,
  skin,
}: {
  children: ReactNode;
  sections: NavSection[];
  user: ShellUser;
  workspaceName: string;
  workspaceHome: string;
  workspaces?: WorkspaceLink[];
  accent?: Accent;
  reviewMode?: boolean;
  banner?: ReactNode;
  /** "console": the tactile admin skin (src/app/admin/console.css). Other workspaces keep the plain shell. */
  skin?: "console";
}) {
  const pathname = usePathname();
  const skinned = skin === "console";
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setDrawerOpen(false);
  }
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigatedRef = useRef(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // After choosing a destination, focus the new page's content; otherwise return to the menu button.
  const restoreFocus = useCallback(() => {
    const target = navigatedRef.current ? document.getElementById("workspace-main") : menuButtonRef.current;
    navigatedRef.current = false;
    target?.focus({ preventScroll: true });
  }, []);
  useDialogFocus(drawerOpen, drawerRef, closeDrawer, restoreFocus);

  const tone = ACCENTS[accent];
  const activeHref = activeNavHref(sections, pathname);
  const activeSection = sections.find((section) => section.items.some((item) => item.href === activeHref));
  const activeItem = activeSection?.items.find((item) => item.href === activeHref);

  const brand = (
    <Link href={workspaceHome} className="flex items-center gap-2.5 rounded-lg">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-ink", tone.bg, skinned && "console-medallion")}>
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
        </svg>
      </span>
      <span>
        <span className="block font-serif text-[15px] font-semibold tracking-tight text-paper">Purpose Course</span>
        <span className={cn("block text-[12px] font-semibold uppercase tracking-[0.16em]", tone.text)}>{workspaceName}</span>
      </span>
    </Link>
  );

  const navigation = (touch: boolean) => (
    <nav aria-label={`${workspaceName} navigation`} className="space-y-5">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-paper/50">{section.label}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon] ?? Home;
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={touch ? () => { navigatedRef.current = true; } : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 text-[14px] transition-colors duration-150",
                      touch ? "min-h-11" : "min-h-10",
                      skinned && "console-nav-link",
                      active
                        ? skinned
                          ? "font-medium text-paper"
                          : "bg-white/[0.12] font-medium text-paper shadow-[inset_3px_0_0_var(--color-gold)]"
                        : "text-paper/70 hover:bg-white/[0.06] hover:text-paper",
                    )}
                  >
                    {skinned && active ? (
                      <motion.span
                        aria-hidden
                        layoutId={touch ? "console-nav-drawer" : "console-nav-rail"}
                        className="console-nav-active"
                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42, mass: 0.9 }}
                      />
                    ) : null}
                    <Icon aria-hidden className={cn("h-[18px] w-[18px] shrink-0", active ? tone.text : "text-paper/50 group-hover:text-gold")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className={cn("min-w-6 rounded-full bg-gold px-1.5 py-0.5 text-center text-[12px] font-bold tabular-nums text-ink", skinned && "console-nav-badge")}>
                        {item.badge > 99 ? "99+" : item.badge}
                        <span className="sr-only"> waiting</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className={cn("min-h-dvh lg:flex", skinned ? "console" : "bg-[#f6f2e9]")}>
      <a href="#workspace-main" className="skip-link">Skip to main content</a>
      <aside className={cn("sticky top-0 hidden h-dvh w-[17rem] shrink-0 self-start flex-col bg-ink lg:flex", skinned && "console-rail")}>
        <div className="shrink-0 px-4 py-5">{brand}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">{navigation(false)}</div>
        <div className="shrink-0 border-t border-white/10 p-3">
          <Link href="/" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-[13px] text-paper/65 transition-colors hover:bg-white/[0.06] hover:text-gold">
            <ArrowUpRight aria-hidden className="h-4 w-4" /> Public website
          </Link>
        </div>
      </aside>

      {/* Always mounted so it can transition both ways; `inert` keeps it out of reach while closed. */}
      <div inert={!drawerOpen} className={cn("fixed inset-0 z-50 lg:hidden", drawerOpen ? "" : "pointer-events-none")}>
          <div
            aria-hidden
            onClick={closeDrawer}
            className={cn("absolute inset-0 bg-ink/65 duration-200 ease-out", drawerOpen ? "visible opacity-100 transition-opacity" : "invisible opacity-0 transition-[opacity,visibility]")}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${workspaceName} menu`}
            className={cn(
              "relative flex h-full w-[min(20rem,86vw)] flex-col bg-ink pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:translate-x-0",
              skinned && "console-rail",
              // Visible at once when opening (so focus can move in); stays visible until the exit slide ends.
              drawerOpen ? "visible translate-x-0 transition-[transform,opacity] duration-[280ms]" : "invisible -translate-x-full transition-[transform,opacity,visibility] duration-200 motion-reduce:opacity-0",
            )}
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-4">
              {brand}
              <button type="button" data-autofocus onClick={closeDrawer} aria-label="Close menu" className={cn("flex h-11 w-11 items-center justify-center rounded-full text-paper/75 hover:bg-white/10 hover:text-paper", PRESS)}>
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">{navigation(true)}</div>
            <div className="shrink-0 border-t border-white/10 p-3">
              <WorkspaceSwitcherList workspaces={workspaces} currentHome={workspaceHome} dark />
              <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-[14px] text-paper/70 hover:text-gold">
                <ArrowUpRight aria-hidden className="h-4 w-4" /> Public website
              </Link>
            </div>
          </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {reviewMode ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-gold/40 bg-gold/15 px-4 py-2 text-[13px] text-stone-700">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.1em] text-gold-dark">
              <Sparkles className="h-4 w-4" aria-hidden /> Review mode
            </span>
            <span>
              Viewing the {user.roleName.toLowerCase()} workspace as <strong className="text-navy">{user.fullName}</strong> with demo data.
            </span>
            <Link href="/login" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
              Sign in for real
            </Link>
          </div>
        ) : null}
        <header className={cn("sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-navy/10 bg-paper/95 px-3 py-2 backdrop-blur sm:gap-3 sm:px-6", skinned && "console-topbar")}>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-navy/15 text-navy hover:bg-cream lg:hidden", PRESS)}
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb">
              <ol className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]">
                <li className="shrink-0">
                  <Link href={workspaceHome} className={cn("hover:underline", tone.eyebrow)}>{workspaceName}</Link>
                </li>
                {activeSection && activeSection.label !== "Overview" ? (
                  <>
                    <li aria-hidden className="text-stone-400">/</li>
                    <li className="truncate text-stone-600">{activeSection.label}</li>
                  </>
                ) : null}
              </ol>
            </nav>
            <p className="truncate font-serif text-[17px] leading-tight text-navy">{activeItem?.label ?? user.title ?? user.fullName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CommandPalette signedIn />
            <NotificationBell profileId={user.profileId} />
            <AccountMenu user={user} workspaces={workspaces} currentHome={workspaceHome} skinned={skinned} />
          </div>
        </header>
        {banner}
        <main id="workspace-main" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/** Disclosure (not an ARIA menu): a button that reveals a short list of links. */
function AccountMenu({ user, workspaces, currentHome, skinned = false }: { user: ShellUser; workspaces: WorkspaceLink[]; currentHome: string; skinned?: boolean }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="workspace-account-panel"
        className={cn("flex h-11 items-center gap-1 rounded-full border border-navy/15 pl-1 pr-2 text-navy hover:bg-cream lg:h-10", PRESS)}
      >
        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-serif text-[12px] font-semibold text-paper lg:h-8 lg:w-8">{initials(user.fullName)}</span>
        <span className="sr-only">Account: {user.fullName}</span>
        <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform duration-200 ease-out", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div
          id="workspace-account-panel"
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-40 w-72 origin-top-right overflow-hidden rounded-xl border border-navy/10 bg-paper shadow-[0_12px_40px_-12px_rgba(10,26,48,0.35)] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] starting:-translate-y-1 starting:scale-[0.97] starting:opacity-0 motion-reduce:starting:translate-y-0 motion-reduce:starting:scale-100",
            skinned && "console-popover",
          )}
        >
          <div className="border-b border-navy/10 px-4 py-3">
            <p className="truncate text-[14px] font-semibold text-navy">{user.fullName}</p>
            <p className="text-[13px] text-stone-600">{user.roleName}{user.title ? ` · ${user.title}` : ""}</p>
          </div>
          <div className="p-1.5">
            <WorkspaceSwitcherList workspaces={workspaces} currentHome={currentHome} />
            <PanelLink href="/account" icon={UserRound} label="Account & password" />
            <PanelLink href="/" icon={ArrowUpRight} label="Public website" />
            <div className="my-1.5 border-t border-navy/10" />
            <form action={logoutAction}>
              <button type="submit" className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] font-medium text-rose-700 transition-colors hover:bg-rose-50">
                <LogOut aria-hidden className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PanelLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[14px] text-navy transition-colors hover:bg-cream">
      <Icon aria-hidden className="h-4 w-4 text-stone-500" /> {label}
    </Link>
  );
}

function WorkspaceSwitcherList({ workspaces, currentHome, dark = false }: { workspaces: WorkspaceLink[]; currentHome: string; dark?: boolean }) {
  const others = workspaces.filter((workspace) => workspace.href !== currentHome);
  if (!others.length) return null;
  return (
    <div className={cn("mb-1.5 pb-1.5", dark ? "" : "border-b border-navy/10")}>
      <p className={cn("px-3 pb-1 pt-1 text-[12px] font-semibold uppercase tracking-[0.12em]", dark ? "text-paper/50" : "text-stone-600")}>Switch workspace</p>
      {others.map((workspace) => (
        <Link
          key={workspace.href}
          href={workspace.href}
          className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors", dark ? "text-paper/80 hover:bg-white/[0.06] hover:text-paper" : "text-navy hover:bg-cream")}
        >
          <ArrowLeftRight aria-hidden className={cn("h-4 w-4 shrink-0", dark ? "text-gold" : "text-gold-dark")} />
          <span>
            <span className="block text-[14px] font-medium">{workspace.label}</span>
            <span className={cn("block text-[12px]", dark ? "text-paper/55" : "text-stone-600")}>{workspace.hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
