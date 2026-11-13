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
import { ProgrammeRail } from "@/components/site/programme-rail";
import { ArticleCard } from "@/components/site/article-card";
import { PrincipleIcon, accentClasses } from "@/components/site/principle-icon";
import { NewsletterForm } from "@/components/site/newsletter-form";
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
  const levelCards = program.map((level) => ({
    id: level.id,
    slug: level.slug,
    name: level.name,
    levelNumber: level.levelNumber,
    tagline: level.tagline,
    description: level.description,
    accent: level.accent,
    icon: level.icon,
    weeks: level.weeks,
    sessions: level.sessions.map((session) => ({ id: session.id, code: session.code, title: session.title })),
  }));

  return (
    <>
      <HeroCarousel
        headline={settings.hero_headline ? settings.hero_headline.replace(/\.$/, "") : undefined}
        subhead={settings.hero_subhead}
        cohortName={settings.cohort_name ?? "Cohort 04 · 2026"}
        enrolmentStatus={settings.enrollment_status ?? "Interest list open"}
      />

      {/* Five purpose principles */}
      <section className="surface-muted !rounded-none border-x-0 py-16 lg:py-20">
        <div className="shell">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">Success principles</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-navy sm:text-[2.85rem]">
                Five principles. Five questions that decide a life.
              </h2>
              <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-stone-600">
                Every session in the Purpose Course returns to one of these questions. They are simple enough to
                remember at a kitchen table and deep enough to organise a decade.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-navy hover:text-gold-dark"
              >
                Read by principle <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Reveal>
          </div>

          <Stagger className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PRINCIPLES.map((principle) => {
              const count = categories.find((category) => category.slug === principle.name.toLowerCase());
              return (
                <StaggerItem key={principle.name}>
                  <Link
                    href={`/blog?category=${principle.name.toLowerCase()}`}
                    className="group interactive flex h-full flex-col rounded-xl border border-navy/10 bg-paper p-5"
                  >
                    <PrincipleIcon icon={principle.icon} accent={principle.accent} />
                    <h3 className="mt-4 font-serif text-xl text-navy">{principle.name}</h3>
                    <p className={cn("mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]", accentClasses(principle.accent).fg)}>
                      {principle.question}
                    </p>
                    <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-stone-600">{principle.description}</p>
                    <p className="mt-4 flex items-center justify-between border-t border-navy/8 pt-3 text-[10.5px] uppercase tracking-[0.12em] text-stone-500">
                      {count?.articleCount ?? 0} articles
                      <ArrowRight className="h-3.5 w-3.5 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-gold-dark" />
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
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">The programme</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-navy sm:text-[2.85rem]">
                Three levels. Fifteen sessions. One clear assignment.
              </h2>
              <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-stone-600">
                Lessons are presented in key presentations, case studies, round tables and facilitative
                transformational engagements — an experiential approach to purpose discovery.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="flex flex-wrap gap-3 text-[12px] text-stone-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy/12 bg-paper px-3 py-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-gold-dark" /> 15 weeks total
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-navy/12 bg-paper px-3 py-1.5">
                <Users className="h-3.5 w-3.5 text-gold-dark" /> Cohort-based
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-navy/12 bg-paper px-3 py-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-gold-dark" /> Coaches included
              </span>
            </Reveal>
          </div>

          <div className="mt-11">
            <ProgrammeRail levels={levelCards} />
          </div>
          <Reveal className="mt-9 flex justify-center">
            <Link href="/course" className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-navy-700">
              See every session in detail <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Journal */}
      <section className="border-y border-navy/10 bg-cream/50 py-16 lg:py-20">
        <div className="shell">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <Reveal className="max-w-xl">
              <p className="eyebrow">The Purpose Journal</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-navy sm:text-[2.6rem]">
                Writing for the road between discovery and impact.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-navy hover:text-gold-dark"
              >
                All articles <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Reveal>
          </div>

          {lead ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <Reveal>
                <ArticleCard article={lead} variant="feature" className="h-full" />
              </Reveal>
              <div className="grid gap-5">
                {secondary.slice(0, 2).map((article, index) => (
                  <Reveal key={article.id} delay={0.08 * (index + 1)}>
                    <ArticleCard article={article} className="h-full" />
                  </Reveal>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-10 rounded-xl border border-navy/10 bg-paper p-6 text-sm text-stone-600">
              The editorial desk is preparing the first articles. Subscribe below and we will send them to you.
            </p>
          )}
        </div>
      </section>

      {/* Community / future platform */}
      <section className="relative overflow-hidden bg-ink py-16 text-paper lg:py-20">
        <div className="absolute inset-0 ink-grid opacity-40" aria-hidden />
        <div className="shell relative grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold">
              <span className="live-pulse h-2 w-2 rounded-full bg-source" /> Community · live now
            </p>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-[2.85rem]">
              This is not only a blog. It is a school taking shape.
            </h2>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-paper/65">
              We are building toward live classes, real-time discussion, mentorship appointments, collaborative
              assignments, progress tracking and notifications. The first pieces are already here — join a
              conversation in the Purpose Lounge today.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Video, title: "Live online classes", body: "Facilitated sessions with breakouts" },
                { icon: MessagesSquare, title: "Real-time discussion", body: "Threads, replies, round-table prompts" },
                { icon: Users, title: "Mentorship & coaching", body: "Clarity sessions with practitioners" },
                { icon: Radio, title: "Live progress & notifications", body: "Dashboards and in-app updates" },
              ].map((feature) => (
                <div key={feature.title} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <feature.icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-gold" />
                  <div>
                    <p className="text-[13px] font-medium text-paper">{feature.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-paper/50">{feature.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/community"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark hover:text-paper"
            >
              Enter the community <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="relative mb-5 overflow-hidden rounded-2xl border border-white/15">
              <img
                src="/images/community.jpg"
                alt="Purpose Course round-table discussion circle"
                className="h-36 w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <p className="absolute bottom-3 left-4 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold">
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
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <Reveal className="max-w-xl">
              <p className="eyebrow">Resource library</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-navy sm:text-[2.6rem]">
                Take the work home with you.
              </h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-stone-600">
                Worksheets, field guides and planning canvases used inside the course. Free, and yours to use with
                your team.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <Link href="/resources" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-navy hover:text-gold-dark">
                All resources <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Reveal>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {resources.map((resource, index) => (
              <Reveal key={resource.id} delay={index * 0.07}>
                <div className="interactive flex h-full flex-col rounded-xl border border-navy/10 bg-paper p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="gold">{resource.type}</Badge>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-stone-400">
                      {resource.fileFormat} · {resource.fileSize}
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl leading-snug text-navy">{resource.title}</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-stone-600">{resource.description}</p>
                  <a
                    href={`/api/resources/${resource.slug}/download`}
                    className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-navy hover:text-gold-dark"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                    <span className="font-normal normal-case tracking-normal text-stone-400">
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
      <section className="border-y border-navy/10 bg-cream/60 py-16">
        <div className="shell grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">Where this is going</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-navy">
              From digital publishing to a live learning community.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              The architecture is built for the next two releases: publishing now, an academy with enrolments and
              progress next, then a live interactive school.
            </p>
          </Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-3">
            {[
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
            ].map((phase) => (
              <StaggerItem key={phase.phase}>
                <div className="flex h-full flex-col rounded-2xl border border-navy/10 bg-paper p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-2xl text-navy/30">{phase.phase}</span>
                    <phase.icon className="h-4.5 w-4.5 text-gold-dark" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-navy">{phase.title}</p>
                  <p className="mt-1 inline-flex w-fit rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                    {phase.status}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600">{phase.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section">
        <div className="shell">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-navy/10 bg-navy px-7 py-12 text-paper shadow-editorial sm:px-12">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/20 blur-3xl" aria-hidden />
              <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                    The Purpose Letter
                  </p>
                  <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                    One thoughtful letter. Every Thursday.
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-paper/65">
                    Join readers across East Africa receiving reflections, new articles, cohort dates and the
                    occasional worksheet. No noise, no spin.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] text-paper/50">
                    <span className="inline-flex items-center gap-1.5">
                      <PrincipleIcon icon="user" accent="navy" size="sm" className="ring-0" /> Identity
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <PrincipleIcon icon="home" accent="green" size="sm" className="ring-0" /> Source
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <PrincipleIcon icon="target" accent="gold" size="sm" className="ring-0" /> Purpose
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <PrincipleIcon icon="star" accent="purple" size="sm" className="ring-0" /> Potential
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <PrincipleIcon icon="compass" accent="teal" size="sm" className="ring-0" /> Destiny
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <NewsletterForm variant="dark" source="homepage" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><UpcomingEvents /></div>
</>
  );
}
