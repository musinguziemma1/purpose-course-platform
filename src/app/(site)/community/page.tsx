import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CalendarClock, MessagesSquare, Users, Video } from "lucide-react";
import { CommunityBoard } from "@/components/community/community-board";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { getDiscussionGroups, getThreadsWithPosts } from "@/db/queries";
import { getCommunities } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The learning community",
  description:
    "Join live discussions, round-table prompts and mentorship conversations in the Purpose Course learning community.",
  alternates: { canonical: "https://purposecourse.org/community" },
};

export default async function CommunityPage() {
  const [threads, groups, user] = await Promise.all([
    getThreadsWithPosts(8),
    getDiscussionGroups(),
    getSessionUser(),
  ]);
  const purposeCommunities = await getCommunities(user?.profileId).catch(() => []);

  const initialThreads = threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    prompt: thread.prompt,
    authorName: thread.authorName,
    replyCount: thread.replyCount,
    lastActivityAt: thread.lastActivityAt,
    groupName: thread.groupName,
    groupAccent: thread.groupAccent,
    isPinned: thread.isPinned,
    isLocked: thread.isLocked,
    posts: thread.posts.map((post) => ({
      id: post.id,
      authorName: post.authorName,
      body: post.body,
      createdAt: post.createdAt,
    })),
  }));

  return (
    <>
      <section className="relative overflow-hidden bg-ink py-14 text-paper lg:py-18">
        <div className="absolute inset-0 ink-grid opacity-40" aria-hidden />
        <div className="shell relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold">
              <span className="live-pulse h-2 w-2 rounded-full bg-source" /> Purpose Learning Community
            </p>
            <h1 className="display mt-5 text-4xl sm:text-5xl">The room is open.</h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-paper/65">
              Real-time group discussion is the heart of the Purpose Course. Ask an honest question, respond to
              someone else&apos;s, and watch how clarity grows in conversation rather than isolation.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-[11px] text-paper/60">
              {["Open to readers", "Moderated by the editorial desk", "Round-table rules apply"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
                  <span className="h-1 w-1 rounded-full bg-gold" /> {item}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-white/15">
              <img
                src="/images/community.jpg"
                alt="Purpose Course participants in a round-table discussion circle"
                className="h-40 w-full object-cover sm:h-48"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
              <p className="absolute bottom-3 left-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                Round table · Kampala cohort
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: MessagesSquare, value: String(threads.length), label: "Live discussions" },
              { icon: Users, value: String(groups.length), label: "Community spaces" },
              { icon: Video, value: "Weekly", label: "Live session rhythm" },
              { icon: Bell, value: "On", label: "Real-time updates" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <item.icon className="h-4 w-4 text-gold" />
                <p className="mt-2 font-serif text-xl text-paper">{item.value}</p>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-paper/45">{item.label}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="shell grid gap-8 lg:grid-cols-[1.5fr_0.8fr] lg:items-start">
          <Reveal className="min-w-0">
            <CommunityBoard initialThreads={initialThreads} memberName={user?.fullName ?? null} canPost={can(user, "community.post")} />
            {initialThreads.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-navy/10 bg-paper p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Open discussion pages</p>
                <ul className="mt-1.5 divide-y divide-navy/8">
                  {initialThreads.slice(0, 4).map((thread) => (
                    <li key={thread.id}>
                      <Link href={`/community/thread/${thread.id}`} className="flex items-center justify-between gap-2 py-1.5 text-[11.5px] text-navy hover:text-gold-dark">
                        <span className="truncate">{thread.title}</span>
                        <span className="shrink-0 text-[9.5px] uppercase tracking-[0.08em] text-stone-400">{thread.replyCount} replies →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-3 text-[11.5px] leading-relaxed text-stone-500">
              The board refreshes automatically every few seconds so replies appear for everyone in the room.
              {!user ? (
                <>
                  {" "}
                  <Link href="/login" className="font-medium text-navy underline decoration-gold decoration-2 underline-offset-2">
                    Sign in
                  </Link>{" "}
                  to post with your profile.
                </>
              ) : null}
            </p>
          </Reveal>

          <Reveal delay={0.1} className="min-w-0 space-y-5">
            <div className="rounded-2xl border border-navy/10 bg-paper p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">Purpose communities</p>
              <ul className="mt-3 space-y-2">
                {purposeCommunities.map(({ community, threadCount, memberCount, joined }) => (
                  <li key={community.id}>
                    <Link href={`/community/${community.slug}`} className="block rounded-lg border border-navy/8 px-2.5 py-2 transition-colors hover:border-gold/50 hover:bg-cream/40">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold text-navy">{community.name}</span>
                        {joined ? <span className="rounded-full bg-source/10 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase text-source">joined</span> : null}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-relaxed text-stone-600">{community.description.slice(0, 90)}…</span>
                      <span className="mt-0.5 block text-[9px] uppercase tracking-[0.08em] text-stone-400">
                        {community.category} · {threadCount} threads · {memberCount} members
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-navy/10 bg-paper p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">Spaces</p>
              <ul className="mt-3 space-y-3">
                {groups.map((group) => (
                  <li key={group.id} className="border-b border-navy/8 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-navy">{group.name}</p>
                      {group.isMembersOnly ? <Badge variant="outline">members</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-600">{group.description}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-navy/10 bg-cream/60 p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">Round-table rules</p>
              <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-stone-700">
                {[
                  "Speak from your own experience, not your opinion about other people's.",
                  "Ask before advising.",
                  "Confidentiality is not optional.",
                  "Silence is a contribution — do not fill it for someone else.",
                ].map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-navy p-5 text-paper">
              <CalendarClock className="h-5 w-5 text-gold" />
              <p className="mt-2 font-serif text-lg">Coming next: live classes</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-paper/60">
                We are building scheduled live rooms with breakout tables, attendance tracking and recordings for
                enrolled participants.
              </p>
              <Link href="/course#enrol" className="mt-4 inline-flex text-[12px] font-semibold uppercase tracking-[0.1em] text-gold">
                Join the cohort →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
