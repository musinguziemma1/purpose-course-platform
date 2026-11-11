import { Lock, Pin, Trash2 } from "lucide-react";
import { getThreadsWithPosts } from "@/db/queries";
import { deleteThread, toggleThreadFlag } from "@/app/actions/community";
import { canModerateCommunity, getSessionUser } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Community moderation" };

export default async function AdminCommunityPage() {
  const [threads, user] = await Promise.all([getThreadsWithPosts(40), getSessionUser()]);
  const canModerate = canModerateCommunity(user);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Community</h1>
        <p className="text-[12.5px] text-stone-600">
          {threads.length} live discussions. Pin the strongest prompts, lock threads that have run their course, and
          remove anything that breaks the round-table rules.
        </p>
      </div>

      <div className="space-y-3">
        {threads.map((thread) => (
          <div key={thread.id} className="admin-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                    {thread.groupName ?? "Purpose Lounge"}
                  </span>
                  {thread.isPinned ? <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-gold-dark">pinned</span> : null}
                  {thread.isLocked ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-stone-500">locked</span> : null}
                </div>
                <p className="mt-1 font-serif text-[16px] leading-snug text-navy">{thread.title}</p>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {thread.authorName} · {thread.replyCount} replies · active {relativeTime(thread.lastActivityAt)}
                </p>
                {thread.prompt ? (
                  <p className="mt-2 line-clamp-2 max-w-3xl rounded-md bg-cream/60 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-600">
                    {thread.prompt}
                  </p>
                ) : null}
                {thread.posts.length ? (
                  <p className="mt-2 text-[11px] text-stone-500">
                    Latest: <span className="text-stone-700">{thread.posts[thread.posts.length - 1].authorName}</span> —{" "}
                    {thread.posts[thread.posts.length - 1].body.slice(0, 120)}
                  </p>
                ) : null}
              </div>

              {canModerate ? (
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <form action={toggleThreadFlag}>
                    <input type="hidden" name="threadId" value={thread.id} />
                    <input type="hidden" name="flag" value="pin" />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-navy/15 px-2.5 text-[10.5px] font-medium text-navy hover:bg-cream"
                    >
                      <Pin className="h-3 w-3" /> {thread.isPinned ? "Unpin" : "Pin"}
                    </button>
                  </form>
                  <form action={toggleThreadFlag}>
                    <input type="hidden" name="threadId" value={thread.id} />
                    <input type="hidden" name="flag" value="lock" />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-navy/15 px-2.5 text-[10.5px] font-medium text-navy hover:bg-cream"
                    >
                      <Lock className="h-3 w-3" /> {thread.isLocked ? "Unlock" : "Lock"}
                    </button>
                  </form>
                  <form action={deleteThread}>
                    <input type="hidden" name="threadId" value={thread.id} />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-rose-200 px-2.5 text-[10.5px] font-medium text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500">Editor access required to moderate.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
