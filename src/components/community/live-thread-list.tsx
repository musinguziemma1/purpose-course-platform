"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { relativeTime } from "@/lib/utils";

type Thread = {
  id: number;
  title: string;
  authorName: string;
  replyCount: number;
  lastActivityAt: string | Date;
  groupName: string | null;
  groupAccent: string | null;
  latestPost: { authorName: string; body: string; createdAt: string | Date } | null;
};

const ACCENT: Record<string, string> = {
  gold: "text-gold",
  navy: "text-navy-300",
  teal: "text-[#7fc7c9]",
};

export function LiveThreadList({ initialThreads }: { initialThreads: Thread[] }) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [syncedAt, setSyncedAt] = useState<string>("just now");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/community/threads", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { threads: Thread[] };
        if (active && Array.isArray(data.threads)) {
          setThreads(data.threads);
          setSyncedAt(new Date().toISOString());
        }
      } catch {
        /* offline — keep last snapshot */
      }
    }
    const poll = setInterval(load, 12000);
    const clock = setInterval(() => setTick((value) => value + 1), 30000);
    return () => {
      active = false;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/80">
          <span className="live-pulse h-2 w-2 rounded-full bg-source" />
          Live from the community
        </p>
        <span className="text-[10px] uppercase tracking-[0.12em] text-paper/40" data-tick={tick}>
          synced {syncedAt === "just now" ? "just now" : relativeTime(syncedAt)}
        </span>
      </div>
      <ul className="divide-y divide-white/8">
        {threads.slice(0, 4).map((thread) => (
          <li key={thread.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${ACCENT[thread.groupAccent ?? "gold"] ?? "text-gold"}`}>
                {thread.groupName ?? "Purpose Lounge"}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-paper/40">
                <Radio className="h-3 w-3" /> {thread.replyCount} replies
              </span>
            </div>
            <p className="mt-1.5 font-serif text-[15px] leading-snug text-paper/95">{thread.title}</p>
            {thread.latestPost ? (
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-paper/55">
                <span className="text-paper/75">{thread.latestPost.authorName}:</span> {thread.latestPost.body}
              </p>
            ) : null}
            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-paper/35">
              Active {relativeTime(thread.lastActivityAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
