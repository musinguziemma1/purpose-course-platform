"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Command,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  MessagesSquare,
  Search,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Hit = { type: string; id: string; title: string; snippet: string; href: string; meta: string };
type QuickLink = { type: string; title: string; href: string; meta: string; snippet?: string; id?: string };

const ICONS: Record<string, typeof BookOpen> = {
  article: FileText,
  course: GraduationCap,
  lesson: BookOpen,
  resource: Download,
  discussion: MessagesSquare,
  person: UserRound,
  event: CalendarDays,
};

const QUICK_LINKS: QuickLink[] = [
  { title: "My learning", href: "/learn", meta: "Student dashboard", type: "course" },
  { title: "Academy courses", href: "/learn/courses", meta: "Video, audio, practice", type: "lesson" },
  { title: "Live sessions", href: "/learn/live", meta: "Classes & group work", type: "event" },
  { title: "Assessments", href: "/learn/instruments", meta: "Purpose instruments", type: "course" },
  { title: "Purpose Journal", href: "/blog", meta: "Articles", type: "article" },
  { title: "Communities", href: "/community", meta: "Discussions", type: "discussion" },
  { title: "Resource library", href: "/resources", meta: "Downloads", type: "resource" },
  { title: "Mentor desk", href: "/mentor", meta: "Coaching", type: "person" },
  { title: "Admin console", href: "/admin", meta: "Publishing & analytics", type: "course" },
];

export function CommandPalette({ signedIn = false, compact = false }: { signedIn?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const links = useMemo(
    () => (signedIn ? QUICK_LINKS : QUICK_LINKS.filter((link) => !link.href.startsWith("/admin") && !link.href.startsWith("/mentor") && link.href !== "/learn")),
    [signedIn],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setLoading(false);
    setActive(0);
  }, []);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
    setQuery("");
    setHits([]);
    setLoading(false);
    setActive(0);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, close]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=3`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { groups: { hits: Hit[] }[] };
        if (!controller.signal.aborted) {
          setHits(data.groups.flatMap((group) => group.hits).slice(0, 8));
          setActive(0);
        }
      } catch {
        /* aborted */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  const results: (Hit | QuickLink)[] = query.trim().length < 2 ? links : hits;
  const isFallback = query.trim().length < 2;

  function go(href: string) {
    close();
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(results.length - 1, value + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    }
    if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      go(results[active].href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Search the platform (Command K)"
        title="Search (Ctrl or Command + K)"
        className={cn(
          "group inline-flex h-9 shrink-0 items-center rounded-full border border-navy/15 bg-paper text-[11.5px] font-medium text-stone-500 transition-all hover:border-navy/30 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          compact ? "w-9 justify-center" : "gap-2 px-3",
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span className={cn("hidden", !compact && "lg:inline")}>Search</span>
        <kbd className={cn("hidden items-center gap-0.5 rounded border border-navy/15 bg-cream px-1.5 py-0.5 font-sans text-[9px] font-semibold text-stone-500", !compact && "lg:inline-flex")}>
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/45 px-4 pt-[12vh] backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/40 bg-paper shadow-pop"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Search Purpose Course"
            >
              <div className="flex items-center gap-2.5 border-b border-navy/10 px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-stone-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    const value = event.target.value;
                    setQuery(value);
                    setHits([]);
                    setLoading(value.trim().length >= 2);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Search articles, lessons, people, events…"
                  className="h-7 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-stone-400"
                  aria-label="Search query"
                />
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" /> : null}
                <kbd className="rounded border border-navy/15 bg-cream px-1.5 py-0.5 text-[9px] font-semibold text-stone-500">ESC</kbd>
              </div>

              <div className="max-h-[52vh] overflow-y-auto p-1.5">
                <p className="px-2.5 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  {isFallback ? "Jump to" : hits.length > 0 ? "Results" : "No matches"}
                </p>
                {results.length === 0 && !loading ? (
                  <p className="px-2.5 py-6 text-center text-[12px] text-stone-500">
                    Nothing found. Try “identity”, “purpose statement” or a mentor&apos;s name.
                  </p>
                ) : (
                  results.map((item, index) => {
                    const Icon = ICONS[item.type] ?? Search;
                    return (
                      <button
                        key={`${item.type}-${"id" in item ? item.id : item.href}`}
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(item.href)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                          active === index ? "bg-cream" : "hover:bg-cream/60",
                        )}
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy/[0.06] text-navy">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-navy">{item.title}</span>
                          <span className="block truncate text-[10.5px] text-stone-500">
                            {"snippet" in item && item.snippet ? item.snippet : item.meta}
                          </span>
                        </span>
                        <ArrowRight className={cn("mt-1.5 h-3 w-3 shrink-0", active === index ? "text-gold-dark" : "text-stone-300")} />
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-navy/10 bg-cream/40 px-4 py-2">
                <p className="text-[10px] text-stone-500">↑ ↓ to move · ↵ to open · esc to close</p>
                <button
                  type="button"
                  onClick={() => go(`/search?q=${encodeURIComponent(query)}`)}
                  className="text-[10.5px] font-semibold text-gold-dark hover:underline"
                >
                  All results →
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
