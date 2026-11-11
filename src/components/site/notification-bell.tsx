"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { relativeTime } from "@/lib/utils";

type Notification = {
  id: number;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  type: string;
  createdAt: string;
};

export function NotificationBell({ profileId }: { profileId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    async function load() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { notifications: Notification[] };
        if (mounted.current) setNotifications(data.notifications ?? []);
      } catch {
        /* ignore polling errors */
      }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [profileId]);

  const unread = notifications.filter((item) => !item.isRead).length;

  async function markAllRead() {
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    await fetch("/api/notifications", { method: "POST" }).catch(() => undefined);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-navy/15 text-navy transition-colors hover:bg-cream"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-navy/12 bg-paper shadow-pop"
          >
            <div className="flex items-center justify-between border-b border-navy/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy">Notifications</p>
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-navy"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-stone-500">You are all caught up.</p>
              ) : (
                notifications.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href ?? "/admin"}
                    onClick={() => setOpen(false)}
                    className="block border-b border-navy/6 px-4 py-3 transition-colors last:border-0 hover:bg-cream/60"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.isRead ? "bg-stone-300" : "bg-gold"}`}
                      />
                      <div>
                        <p className="text-[13px] font-medium text-navy">{item.title}</p>
                        {item.body ? <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{item.body}</p> : null}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-400">
                          {relativeTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
