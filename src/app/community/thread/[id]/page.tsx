import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Flag, MessagesSquare, Pin, ThumbsUp, UserRound } from "lucide-react";
import { getThread } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { ReplyForm, ReportForm } from "@/components/platform/forms";
import { moderateThread, toggleReaction } from "@/app/actions/platform";

export const dynamic = "force-dynamic";

export const metadata = { title: "Discussion" };

type Params = { params: Promise<{ id: string }> };

export default async function ThreadPage({ params }: Params) {
  const { id } = await params;
  const threadId = Number(id);
  const user = await getSessionUser();
  const record = await getThread(threadId, user?.profileId);
  if (!record) notFound();

  const { thread, posts, communityName, communitySlug, reactionCount, reacted } = record;
  const canModerate = Boolean(user && ["editor", "moderator", "platform_admin", "super_admin", "program_manager"].includes(user.roleSlug));
  const path = `/community/thread/${thread.id}`;

  return (
    <div className="min-h-screen bg-[#f6f2e9]">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Link
          href={communitySlug ? `/community/${communitySlug}` : "/community"}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {communityName ?? "Community"}
        </Link>

        <article className="rounded-xl border border-navy/10 bg-paper p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${thread.threadType === "question" ? "bg-gold/20 text-gold-dark" : "bg-cream text-stone-600"}`}>
              {thread.threadType}
            </span>
            {thread.isPinned ? <Pin className="h-3 w-3 text-gold-dark" /> : null}
            {thread.isAnswered ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-source/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-source">
                <CheckCircle2 className="h-2.5 w-2.5" /> answered
              </span>
            ) : null}
            {thread.isLocked ? (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-stone-500">locked</span>
            ) : null}
            <span className="text-[10px] text-stone-500">{relativeTime(thread.createdAt)}</span>
          </div>
          <h1 className="mt-2 font-serif text-2xl leading-snug text-navy">{thread.title}</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-stone-500">
            <UserRound className="h-3 w-3" /> {thread.authorName}
          </p>
          {thread.prompt ? (
            <p className="mt-3 whitespace-pre-line rounded-lg border border-navy/10 bg-cream/40 px-3.5 py-3 text-[13px] leading-relaxed text-stone-700">
              {thread.prompt}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={toggleReaction}>
              <input type="hidden" name="targetType" value="thread" />
              <input type="hidden" name="targetId" value={thread.id} />
              <input type="hidden" name="emoji" value="amen" />
              <input type="hidden" name="path" value={path} />
              <button
                type="submit"
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium ${reacted ? "border-gold/50 bg-gold/10 text-gold-dark" : "border-navy/15 text-navy hover:bg-cream"}`}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> {reacted ? "Amen" : "Say amen"} · {reactionCount}
              </button>
            </form>
            <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
              <MessagesSquare className="h-3.5 w-3.5" /> {posts.length} replies
            </span>
            <details className="ml-auto">
              <summary className="inline-flex cursor-pointer items-center gap-1 text-[10.5px] text-stone-400 hover:text-rose-600">
                <Flag className="h-3 w-3" /> Report
              </summary>
              <div className="mt-1 w-64">
                <ReportForm targetType="thread" targetId={thread.id} />
              </div>
            </details>
          </div>

          {canModerate ? (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-navy/8 pt-2">
              {[
                ["pin", thread.isPinned ? "Unpin" : "Pin"],
                ["answer", "Mark answered"],
                [thread.isRemoved ? "restore" : "remove", thread.isRemoved ? "Restore" : "Remove"],
              ].map(([action, label]) => (
                <form key={action} action={moderateThread}>
                  <input type="hidden" name="threadId" value={thread.id} />
                  <input type="hidden" name="action" value={action} />
                  <button type="submit" className="rounded-full border border-navy/15 px-2.5 py-1 text-[10px] font-medium text-navy hover:bg-cream">
                    {label}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
        </article>

        <div className="space-y-2.5">
          {posts.map(({ post, reactionCount: postReactions }) => (
            <div key={post.id} className="rounded-xl border border-navy/10 bg-paper p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-paper">
                  {post.authorName
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div>
                  <p className="text-[11.5px] font-medium text-navy">{post.authorName}</p>
                  <p className="text-[9.5px] uppercase tracking-[0.08em] text-stone-400">{formatDateTime(post.createdAt)}</p>
                </div>
                <form action={toggleReaction} className="ml-auto">
                  <input type="hidden" name="targetType" value="post" />
                  <input type="hidden" name="targetId" value={post.id} />
                  <input type="hidden" name="emoji" value="amen" />
                  <input type="hidden" name="path" value={path} />
                  <button type="submit" className="inline-flex h-7 items-center gap-1 rounded-full border border-navy/15 px-2.5 text-[10px] text-navy hover:bg-cream">
                    <ThumbsUp className="h-3 w-3" /> {postReactions}
                  </button>
                </form>
              </div>
              <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-stone-700">{post.body}</p>
            </div>
          ))}
          {posts.length === 0 ? (
            <p className="rounded-xl border border-navy/10 bg-paper p-5 text-center text-[12px] text-stone-500">
              No replies yet — be the first to respond.
            </p>
          ) : null}
        </div>

        {thread.isLocked ? (
          <p className="rounded-xl border border-navy/10 bg-cream/50 p-3.5 text-[11.5px] text-stone-600">
            This thread is locked by a moderator. You can still read it.
          </p>
        ) : (
          <div className="rounded-xl border border-navy/10 bg-paper p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Add your reply</p>
            <ReplyForm threadId={thread.id} />
          </div>
        )}

        <p className="text-center text-[10px] text-stone-400">
          Community guidelines apply · reports are reviewed by moderators
        </p>
      </div>
    </div>
  );
}
