"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Loader2, MessageCircle, Pin, Plus, Radio, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/utils";

type Post = { id: number; authorName: string; body: string; createdAt: string | Date };
type Thread = {
  id: number;
  title: string;
  prompt: string | null;
  authorName: string;
  replyCount: number;
  lastActivityAt: string | Date;
  groupName: string | null;
  groupAccent: string | null;
  isPinned: boolean;
  isLocked: boolean;
  posts: Post[];
};

export function CommunityBoard({
  initialThreads,
  memberName,
  canPost,
}: {
  initialThreads: Thread[];
  memberName: string | null;
  canPost: boolean;
}) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [openThread, setOpenThread] = useState<number | null>(initialThreads[0]?.id ?? null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState(true);
  const [lastSync, setLastSync] = useState<string>("now");

  async function refresh() {
    try {
      const response = await fetch("/api/community/threads", { cache: "no-store" });
      if (!response.ok) { setLive(false); return; }
      const data = (await response.json()) as { threads: Thread[] };
      if (Array.isArray(data.threads)) {
        setThreads(data.threads);
        setLastSync(new Date().toISOString());
        setLive(true);
      }
    } catch {
      setLive(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(refresh, 9000);
    return () => clearInterval(interval);
  }, []);

  async function createThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prompt }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; threadId?: number };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Could not post that discussion.");
        return;
      }
      setTitle("");
      setPrompt("");
      setComposerOpen(false);
      await refresh();
      if (data.threadId) setOpenThread(data.threadId);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function postReply(threadId: number) {
    if (replyBody.trim().length < 2) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: replyBody }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Could not add your reply.");
        return;
      }
      setReplyBody("");
      await refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-0 rounded-2xl border border-navy/10 bg-paper shadow-[0_1px_0_rgba(10,26,48,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy">
            <span className={`h-2 w-2 rounded-full ${live ? "live-pulse bg-source" : "bg-stone-400"}`} />
            {live ? "Live board" : "Reconnecting"}
          </p>
          <span className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400">
            synced {lastSync === "now" ? "just now" : relativeTime(lastSync)}
          </span>
        </div>
        {canPost ? <button
          type="button"
          onClick={() => setComposerOpen((value) => !value)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 text-[12px] font-semibold text-paper hover:bg-navy-700"
        >
          {composerOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {composerOpen ? "Close" : "Start a discussion"}
        </button> : memberName ? <span className="text-xs text-stone-600">Read-only access</span> : <Link href="/login?next=%2Fcommunity" className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-paper">Sign in to discuss</Link>}
      </div>

      <AnimatePresence initial={false}>
        {composerOpen && canPost ? (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={createThread}
            className="overflow-hidden border-b border-navy/10 bg-cream/50"
          >
            <div className="space-y-3 px-5 py-4">
              <label htmlFor="community-title" className="block text-sm font-medium text-navy">Discussion title</label>
              <input
                id="community-title"
                minLength={8}
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What do you want to discuss? (at least 8 characters)"
                className="h-10 w-full rounded-lg border border-navy/15 bg-paper px-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                required
              />
              <label htmlFor="community-prompt" className="block text-sm font-medium text-navy">Discussion prompt</label>
              <textarea
                id="community-prompt"
                minLength={12}
                maxLength={1200}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Give the room something to respond to — a question, a situation, a reflection."
                rows={3}
                className="w-full rounded-lg border border-navy/15 bg-paper px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                required
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-stone-500">Be specific and kind. Round-table rules apply.</p>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gold px-4 text-[12px] font-semibold text-ink disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Post discussion
                </button>
              </div>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {error ? <p role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-700">{error}</p> : null}

      <ul className="divide-y divide-navy/8">
        {threads.map((thread) => {
          const expanded = openThread === thread.id;
          return (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => setOpenThread(expanded ? null : thread.id)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-cream/40"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-[11px] font-semibold text-navy">
                  {thread.authorName
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {thread.isPinned ? <Pin className="h-3 w-3 text-gold-dark" /> : null}
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
                      {thread.groupName ?? "Purpose Lounge"}
                    </span>
                    {thread.isLocked ? (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-stone-500">
                        locked
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block break-words font-serif text-[16.5px] leading-snug text-navy [overflow-wrap:anywhere]">{thread.title}</span>
                  <span className="mt-1 block text-[11.5px] text-stone-500">
                    {thread.authorName} · active {relativeTime(thread.lastActivityAt)}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-stone-500">
                  <MessageCircle className="h-3.5 w-3.5" /> {thread.replyCount}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-cream/40"
                  >
                    <div className="space-y-3 px-5 py-4">
                      {thread.prompt ? (
                        <p className="break-words rounded-lg border border-navy/10 bg-paper px-3.5 py-2.5 text-[13px] leading-relaxed text-stone-700 [overflow-wrap:anywhere]">
                          {thread.prompt}
                        </p>
                      ) : null}
                      {thread.posts.map((post) => (
                        <div key={post.id} className="flex gap-2.5">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-paper">
                            {post.authorName
                              .split(" ")
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")}
                          </span>
                          <div className="min-w-0 flex-1 rounded-lg border border-navy/8 bg-paper px-3.5 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[12px] font-medium text-navy">{post.authorName}</p>
                              <p className="text-[10px] uppercase tracking-[0.1em] text-stone-400">
                                {relativeTime(post.createdAt)}
                              </p>
                            </div>
                            <p className="mt-1 break-words text-[13px] leading-relaxed text-stone-700 [overflow-wrap:anywhere]">{post.body}</p>
                          </div>
                        </div>
                      ))}

                      {thread.posts.length === 0 ? (
                        <p className="text-[12.5px] italic text-stone-500">No replies yet — be the first.</p>
                      ) : null}

                      {thread.isLocked ? (
                        <p className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-500">
                          <Radio className="h-3 w-3" /> This thread is locked by a moderator.
                        </p>
                      ) : canPost ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <label htmlFor={`community-reply-${thread.id}`} className="sr-only">Reply to {thread.title}</label>
                          <input
                            id={`community-reply-${thread.id}`}
                            value={replyBody}
                            onChange={(event) => setReplyBody(event.target.value)}
                            placeholder="Add your reflection…"
                            className="h-10 min-w-0 flex-1 rounded-lg border border-navy/15 bg-paper px-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                          />
                          <button
                            type="button"
                            onClick={() => postReply(thread.id)}
                            disabled={pending}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-navy px-4 text-[12px] font-semibold text-paper disabled:opacity-60"
                          >
                            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Reply
                          </button>
                        </div>
                      ) : !memberName ? <Link href="/login?next=%2Fcommunity" className="inline-block text-sm font-semibold text-navy underline">Sign in to reply</Link> : <p className="text-sm text-stone-600">Posting is unavailable for this role.</p>}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {threads.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-stone-500">No discussions yet. Start the first one.</p>
      ) : null}
    </div>
  );
}
