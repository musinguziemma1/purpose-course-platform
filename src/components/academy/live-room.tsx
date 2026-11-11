"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircle, Radio, Send, Video } from "lucide-react";
import { relativeTime } from "@/lib/utils";

type Message = {
  id: number;
  authorName: string;
  authorRole: string;
  kind: string;
  body: string;
  createdAt: string;
};

const ROLE_TONE: Record<string, string> = {
  host: "bg-gold/20 text-gold-dark",
  mentor: "bg-[#e3eff0] text-[#155e63]",
  student: "bg-cream text-stone-600",
};

export function LiveRoom({
  sessionId,
  initialMessages,
  initialStatus,
  meetingUrl,
  recordingUrl,
  defaultName,
  canPost = true,
  isLive = false,
}: {
  sessionId: number;
  initialMessages: Message[];
  initialStatus: string;
  meetingUrl: string | null;
  recordingUrl: string | null;
  defaultName: string;
  canPost?: boolean;
  isLive?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"chat" | "question">("chat");
  const [name, setName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const response = await fetch(`/api/live/${sessionId}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          messages: Message[];
          status: string;
          serverTime: string;
        };
        if (!active) return;
        setMessages(data.messages ?? []);
        setStatus(data.status ?? "scheduled");
        setSyncedAt(data.serverTime);
      } catch {
        /* keep last snapshot */
      }
    }
    const timer = setInterval(poll, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages.length]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim().length < 2) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/live/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, kind, authorName: name }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: Message };
      if (!response.ok || !data.ok || !data.message) {
        setError(data.error ?? "Could not post that message.");
        return;
      }
      setMessages((current) => [...current, data.message as Message]);
      setBody("");
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  const live = status === "live" || isLive;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-navy/10 bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/10 bg-cream/50 px-4 py-2.5">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy">
          <span className={`h-2 w-2 rounded-full ${live ? "live-pulse bg-source" : "bg-stone-400"}`} />
          {live ? "Live feed" : `Feed · ${status}`}
        </p>
        <div className="flex items-center gap-2">
          {meetingUrl && status !== "ended" ? (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#155e63] px-3 text-[11px] font-semibold text-paper hover:bg-[#124a4e]"
            >
              <Video className="h-3.5 w-3.5" /> Join room
            </a>
          ) : null}
          {recordingUrl && status === "ended" ? (
            <a
              href={recordingUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-navy/15 px-3 text-[11px] font-medium text-navy hover:bg-cream"
            >
              <Radio className="h-3.5 w-3.5" /> Watch recording
            </a>
          ) : null}
        </div>
      </div>

      <div ref={scroller} className="max-h-[26rem] min-h-[16rem] flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-7 w-7 text-stone-300" />
            <p className="mt-2 text-[12.5px] font-medium text-navy">The feed is quiet.</p>
            <p className="mt-0.5 text-[11.5px] text-stone-500">Ask the first question — your host is watching.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2.5 ${message.kind === "system" ? "justify-center" : ""}`}
              >
                {message.kind === "system" ? (
                  <p className="rounded-full bg-cream px-3 py-1 text-[10.5px] uppercase tracking-[0.08em] text-stone-500">
                    {message.body}
                  </p>
                ) : (
                  <>
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-paper">
                      {message.authorName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1 rounded-lg border border-navy/8 bg-white px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11.5px] font-semibold text-navy">{message.authorName}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${ROLE_TONE[message.authorRole] ?? ROLE_TONE.student}`}>
                          {message.authorRole}
                        </span>
                        {message.kind === "question" ? (
                          <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-gold-dark">
                            question
                          </span>
                        ) : null}
                        <span className="ml-auto text-[9.5px] uppercase tracking-[0.08em] text-stone-400">
                          {relativeTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-stone-700">{message.body}</p>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <form onSubmit={send} className="border-t border-navy/10 bg-cream/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-navy/12 bg-paper p-0.5">
            {(["chat", "question"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                  kind === option ? "bg-navy text-paper" : "text-stone-500 hover:text-navy"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {!defaultName ? (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="h-9 w-32 rounded-lg border border-navy/15 bg-paper px-2.5 text-[12px] outline-none focus:border-gold"
            />
          ) : null}
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={canPost ? "Add to the discussion…" : "Read-only"}
            disabled={!canPost}
            className="h-9 flex-1 rounded-lg border border-navy/15 bg-paper px-3 text-[12.5px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !canPost}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-3 text-[11.5px] font-semibold text-paper disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
        {error ? <p className="mt-1.5 text-[11px] text-rose-600">{error}</p> : null}
        <p className="mt-1.5 text-[10px] text-stone-400">
          Live board · refreshes every few seconds{syncedAt ? ` · last sync ${new Date(syncedAt).toLocaleTimeString()}` : ""}
        </p>
      </form>
    </div>
  );
}
