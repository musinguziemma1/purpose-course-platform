import { publicUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, MessagesSquare, Presentation, Puzzle, Users } from "lucide-react";
import { EnrollForm } from "@/components/course/enroll-form";
import { LevelOutcomes } from "@/components/site/programme-rail";
import { PrincipleIcon, accentClasses } from "@/components/site/principle-icon";
import { TestimonialCarousel } from "@/components/home/testimonial-carousel";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { PRINCIPLES } from "@/lib/media";
import { cn } from "@/lib/utils";
import { getCourseProgram, getSiteSettings, getTestimonials } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The 15-session programme",
  description:
    "Foundation, Intermediate and Advanced levels — 15 sessions over 15 weeks exploring identity, source, purpose, potential and destiny.",
  alternates: { canonical: publicUrl("/course") },
};

const FORMATS = [
  { icon: Presentation, label: "Key presentations" },
  { icon: BookOpenCheck, label: "Case studies" },
  { icon: MessagesSquare, label: "Round tables" },
  { icon: Users, label: "Transformational engagements" },
  { icon: Puzzle, label: "Collaborative exercises" },
];

export default async function CoursePage() {
  const [program, testimonials, settings] = await Promise.all([
    getCourseProgram(),
    getTestimonials(5),
    getSiteSettings().catch(() => ({}) as Record<string, string>),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy/10 bg-cream/60">
        <div className="absolute inset-0 paper-texture opacity-50" aria-hidden />
        <div className="shell relative grid gap-10 py-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:py-20">
          <div>
            <p className="eyebrow">The programme</p>
            <h1 className="display mt-4 text-4xl text-navy sm:text-5xl lg:text-[3.7rem]">
              Discover your purpose. Clarify it. Live it with impact.
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-stone-600">
              Three levels over fifteen weeks. Lessons are presented in key presentations, case studies, round tables
              and facilitative transformational engagements. Every session provides insights on the success principles
              based on the five key questions.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#enrol" className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink shadow-[0_12px_28px_-16px_rgba(201,162,39,0.9)] transition-all hover:bg-gold-dark hover:text-paper">
                Join the next cohort <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#foundation" className="inline-flex items-center gap-2 rounded-full border border-navy/20 px-6 py-3 text-sm font-semibold text-navy hover:bg-navy/5">
                Browse the 15 sessions
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-paper p-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">At a glance</p>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                ["Levels", "3 (Foundation, Intermediate, Advanced)"],
                ["Sessions", "15 × 90-minute sessions"],
                ["Duration", `${settings.total_weeks ?? "15"} weeks`],
                ["Format", "Online cohorts + round tables"],
                ["Coaching", "Clarity sessions included"],
                ["Next cohort", settings.cohort_name ?? "Cohort 04 · 2026"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-b border-navy/8 pb-2.5 last:border-0 last:pb-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</dt>
                  <dd className="text-right text-[13px] text-navy">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-b border-navy/10 bg-navy py-4 text-paper">
        <div className="shell flex flex-wrap items-center justify-center gap-x-7 gap-y-2 sm:justify-between">
          {FORMATS.map((format) => (
            <span key={format.label} className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/75">
              <format.icon className="h-4 w-4 text-gold" /> {format.label}
            </span>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="shell">
          <div className="grid gap-3 sm:grid-cols-5">
            {PRINCIPLES.map((principle) => (
              <div key={principle.name} className="rounded-xl border border-navy/10 bg-paper p-4 text-center">
                <PrincipleIcon icon={principle.icon} accent={principle.accent} className="mx-auto" />
                <p className="mt-2.5 text-[13px] font-semibold text-navy">{principle.name}</p>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-500">{principle.question}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {program.map((level) => {
        const accent = accentClasses(level.accent);
        return (
          <section key={level.id} id={level.slug} className="scroll-mt-24 border-t border-navy/10 py-16 odd:bg-cream/40">
            <div className="shell">
              <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                <Reveal>
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-14 w-14 items-center justify-center rounded-full font-serif text-2xl text-paper", accent.bg)}>
                      {level.levelNumber}
                    </span>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stone-500">Level {level.levelNumber}</p>
                      <h2 className="font-serif text-3xl text-navy">{level.name}</h2>
                    </div>
                  </div>
                  <p className={cn("mt-3 text-[11px] font-semibold uppercase tracking-[0.14em]", accent.fg)}>{level.tagline}</p>
                  <p className="mt-4 text-[14px] leading-relaxed text-stone-700">{level.description}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <Badge variant="outline">{level.weeks} weeks</Badge>
                    <Badge variant="outline">{level.sessions.length} sessions</Badge>
                  </div>
                  <LevelOutcomes outcomes={level.outcomes} accent={level.accent} />
                  {level.imageUrl ? (
                    <img
                      src={level.imageUrl}
                      alt={`${level.name} level`}
                      className="mt-6 hidden h-44 w-full rounded-xl border border-navy/10 object-cover lg:block"
                    />
                  ) : null}
                </Reveal>

                <Reveal delay={0.1}>
                  <div className="overflow-hidden rounded-2xl border border-navy/10 bg-paper">
                    <div className="flex items-center justify-between border-b border-navy/10 bg-cream/60 px-5 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy">Sessions</p>
                      <span className="text-[11px] text-stone-500">90 minutes each</span>
                    </div>
                    <ul className="divide-y divide-navy/8">
                      {level.sessions.map((session) => (
                        <li key={session.id} className="px-5 py-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", accent.fg)}>{session.code}</p>
                            <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400">{session.format}</p>
                          </div>
                          <h3 className="mt-1 font-serif text-lg leading-snug text-navy">{session.title}</h3>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{session.summary}</p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {session.focusQuestions.map((question) => (
                              <span key={question} className="rounded-full bg-cream px-2.5 py-1 text-[10.5px] text-stone-600">
                                {question}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>
        );
      })}

      <section className="bg-ink py-16 text-paper">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow !text-gold">What participants say</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              The room changes people before the content does.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-paper/60">
              Stories from Foundation, Intermediate and Advanced participants across Uganda and the diaspora.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                ["3", "Levels of formation"],
                ["15", "Facilitated sessions"],
                ["600+", "Participants walked with"],
                ["5", "Purpose principles"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="font-serif text-2xl text-gold">{value}</p>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-paper/50">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <TestimonialCarousel testimonials={testimonials} />
          </Reveal>
        </div>
      </section>

      <section id="enrol" className="scroll-mt-24 py-20">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <Reveal>
            <p className="eyebrow">Enrolment</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-navy">
              {settings.enrollment_status ?? "Interest list open"} for {settings.cohort_name ?? "Cohort 04 · 2026"}.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-stone-600">
              We keep cohorts small so that round tables stay honest and every participant has a coach. Reserve your
              place on the interest list and we will send the calendar, fees and the pre-work for PURP 101.
            </p>
            <Stagger className="mt-8 space-y-4">
              {[
                {
                  icon: CalendarDays,
                  title: "Fifteen weeks, one rhythm",
                  body: "One live session per week, plus a short reflective practice and a peer conversation.",
                },
                {
                  icon: Users,
                  title: "Coaching built in",
                  body: "Intermediate participants are assigned a coach for the clarity sessions in PURP 204.",
                },
                {
                  icon: MessagesSquare,
                  title: "A community, not a course library",
                  body: "You keep access to the Purpose Lounge and your cohort group after the final session.",
                },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="flex gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-gold-dark">
                      <item.icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">{item.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-stone-600">{item.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-navy/10 bg-paper p-6 shadow-lift sm:p-8">
              <div className="flex items-center justify-between">
                <p className="font-serif text-2xl text-navy">Reserve your place</p>
                <Badge variant="gold">{settings.cohort_name ?? "Cohort 04"}</Badge>
              </div>
              <p className="mt-1.5 text-[13px] text-stone-600">
                Interest list only — no payment required today.
              </p>
              <div className="mt-5">
                <EnrollForm levels={program.map((level) => ({ slug: level.slug, name: level.name }))} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
