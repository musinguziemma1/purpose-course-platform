import Link from "next/link";
import { ArrowRight, Megaphone, Pin } from "lucide-react";
import { getActiveAnnouncements } from "@/db/announcements";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

/** Active announcements for the signed-in person's audience, newest and pinned first. */
export async function AnnouncementsStrip() {
  const items = await getActiveAnnouncements(await getSessionUser());
  if (!items.length) return null;
  return (
    <section aria-label="Announcements" className="space-y-2">
      {items.map((item) => {
        const external = item.href ? /^https:/.test(item.href) : false;
        return (
          <article key={item.id} className="flex gap-3 rounded-xl border border-gold/35 bg-gold/[0.08] p-4">
            <Megaphone aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" />
            <div className="min-w-0 flex-1">
              <h2 className="flex flex-wrap items-center gap-x-2 text-[15px] font-semibold text-navy">
                {item.pinned ? <Pin aria-label="Pinned" className="h-4 w-4 text-gold-dark" /> : null}
                {item.title}
                {item.publishedAt ? <span className="text-[12px] font-normal text-stone-600">{formatDate(item.publishedAt)}</span> : null}
              </h2>
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-[14px] leading-relaxed text-stone-700">{item.body}</p>
              {item.href ? (
                <Link
                  href={item.href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="mt-2 inline-flex min-h-10 items-center gap-1 text-[14px] font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4"
                >
                  Learn more <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
