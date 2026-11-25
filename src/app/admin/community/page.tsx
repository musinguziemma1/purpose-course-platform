import { requireAdminPage } from "@/lib/page-access";
import { Lock, MessagesSquare, Pin, Trash2 } from "lucide-react";
import { getThreadsWithPosts } from "@/db/queries";
import { deleteThread, toggleThreadFlag } from "@/app/actions/community";
import { canModerateCommunity, getSessionUser } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";
import { Led } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Community moderation" };

export default async function AdminCommunityPage() {
  await requireAdminPage("/admin/community");
  const [threads, user] = await Promise.all([getThreadsWithPosts(40), getSessionUser()]);
  const canModerate = canModerateCommunity(user);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Round table"
        title="Community"
        description={`${threads.length} live discussions. Pin the strongest prompts, lock threads that have run their course, and remove anything that breaks the round-table rules.`}
      />

      {threads.length === 0 ? (
        <ConsoleEmpty icon={MessagesSquare} title="No discussions yet." description="Threads started in the community appear here for moderation." />
      ) : (
        <ul className="k-stagger space-y-3.5">
          {threads.map((thread, index) => {
            const latest = thread.posts[thread.posts.length - 1];
            return (
              <li key={thread.id} style={staggerStyle(index)} className="admin-card relative p-5">
                {thread.isPinned ? <span aria-hidden className="k-pin" style={{ left: "1.75rem" }} /> : null}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-gold-dark">{thread.groupName ?? "Purpose Lounge"}</span>
                      {thread.isPinned ? (
                        <span className="ui-badge inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-dark">
                          <Pin aria-hidden className="h-3 w-3" /> pinned
                        </span>
                      ) : null}
                      {thread.isLocked ? (
                        <span className="ui-badge inline-flex items-center gap-1 rounded-full border border-navy/10 bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-700">
                          <Lock aria-hidden className="h-3 w-3" /> locked
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 font-serif text-[18px] leading-snug text-navy">{thread.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[12.5px] text-stone-600">
                      <Led tone={thread.isLocked ? "off" : "green"} />
                      {thread.authorName} · {thread.replyCount} replies · active {relativeTime(thread.lastActivityAt)}
                    </p>
                    {thread.prompt ? (
                      <p className="mt-2.5 line-clamp-2 max-w-3xl rounded-xl bg-cream/60 px-3.5 py-2 text-[13.5px] leading-relaxed text-stone-700 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">
                        {thread.prompt}
                      </p>
                    ) : null}
                    {latest ? (
                      <p className="mt-2.5 text-[13px] text-stone-600">
                        Latest: <span className="font-medium text-stone-800">{latest.authorName}</span> — {latest.body.slice(0, 120)}
                      </p>
                    ) : null}
                  </div>

                  {canModerate ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <form action={toggleThreadFlag}>
                        <input type="hidden" name="threadId" value={thread.id} />
                        <input type="hidden" name="flag" value="pin" />
                        <button type="submit" className={keyClass("paper", "sm")}>
                          <Pin aria-hidden /> {thread.isPinned ? "Unpin" : "Pin"}
                        </button>
                      </form>
                      <form action={toggleThreadFlag}>
                        <input type="hidden" name="threadId" value={thread.id} />
                        <input type="hidden" name="flag" value="lock" />
                        <button type="submit" className={keyClass("paper", "sm")}>
                          <Lock aria-hidden /> {thread.isLocked ? "Unlock" : "Lock"}
                        </button>
                      </form>
                      <form action={deleteThread}>
                        <input type="hidden" name="threadId" value={thread.id} />
                        <button type="submit" className={keyClass("danger", "sm")}>
                          <Trash2 aria-hidden /> Remove
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-stone-600">Editor access required to moderate.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
