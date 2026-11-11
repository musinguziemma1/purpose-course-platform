import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flag, MessagesSquare, Pin, ThumbsUp, Users } from "lucide-react";
import { getCommunity } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDate, relativeTime } from "@/lib/utils";
import { ReplyForm, ReportForm, ThreadForm } from "@/components/platform/forms";
import { toggleCommunityMembership, toggleReaction } from "@/app/actions/platform";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function CommunityPage({ params }: Params) {
  const { slug } = await params;
  const user = await getSessionUser();
  const record = await getCommunity(slug, user?.profileId);
  if (!record) notFound();
  const { community, threads, members, joined } = record;

  return (
    <div className="min-h-screen bg-[#f6f2e9]">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Link href="/community" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> All communities
        </Link>

        <header className="overflow-hidden rounded-2xl border border-navy/10 bg-paper">
          <div className="relative">
            <img src={community.coverImageUrl ?? "/images/community.jpg"} alt="" className="h-32 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/50 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-gold">{community.category} · {community.visibility}</p>
              <p className="font-serif text-xl text-paper">{community.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <p className="max-w-xl text-[12px] leading-relaxed text-stone-600">{community.description}</p>
            <form action={toggleCommunityMembership}>
              <input type="hidden" name="communityId" value={community.id} />
              <button
                type="submit"
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[11.5px] font-semibold ${joined ? "border border-source/30 bg-source/5 text-source" : "bg-navy text-paper"}`}
              >
                <Users className="h-3.5 w-3.5" /> {joined ? "Leave community" : "Join community"}
              </button>
            </form>
          </div>
          {community.guidelines ? (
            <p className="border-t border-navy/8 bg-cream/40 px-5 py-2 text-[10.5px] leading-relaxed text-stone-600">{community.guidelines}</p>
          ) : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="space-y-3">
            <div className="rounded-xl border border-navy/10 bg-paper p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Start a discussion</p>
              <div className="mt-2"><ThreadForm communityId={community.id} /></div>
            </div>

            <div className="space-y-3">
              {threads.map(({ thread, reactionCount }) => (
                <article key={thread.id} className="rounded-xl border border-navy/10 bg-paper p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.isPinned ? <Pin className="h-3 w-3 text-gold-dark" /> : null}
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${thread.threadType === "question" ? "bg-gold/20 text-gold-dark" : "bg-cream text-stone-600"}`}>
                      {thread.threadType}
                    </span>
                    {thread.isAnswered ? <span className="rounded-full bg-source/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-source">answered</span> : null}
                    <span className="text-[10px] text-stone-500">{thread.authorName} · {relativeTime(thread.lastActivityAt)}</span>
                  </div>
                  <h2 className="mt-1 font-serif text-[16px] leading-snug text-navy">{thread.title}</h2>
                  {thread.prompt ? <p className="mt-1 text-[12px] leading-relaxed text-stone-600">{thread.prompt}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={toggleReaction}>
                      <input type="hidden" name="targetType" value="thread" />
                      <input type="hidden" name="targetId" value={thread.id} />
                      <input type="hidden" name="emoji" value="amen" />
                      <input type="hidden" name="path" value={`/community/${community.slug}`} />
                      <button type="submit" className="inline-flex h-7 items-center gap-1 rounded-full border border-navy/15 px-2.5 text-[10.5px] text-navy hover:bg-cream">
                        <ThumbsUp className="h-3 w-3" /> {reactionCount}
                      </button>
                    </form>
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-stone-500">
                      <MessagesSquare className="h-3 w-3" /> {thread.replyCount} replies
                    </span>
                    <details className="ml-auto">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-[10.5px] text-stone-400 hover:text-rose-600">
                        <Flag className="h-3 w-3" /> Report
                      </summary>
                      <div className="mt-1 w-64"><ReportForm targetType="thread" targetId={thread.id} /></div>
                    </details>
                  </div>
                  <ReplyForm threadId={thread.id} />
                </article>
              ))}
              {threads.length === 0 ? (
                <p className="rounded-xl border border-navy/10 bg-paper p-6 text-center text-[12.5px] text-stone-500">
                  No discussions yet. Start the first one above.
                </p>
              ) : null}
            </div>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-6">
            <div className="rounded-xl border border-navy/10 bg-paper p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Members</p>
              <ul className="mt-2 space-y-1.5">
                {members.map((member, index) => (
                  <li key={`${member.fullName}-${index}`} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="text-navy">{member.fullName}</span>
                    <span className="text-[9px] uppercase tracking-[0.08em] text-stone-500">{member.role}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-[11px] leading-relaxed text-stone-700">
              <p className="font-semibold text-gold-dark">Community rules</p>
              <p className="mt-1">Speak from your own experience. Ask before advising. Protect confidentiality. Report anything that harms the room — moderators review every report.</p>
              <p className="mt-2 text-[10px] text-stone-500">Opened {formatDate(community.createdAt, "short")}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
