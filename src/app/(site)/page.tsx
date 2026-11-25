import { UpcomingEvents } from "@/components/academy/upcoming-events";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Download,
  GraduationCap,
  MessagesSquare,
  Radio,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { TestimonialCarousel } from "@/components/home/testimonial-carousel";
import { LiveThreadList } from "@/components/community/live-thread-list";
import { ArticleCard } from "@/components/site/article-card";
import { CoverImage } from "@/components/site/cover-image";
import { PrincipleIcon, accentClasses } from "@/components/site/principle-icon";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Aurora } from "@/components/site/public-hero";
import { SectionHeading, SectionLink } from "@/components/site/section-heading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { PRINCIPLES } from "@/lib/media";
import { cn } from "@/lib/utils";
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
    icon: BookOpen,
  },
  {
    phase: "02",
    title: "Purpose Course Academy",
    status: "Data ready",
    body: "Enrolments, lesson progress, quizzes and certificates are modelled.",
    icon: GraduationCap,
  },
  {
    phase: "03",
    title: "Purpose Learning Community",
    status: "In progress",
    body: "Live discussions today; mentorship, collaborative work and live classes next.",
    icon: Sparkles,
  },
];

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
  return (
    <>
      <HeroCarousel
        headline={settings.hero_headline ? settings.hero_headline.replace(/\.$/, "") : undefined}
        subhead={settings.hero_subhead}
        cohortName={settings.cohort_name ?? "Cohort 04 · 2026"}
        enrolmentStatus={settings.enrollment_status ?? "Interest list open"}
      />

      {/* Five purpose principles */}
      <section className="mesh-light relative overflow-hidden py-16 lg:py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="Success principles"
            title="Five principles. Five questions that decide a life."
            description="Every session in the Purpose Course returns to one of these questions. They are simple enough to remember at a kitchen table and deep enough to organise a decade."
            action={<SectionLink href="/blog">Read by principle</SectionLink>}
          />

          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PRINCIPLES.map((principle) => {
              const count = categories.find((category) => category.slug === principle.name.toLowerCase());
              const accent = accentClasses(principle.accent);
              return (
                <StaggerItem key={principle.name} className="h-full">
                  <Link
                    href={`/blog?category=${principle.name.toLowerCase()}`}
                    className="group interactive glass relative flex h-full flex-col overflow-hidden rounded-2xl p-5"
                  >
                    <span aria-hidden className={cn("absolute inset-x-5 top-0 h-[3px] rounded-b-full", accent.bg)} />
                    <PrincipleIcon icon={principle.icon} accent={principle.accent} />
                    <h3 className="mt-4 font-serif text-xl text-navy">{principle.name}</h3>
                    <p className={cn("mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]", accent.fg)}>
                      {principle.question}
                    </p>
                    <p className="mt-3 flex-1 text-[13px] leading-relaxed text-stone-600">{principle.description}</p>
                    <p className="mt-4 flex items-center justify-between border-t border-navy/10 pt-3 text-[11px] uppercase tracking-[0.12em] text-stone-500">
                      {count?.articleCount ?? 0} articles
                      <ArrowRight className="h-3.5 w-3.5 text-stone-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-gold-dark" />
                    </p>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Programme */}
      <section className="section">
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
                  <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-navy/12 bg-paper px-3 py-1.5">
                    <item.icon className="h-3.5 w-3.5 text-gold-dark" /> {item.label}
                  </span>
                ))}
              </div>
            }
          />

          <Stagger className="mt-12 grid gap-5 lg:grid-cols-2">
            {program.map((programme, programmeIndex) => {
              const number = String(programmeIndex + 1).padStart(2, "0");
              return (
                <StaggerItem key={programme.id} className="h-full">
                  <Link
                    href={`/course#${programme.slug}`}
                    className="group interactive relative flex h-full flex-col overflow-hidden rounded-3xl border border-navy/10 bg-paper p-6 shadow-card sm:p-7"
                  >
                    <span aria-hidden className="pointer-events-none absolute -right-2 -top-7 select-none font-serif text-[8.5rem] leading-none text-navy/[0.05]">
                      {number}
                    </span>
                    <div className="relative flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">Pathway {number}</p>
                        <h3 className="mt-1 font-serif text-2xl text-navy">{programme.name}</h3>
                      </div>
                      <Badge variant="outline">{programme.duration}</Badge>
                    </div>
                    <p className="relative mt-3 flex-1 text-[14px] leading-relaxed text-stone-600">{programme.description}</p>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{programme.structure}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {programme.levels.map((level) => (
                        <span key={level.id} className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-stone-600">
                          {level.name} · {level.sessions.length} sessions
                        </span>
                      ))}
                    </div>
                    <span className="mt-5 inline-flex items-center gap-2 border-t border-navy/10 pt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-navy">
                      Review this pathway <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                    <span aria-hidden className="grow-rule absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-gold via-gold-dark to-transparent" />
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
          <Reveal className="mt-10 flex justify-center">
            <Link href="/course" className="inline-flex h-12 items-center gap-2 rounded-full bg-navy px-6 text-sm font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-navy-700 active:scale-[0.97]">
              Explore the full catalogue <ArrowRight className="h-4 w-4" />
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

      {/* Journal */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="The Purpose Journal"
            title="Writing for the road between discovery and impact."
            action={<SectionLink href="/blog">All articles</SectionLink>}
          />

          {lead ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <Reveal>
                <ArticleCard article={lead} variant="feature" className="h-full" />
              </Reveal>
              <div className="grid gap-5">
                {secondary.slice(0, 2).map((article, index) => (
                  <Reveal key={article.id} delay={0.06 * (index + 1)}>
                    <ArticleCard article={article} className="h-full" />
                  </Reveal>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-10 rounded-2xl border border-navy/10 bg-cream/50 p-6 text-sm text-stone-600">
              The editorial desk is preparing the first articles. Subscribe below and we will send them to you.
            </p>
          )}
        </div>
      </section>

      {/* Community */}
      <section className="mesh-dark relative isolate overflow-clip py-16 text-paper lg:py-24">
        <Aurora />
        <div className="absolute inset-0 ink-grid opacity-30" aria-hidden />
        <div className="shell relative z-10 grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-28">
            <p className="glass-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              <span className="live-pulse h-2 w-2 rounded-full bg-source" /> Community · live now
            </p>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-[2.85rem]">
              This is not only a blog. It is a school taking shape.
            </h2>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-paper/70">
              We are building toward live classes, real-time discussion, mentorship appointments, collaborative
              assignments, progress tracking and notifications. The first pieces are already here — join a
              conversation in the Purpose Lounge today.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {COMMUNITY_FEATURES.map((feature) => (
                <div key={feature.title} className="glass-dark flex gap-3 rounded-2xl p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <feature.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-paper">{feature.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-paper/60">{feature.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/community"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-ink transition-[background-color,color,transform] duration-150 hover:bg-gold-soft active:scale-[0.97]"
            >
              Enter the community <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative mb-5 h-40 overflow-hidden rounded-2xl ring-1 ring-white/15">
              <CoverImage
                src="/images/community.jpg"
                alt="Purpose Course round-table discussion circle"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <p className="absolute bottom-3 left-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                The Purpose Lounge · live
              </p>
            </div>
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

      {/* Resources */}
      <section className="section">
        <div className="shell">
          <SectionHeading
            eyebrow="Resource library"
            title="Take the work home with you."
            description="Worksheets, field guides and planning canvases used inside the course. Free, and yours to use with your team."
            action={<SectionLink href="/resources">All resources</SectionLink>}
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {resources.map((resource, index) => (
              <Reveal key={resource.id} delay={index * 0.06}>
                <div className="interactive flex h-full flex-col rounded-2xl border border-navy/10 bg-paper p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <Badge variant="gold">{resource.type}</Badge>
                    <span className="text-[11px] uppercase tracking-[0.12em] text-stone-500">
                      {resource.fileFormat} · {resource.fileSize}
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl leading-snug text-navy">{resource.title}</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-stone-600">{resource.description}</p>
                  <a
                    href={`/api/resources/${resource.slug}/download`}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 self-start text-[12px] font-semibold uppercase tracking-[0.12em] text-navy hover:text-gold-dark"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                    <span className="font-normal normal-case tracking-normal text-stone-500">
                      ({resource.downloadCount})
                    </span>
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="mesh-light border-y border-navy/10 py-16 lg:py-20">
        <div className="shell grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
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
          <div className="relative">
            <div aria-hidden className="absolute inset-x-6 top-10 hidden h-px bg-gradient-to-r from-gold/0 via-gold/60 to-gold/0 sm:block" />
            <Stagger className="relative grid gap-4 sm:grid-cols-3">
              {PHASES.map((phase) => (
                <StaggerItem key={phase.phase} className="h-full">
                  <div className="glass flex h-full flex-col rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-serif text-base text-gold ring-4 ring-paper/70">
                        {phase.phase}
                      </span>
                      <phase.icon className="h-4.5 w-4.5 text-gold-dark" />
                    </div>
                    <p className="mt-4 text-[15px] font-semibold text-navy">{phase.title}</p>
                    <p className="mt-1.5 inline-flex w-fit rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                      {phase.status}
                    </p>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-stone-600">{phase.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section">
        <div className="shell">
          <Reveal>
            <div className="mesh-dark relative isolate overflow-hidden rounded-[2rem] px-7 py-12 text-paper shadow-editorial sm:px-12 sm:py-14">
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" aria-hidden />
              <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[#155e63]/30 blur-3xl" aria-hidden />
              <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                <div>
                  <p className="glass-dark inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                    The Purpose Letter
                  </p>
                  <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                    One thoughtful letter. Every Thursday.
                  </h2>
                  <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-paper/70">
                    Join readers across East Africa receiving reflections, new articles, cohort dates and the
                    occasional worksheet. No noise, no spin.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-[12px] text-paper/60">
                    {PRINCIPLES.map((principle) => (
                      <span key={principle.name} className="inline-flex items-center gap-1.5">
                        <PrincipleIcon icon={principle.icon} accent={principle.accent} size="sm" className="ring-0" /> {principle.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="glass-dark rounded-2xl p-5 sm:p-6">
                  <NewsletterForm variant="dark" source="homepage" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
