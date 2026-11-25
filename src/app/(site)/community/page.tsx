import type { CSSProperties } from "react";
import { publicUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, CalendarClock, DoorOpen, Lock, ScrollText, Star, Users } from "lucide-react";
import { CommunityBoard } from "@/components/community/community-board";
import { RoundTable } from "@/components/community/round-table";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PublicHero } from "@/components/site/public-hero";
import { Led, Odometer } from "@/components/admin/console/instruments";
import { getDiscussionGroups, getThreadsWithPosts } from "@/db/queries";
import { getCommunities } from "@/db/learning";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import "../salon.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The learning community",
  description:
    "Join live discussions, round-table prompts and mentorship conversations in the Purpose Course learning community.",
  alternates: { canonical: publicUrl("/community") },
};

const ACCENT: Record<string, string> = {
  navy: "#122a4d",
  gold: "#c9a227",
  green: "#2f6b40",
  source: "#2f6b40",
  purple: "#5a3a8a",
  potential: "#5a3a8a",
  teal: "#155e63",
  destiny: "#155e63",
};

const RULES = [
  "Speak from your own experience, not your opinion about other people's.",
  "Ask before advising.",
  "Confidentiality is not optional.",
  "Silence is a contribution — do not fill it for someone else.",
];
const NUMERALS = ["I", "II", "III", "IV"];
const plural = (value: number, one: string, many = `${one}s`) => `${value} ${Number(value) === 1 ? one : many}`;

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

  // The people who spoke most recently, once each: they take the seats at the table.
  const voices = [...new Set(threads.flatMap((thread) => [...thread.posts.map((post) => post.authorName).reverse(), thread.authorName]))];
  const replies = threads.reduce((sum, thread) => sum + Number(thread.replyCount), 0);

  return (
    <>
      <PublicHero
        tone="dark"
        image="/images/learning-together.jpg"
        eyebrow={
          <span className="inline-flex items-center gap-2.5">
            <Led tone="green" pulse /> Purpose Learning Community
          </span>
        }
        title={
          <>
            The room is <span className="text-sheen">open.</span>
          </>
        }
        description="Real-time group discussion is the heart of the Purpose Course. Ask an honest question, respond to someone else's, and watch how clarity grows in conversation rather than isolation."
        actions={
          <>
            <a href="#board" className="sl-key sl-key-brass">
              Join the discussion <ArrowDown aria-hidden />
            </a>
            <a href="#charter" className="sl-key sl-key-ghost">
              <ScrollText aria-hidden /> Round-table rules
            </a>
          </>
        }
        aside={<RoundTable voices={voices} />}
      >
        <ul className="flex flex-wrap gap-2.5 text-[13px] text-paper/80">
          {["Open to readers", "Moderated by the editorial desk", "Round-table rules apply"].map((item) => (
            <li key={item} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5">
              <Star aria-hidden className="h-3 w-3 fill-gold text-gold" /> {item}
            </li>
          ))}
        </ul>
      </PublicHero>

      <div className="sl-desk pb-16 lg:pb-24">
        <div className="shell relative z-10 -mt-10">
          <Reveal>
            <section aria-label="The room at a glance" className="sl-leather p-3 sm:p-4">
              <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {[
                  { label: "Discussions on the board", value: threads.length },
                  { label: "Replies in those threads", value: replies },
                  { label: "Voices at the table", value: voices.length },
                  { label: "Rooms to gather in", value: groups.length },
                ].map((item) => (
                  <div key={item.label} className="sl-well-dark flex flex-col items-center px-3 py-4 text-center">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper/70">{item.label}</dt>
                    <dd className="mt-2.5 text-[1.7rem] sm:text-[2rem]">
                      <Odometer value={item.value} wheels />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </Reveal>
        </div>

        <section className="shell mt-12 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)] lg:items-start">
          <Reveal className="min-w-0">
            <div id="board" className="scroll-mt-28">
              <p className="eyebrow">The round table</p>
              <h2 className="mt-3 font-serif text-[2.1rem] leading-tight text-navy sm:text-[2.5rem]">Pull up a chair</h2>
              <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-stone-700">
                Open a thread to read the room, then add your reflection. Replies appear for everyone within seconds.
              </p>
              <div className="mt-6">
                <CommunityBoard initialThreads={initialThreads} memberName={user?.fullName ?? null} canPost={can(user, "community.post")} />
              </div>
            </div>
            {initialThreads.length > 0 ? (
              <div className="sl-card mt-5 overflow-hidden">
                <p className="sl-strip px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-navy">Read a discussion in full</p>
                <ul className="divide-y divide-navy/8">
                  {initialThreads.slice(0, 4).map((thread) => (
                    <li key={thread.id}>
                      <Link
                        href={`/community/thread/${thread.id}`}
                        className="sl-board-row group flex min-h-11 items-center justify-between gap-3 px-5 py-2.5 text-[14.5px] text-navy"
                      >
                        <span className="truncate font-serif">{thread.title}</span>
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] text-stone-600">
                          {plural(thread.replyCount, "reply", "replies")}
                          <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-4 text-[13.5px] leading-relaxed text-stone-600">
              The board refreshes automatically every few seconds so replies appear for everyone in the room.
              {!user ? (
                <>
                  {" "}
                  <Link href="/login" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
                    Sign in
                  </Link>{" "}
                  to post with your profile.
                </>
              ) : null}
            </p>
          </Reveal>

          <div className="min-w-0 space-y-6">
            {purposeCommunities.length ? (
              <Reveal>
                <section aria-labelledby="communities-heading" className="sl-card overflow-hidden">
                  <h2 id="communities-heading" className="sl-strip flex items-center gap-2.5 px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-navy">
                    <Users aria-hidden className="h-4 w-4 text-gold-dark" /> Purpose communities
                  </h2>
                  <Stagger className="space-y-2.5 p-4">
                    {purposeCommunities.map(({ community, threadCount, memberCount, joined }) => (
                      <StaggerItem key={community.id}>
                        <Link
                          href={`/community/${community.slug}`}
                          className="sl-member-card sl-lift"
                          style={{ "--tone": ACCENT[community.accent] ?? "#c9a227" } as CSSProperties}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-serif text-[16px] leading-snug text-navy">{community.name}</span>
                            {joined ? <span className="sl-stamp shrink-0 text-source">Member</span> : null}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-stone-700">{community.description}</span>
                          <span className="mt-1.5 block text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                            {community.category} · {plural(threadCount, "thread")} · {plural(memberCount, "member")}
                          </span>
                        </Link>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </section>
              </Reveal>
            ) : null}

            {groups.length ? (
              <Reveal delay={0.05}>
                <section aria-labelledby="rooms-heading" className="sl-card overflow-hidden">
                  <h2 id="rooms-heading" className="sl-strip flex items-center gap-2.5 px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-navy">
                    <DoorOpen aria-hidden className="h-4 w-4 text-gold-dark" /> Rooms in the house
                  </h2>
                  <ul className="space-y-5 p-5">
                    {groups.map((group) => (
                      <li key={group.id}>
                        <span className="sl-doorplate">
                          {group.name}
                          {group.isMembersOnly ? <Lock aria-label="Members only" className="h-3.5 w-3.5" /> : null}
                        </span>
                        {group.description ? <p className="mt-2 text-[14px] leading-relaxed text-stone-700">{group.description}</p> : null}
                        {group.isMembersOnly ? <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">Members only</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            ) : null}

            <Reveal delay={0.08}>
              <section id="charter" aria-labelledby="charter-heading" className="sl-parchment scroll-mt-28 px-6 pb-14 pt-7 sm:px-8">
                <p className="text-center text-[11px] font-bold uppercase tracking-[0.24em] text-[#8a6a12]">The charter</p>
                <h2 id="charter-heading" className="mt-1.5 text-center font-serif text-[1.65rem] text-navy">
                  Round-table rules
                </h2>
                <ol className="mt-5 space-y-3.5">
                  {RULES.map((rule, index) => (
                    <li key={rule} className="flex gap-3.5 text-[15px] leading-relaxed text-stone-800">
                      <span aria-hidden className="w-7 shrink-0 pt-0.5 text-right font-serif text-[15px] font-semibold text-[#8a6a12]">
                        {NUMERALS[index]}.
                      </span>
                      <span className="font-serif">{rule}</span>
                    </li>
                  ))}
                </ol>
                <div aria-hidden className="sl-ribbon-tails mt-7">
                  <span className="sl-seal sl-seal-lg relative z-10">
                    <Star />
                  </span>
                </div>
              </section>
            </Reveal>

            <Reveal delay={0.1}>
              <section className="sl-leather p-6 sm:p-7">
                <span className="sl-plate">Coming next</span>
                <h2 className="mt-4 flex items-center gap-2.5 font-serif text-[1.45rem] text-paper">
                  <CalendarClock aria-hidden className="h-5 w-5 text-gold" /> Live classes
                </h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-paper/75">
                  We are building scheduled live rooms with breakout tables, attendance tracking and recordings for enrolled participants.
                </p>
                <Link href="/course#enrol" className="sl-key sl-key-brass mt-5">
                  Join the cohort <ArrowRight aria-hidden />
                </Link>
              </section>
            </Reveal>
          </div>
        </section>
      </div>
    </>
  );
}
