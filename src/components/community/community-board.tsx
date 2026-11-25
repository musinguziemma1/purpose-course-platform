"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ChevronDown, Loader2, MessageCircle, Pin, Plus, Radio, Send, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn, initials, relativeTime } from "@/lib/utils";
import { Led } from "@/components/admin/console/instruments";

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

const EASE = [0.22, 1, 0.36, 1] as const;

/*
 * The live board on /community. Styled with the salon kit
 * (src/app/(site)/salon.css): cardstock board, an index-card prompt,
 * replies hanging from a stitched thread, lined paper for writing and a
 * wax-seal key to post. Behaviour is unchanged: it polls every 9 seconds.
 */
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
    <div className="sl-card min-w-0 overflow-hidden">
      <div className="sl-strip flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.16em] text-navy [text-shadow:0_1px_0_#fff]">
            <Led tone={live ? "green" : "off"} pulse={live} />
            {live ? "Live board" : "Reconnecting"}
          </p>
          <span className="text-[12px] uppercase tracking-[0.1em] text-stone-600">
            synced {lastSync === "now" ? "just now" : relativeTime(lastSync)}
          </span>
        </div>
        {canPost ? (
          <button type="button" onClick={() => setComposerOpen((value) => !value)} aria-expanded={composerOpen} className="sl-key sl-key-navy">
            {composerOpen ? <X aria-hidden /> : <Plus aria-hidden />}
            {composerOpen ? "Close" : "Start a discussion"}
          </button>
        ) : memberName ? (
          <span className="text-[13px] text-stone-600">Read-only access</span>
        ) : (
          <Link href="/login?next=%2Fcommunity" className="sl-key sl-key-navy">
            Sign in to discuss
          </Link>
        )}
      </div>

      <AnimatePresence initial={false}>
        {composerOpen && canPost ? (
          <motion.form
            key="composer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: EASE }}
            onSubmit={createThread}
            className="overflow-hidden border-b border-navy/10 bg-cream/50"
          >
            <div className="space-y-3 px-5 py-5 sm:px-6">
              <label htmlFor="community-title" className="block text-[14px] font-semibold text-navy">
                Discussion title
              </label>
              <input
                id="community-title"
                minLength={8}
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What do you want to discuss? (at least 8 characters)"
                className="sl-field h-11 px-3.5"
                required
              />
              <label htmlFor="community-prompt" className="block text-[14px] font-semibold text-navy">
                Discussion prompt
              </label>
              <textarea
                id="community-prompt"
                minLength={12}
                maxLength={1200}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Give the room something to respond to — a question, a situation, a reflection."
                rows={4}
                className="sl-field sl-lined pr-3.5"
                required
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-stone-600">Be specific and kind. Round-table rules apply.</p>
                <button type="submit" disabled={pending} className="sl-seal-key">
                  <span aria-hidden className="sl-seal">
                    {pending ? <Loader2 className="animate-spin" /> : <Star />}
                  </span>
                  Post discussion
                </button>
              </div>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {error ? (
        <p role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-[13px] text-rose-700 sm:px-6">
          {error}
        </p>
      ) : null}

      <ul>
        <AnimatePresence initial={false}>
          {threads.map((thread) => {
            const expanded = openThread === thread.id;
            return (
              <motion.li
                key={thread.id}
                layout="position"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="border-b border-navy/8 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setOpenThread(expanded ? null : thread.id)}
                  aria-expanded={expanded}
                  className="sl-board-row flex w-full items-start gap-3.5 px-5 py-4 text-left sm:px-6"
                >
                  <span aria-hidden className="sl-coin mt-0.5">
                    {initials(thread.authorName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {thread.isPinned ? <Pin aria-label="Pinned" className="h-3.5 w-3.5 text-gold-dark" /> : null}
                      <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-gold-dark">{thread.groupName ?? "Purpose Lounge"}</span>
                      {thread.isLocked ? (
                        <span className="rounded-full border border-navy/10 bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                          locked
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block break-words font-serif text-[18px] leading-snug text-navy [overflow-wrap:anywhere]">{thread.title}</span>
                    <span className="mt-1 block text-[13px] text-stone-600">
                      {thread.authorName} · active {relativeTime(thread.lastActivityAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2">
                    <span className="sl-bubble">
                      <MessageCircle aria-hidden className="h-3.5 w-3.5 text-gold-dark" /> {thread.replyCount}
                      <span className="sr-only"> replies</span>
                    </span>
                    <ChevronDown aria-hidden className={cn("h-4 w-4 text-stone-500 transition-transform duration-300", expanded && "rotate-180")} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden bg-cream/45"
                    >
                      <div className="space-y-4 px-5 pb-5 pt-2 sm:px-6">
                        {thread.prompt ? (
                          <p className="sl-index-card break-words px-4 py-3 font-serif text-[15.5px] italic leading-relaxed text-stone-800 [overflow-wrap:anywhere]">
                            {thread.prompt}
                          </p>
                        ) : null}
                        {thread.posts.length ? (
                          <motion.ol
                            className="sl-thread space-y-3"
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}
                          >
                            {thread.posts.map((post) => (
                              <motion.li
                                key={post.id}
                                variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0 } }}
                                transition={{ duration: 0.3, ease: EASE }}
                                className="relative flex gap-3"
                              >
                                <span aria-hidden className="sl-coin sl-coin-sm mt-1">
                                  {initials(post.authorName)}
                                </span>
                                <div className="sl-note min-w-0 flex-1 px-4 py-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[13.5px] font-semibold text-navy">{post.authorName}</p>
                                    <p className="text-[11.5px] uppercase tracking-[0.1em] text-stone-500">{relativeTime(post.createdAt)}</p>
                                  </div>
                                  <p className="mt-1 break-words text-[14.5px] leading-relaxed text-stone-800 [overflow-wrap:anywhere]">{post.body}</p>
                                </div>
                              </motion.li>
                            ))}
                          </motion.ol>
                        ) : (
                          <p className="text-[14px] italic text-stone-600">No replies yet — be the first.</p>
                        )}

                        {thread.isLocked ? (
                          <p className="inline-flex items-center gap-1.5 text-[13px] text-stone-600">
                            <Radio aria-hidden className="h-3.5 w-3.5" /> This thread is locked by a moderator.
                          </p>
                        ) : canPost ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <label htmlFor={`community-reply-${thread.id}`} className="sr-only">
                              Reply to {thread.title}
                            </label>
                            <input
                              id={`community-reply-${thread.id}`}
                              value={replyBody}
                              onChange={(event) => setReplyBody(event.target.value)}
                              placeholder="Add your reflection…"
                              className="sl-field h-11 min-w-0 flex-1 px-3.5"
                            />
                            <button type="button" onClick={() => postReply(thread.id)} disabled={pending} className="sl-key sl-key-navy">
                              {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
                              Reply
                            </button>
                          </div>
                        ) : !memberName ? (
                          <Link href="/login?next=%2Fcommunity" className="sl-key">
                            Sign in to reply
                          </Link>
                        ) : (
                          <p className="text-[14px] text-stone-600">Posting is unavailable for this role.</p>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {threads.length === 0 ? <p className="px-5 py-10 text-center text-[14px] text-stone-600">No discussions yet. Start the first one.</p> : null}
    </div>
  );
}
