import { UpcomingEvents } from "@/components/academy/upcoming-events";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, CalendarDays, Download, GraduationCap, MessagesSquare, Radio, Users, Video } from "lucide-react";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { TestimonialCarousel } from "@/components/home/testimonial-carousel";
import { LiveThreadList } from "@/components/community/live-thread-list";
import { ArticleCard } from "@/components/site/article-card";
import { CoverImage } from "@/components/site/cover-image";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Aurora } from "@/components/site/public-hero";
import { SectionHeading, SectionLink } from "@/components/site/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { PrinciplesCompass } from "@/components/atelier/principles-compass";
import { Bookshelf, Envelope, Masthead, Medal, RouteMap } from "@/components/atelier/atelier";
import { PRINCIPLES } from "@/lib/media";
import {
  getCategoriesWithCounts,
  getCourseProgram,
  getFeaturedArticles,
  getResources,
  getSiteSettings,
  getTestimonials,
  getThreads,
  publishDueArticles,
} from "@/db/queries";
import "./atelier.css";

export const dynamic = "force-dynamic";

const COMMUNITY_FEATURES = [
  { icon: Video, title: "Live online classes", body: "Facilitated sessions with breakouts" },
  { icon: MessagesSquare, title: "Real-time discussion", body: "Threads, replies, round-table prompts" },
  { icon: Users, title: "Mentorship & coaching", body: "Clarity sessions with practitioners" },
  { icon: Radio, title: "Live progress & notifications", body: "Dashboards and in-app updates" },
];

const PHASES = [
  {
    phase: "01",
    title: "Purpose Course Blog",
    status: "Live now",
    body: "Public site, journal, review workflow, newsletter, resources and SEO.",
    ink: "green" as const,
    seal: "green" as const,
  },
  {
    phase: "02",
    title: "Purpose Course Academy",
    status: "Data ready",
    body: "Enrolments, lesson progress, quizzes and certificates are modelled.",
    ink: "gold" as const,
    seal: "gold" as const,
  },
  {
    phase: "03",
    title: "Purpose Learning Community",
    status: "In progress",
    body: "Live discussions today; mentorship, collaborative work and live classes next.",
    ink: "teal" as const,
    seal: "navy" as const,
  },
];

const RESOURCE_TILTS = [-0.8, 0.6, -0.4];

export default async function HomePage() {
  await publishDueArticles().catch(() => 0);

  const [settings, categories, program, articles, testimonials, resources, threads] = await Promise.all([
    getSiteSettings().catch(() => ({}) as Record<string, string>),
    getCategoriesWithCounts().catch(() => []),
    getCourseProgram().catch(() => []),
    getFeaturedArticles(4).catch(() => []),
    getTestimonials(5).catch(() => []),
    getResources(3).catch(() => []),
    getThreads(4).catch(() => []),
  ]);

  const [lead, ...secondary] = articles;
  const compassPrinciples = PRINCIPLES.map((principle) => ({
    name: principle.name,
    question: principle.question,
    color: principle.color,
    icon: principle.icon,
    description: principle.description,
    href: `/blog?category=${principle.name.toLowerCase()}`,
    count: categories.find((category) => category.slug === principle.name.toLowerCase())?.articleCount ?? 0,
  }));

  return (
    <>
      <HeroCarousel
        headline={settings.hero_headline ? settings.hero_headline.replace(/\.$/, "") : undefined}
        subhead={settings.hero_subhead}
        cohortName={settings.cohort_name ?? "Cohort 04 · 2026"}
        enrolmentStatus={settings.enrollment_status ?? "Interest list open"}
      />

      {/* Five principles around a brass compass */}
      <section className="mesh-light relative overflow-hidden py-16 lg:py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="Success principles"
            title="Five principles. Five questions that decide a life."
            description="Every session in the Purpose Course returns to one of these questions. They are simple enough to remember at a kitchen table and deep enough to organise a decade."
            action={<SectionLink href="/blog">Read by principle</SectionLink>}
          />
          <div className="mt-14">
            <PrinciplesCompass principles={compassPrinciples} />
          </div>
        </div>
      </section>

      {/* Pathways as clothbound books on a shelf */}
      <section className="section relative overflow-hidden">
        <div className="shell">
          <SectionHeading
            eyebrow="Programme catalogue"
            title="Four pathways. Twelve levels. Fifty-one designed sessions."
            description="Each programme keeps its level sequence together through digital lessons and transformational engagements — an experiential approach to purpose discovery."
            action={
              <div className="flex flex-wrap gap-2 text-[12px] text-stone-600">
                {[
                  { icon: CalendarDays, label: "Progressive pathways" },
                  { icon: Users, label: "Cohort-based" },
                  { icon: GraduationCap, label: "Assessment aligned" },
                ].map((item) => (
                  <span key={item.label} className="at-tile inline-flex items-center gap-2 !rounded-full !px-3.5 !py-1.5">
                    <item.icon aria-hidden className="h-3.5 w-3.5 text-gold-dark" /> {item.label}
                  </span>
                ))}
              </div>
            }
          />

          <div className="mt-14">
            <Bookshelf programmes={program} />
          </div>
          <Reveal className="mt-14 flex justify-center">
            <Link href="/course" className="at-btn" data-variant="navy">
              Explore the full catalogue <ArrowRight aria-hidden />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Live sessions */}
      <section className="border-y border-navy/10 bg-cream/45 py-16 lg:py-20">
        <div className="shell">
          <UpcomingEvents variant="public" />
        </div>
      </section>

      {/* Journal under a newspaper masthead */}
      <section className="section">
        <div className="shell">
          <Reveal>
            <Masthead
              title="The Purpose Journal"
              tagline="Writing for the road between discovery and impact."
              action={<SectionLink href="/blog">All articles</SectionLink>}
            />
          </Reveal>

          {lead ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:divide-x lg:divide-navy/15">
              <Reveal className="lg:pr-6">
                <ArticleCard article={lead} variant="feature" className="h-full" />
              </Reveal>
              <div className="grid gap-5 lg:pl-6">
                {secondary.slice(0, 2).map((article, index) => (
                  <Reveal key={article.id} delay={0.06 * (index + 1)}>
                    <ArticleCard article={article} className="h-full" />
                  </Reveal>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-10 text-center font-serif text-[16px] italic text-stone-600">
              The editorial desk is preparing the first articles. Subscribe below and we will send them to you.
            </p>
          )}
        </div>
      </section>

      {/* Community: stitched leather on the dark desk */}
      <section className="mesh-dark relative isolate overflow-clip py-16 text-paper lg:py-24">
        <Aurora />
        <div className="absolute inset-0 ink-grid opacity-30" aria-hidden />
        <div className="shell relative z-10 grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-28">
            <p className="glass-dark inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              <span aria-hidden className="at-lamp" /> Community · live now
            </p>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-[2.85rem]">
              This is not only a blog. It is a school taking shape.
            </h2>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-paper/75">
              We are building toward live classes, real-time discussion, mentorship appointments, collaborative
              assignments, progress tracking and notifications. The first pieces are already here — join a
              conversation in the Purpose Lounge today.
            </p>
            <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
              {COMMUNITY_FEATURES.map((feature) => (
                <div key={feature.title} className="at-leather flex gap-3.5 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#f3dd98] to-[#b98a1f] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_3px_6px_-2px_rgba(0,0,0,0.6)]">
                    <feature.icon aria-hidden className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-paper">{feature.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-paper/65">{feature.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/community" className="at-btn mt-8" data-variant="brass">
              Enter the community <ArrowRight aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <figure className="at-snapshot mb-8">
              <div className="relative h-44 overflow-hidden">
                <CoverImage src="/images/community.jpg" alt="Purpose Course round-table discussion circle" sizes="(min-width: 1024px) 40vw, 100vw" />
              </div>
              <figcaption className="py-2.5 text-center font-serif text-[14px] italic text-stone-700">The Purpose Lounge · live</figcaption>
            </figure>
            <LiveThreadList
              initialThreads={threads.map((thread) => ({
                id: thread.id,
                title: thread.title,
                authorName: thread.authorName,
                replyCount: thread.replyCount,
                lastActivityAt: thread.lastActivityAt,
                groupName: thread.groupName,
                groupAccent: thread.groupAccent,
                latestPost: thread.latestPost,
              }))}
            />
            {testimonials.length ? (
              <div className="mt-6">
                <TestimonialCarousel testimonials={testimonials} />
              </div>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* Resources on clipboards */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="Resource library"
            title="Take the work home with you."
            description="Worksheets, field guides and planning canvases used inside the course. Free, and yours to use with your team."
            action={<SectionLink href="/resources">All resources</SectionLink>}
          />

          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {resources.map((resource, index) => (
              <Reveal key={resource.id} delay={index * 0.06} className="h-full">
                <article className="at-clipboard" style={{ rotate: `${RESOURCE_TILTS[index % RESOURCE_TILTS.length]}deg` } as CSSProperties}>
                  <span aria-hidden className="at-clip" />
                  <div className="at-clipboard-sheet">
                    <div className="flex items-start justify-between gap-3">
                      <span className="at-stamp" data-ink="navy">
                        {resource.type}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                        {resource.fileFormat} · {resource.fileSize}
                      </span>
                    </div>
                    <h3 className="mt-5 font-serif text-[1.35rem] leading-snug text-navy">{resource.title}</h3>
                    <p className="mt-2 flex-1 text-[14px] leading-relaxed text-stone-600">{resource.description}</p>
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <a href={`/api/resources/${resource.slug}/download`} className="at-btn min-h-11 px-4 text-[13px]">
                        <Download aria-hidden /> Download
                      </a>
                      <span className="text-[12px] text-stone-500">{resource.downloadCount} downloads</span>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap as a parchment route */}
      <section className="mesh-light border-y border-navy/10 py-16 lg:py-24">
        <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.5fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">Where this is going</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-navy sm:text-4xl">
              From digital publishing to a live learning community.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-stone-600">
              The architecture is built for the next two releases: publishing now, an academy with enrolments and
              progress next, then a live interactive school.
            </p>
          </Reveal>
          <RouteMap phases={PHASES} />
        </div>
      </section>

      {/* Newsletter: a letter sliding out of its envelope */}
      <section className="section">
        <div className="shell">
          <div className="mesh-dark relative isolate overflow-hidden rounded-[2rem] px-6 py-12 text-paper shadow-editorial sm:px-12 sm:py-14">
            <Aurora />
            <div className="relative grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
              <Reveal>
                <span className="at-plate">The Purpose Letter</span>
                <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-[2.6rem]">One thoughtful letter. Every Thursday.</h2>
                <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-paper/75">
                  Join readers across East Africa receiving reflections, new articles, cohort dates and the occasional
                  worksheet. No noise, no spin.
                </p>
                <ul className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 text-[12.5px] text-paper/75">
                  {PRINCIPLES.map((principle) => (
                    <li key={principle.name} className="inline-flex items-center gap-2">
                      <Medal principle={principle} size="sm" /> {principle.name}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Envelope>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-[1.5rem] leading-tight text-navy">Dear reader,</p>
                    <p className="mt-1.5 max-w-xs text-[14px] leading-relaxed text-stone-600">
                      Leave your address and the next letter will find you on Thursday.
                    </p>
                  </div>
                  <span aria-hidden className="at-postage shrink-0">
                    <span>
                      <span className="font-serif text-[20px] leading-none text-gold">✦</span>
                      <span>Purpose</span>
                      <span>Post</span>
                    </span>
                  </span>
                </div>
                <div className="mt-5">
                  <NewsletterForm source="homepage" />
                </div>
              </Envelope>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
