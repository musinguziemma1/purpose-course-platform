import { UpcomingEvents } from "@/components/academy/upcoming-events";
import { EnrollForm } from "@/components/course/enroll-form";
import { TestimonialCarousel } from "@/components/home/testimonial-carousel";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { LevelOutcomes } from "@/components/site/programme-rail";
import { PrincipleIcon, accentClasses } from "@/components/site/principle-icon";
import { Badge } from "@/components/ui/badge";
import { getCourseProgram, getSiteSettings, getTestimonials } from "@/db/queries";
import { PRINCIPLES } from "@/lib/media";
import { publicUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Clock3,
  GraduationCap,
  MessagesSquare,
  Presentation,
  Puzzle,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Programme catalogue",
  description:
    "Explore four Purpose Course pathways with 12 progressive levels and 51 professionally designed facilitated sessions.",
  alternates: { canonical: publicUrl("/course") },
};

const FORMATS = [
  { icon: Presentation, label: "Concept seminars" },
  { icon: BookOpenCheck, label: "Case analysis" },
  { icon: MessagesSquare, label: "Facilitated dialogue" },
  { icon: Puzzle, label: "Applied workshops" },
  { icon: Users, label: "Peer consultation" },
];

export default async function CoursePage() {
  const [catalogue, testimonials, settings] = await Promise.all([
    getCourseProgram(),
    getTestimonials(5),
    getSiteSettings().catch(() => ({}) as Record<string, string>),
  ]);
  const levels = catalogue.flatMap((programme) => programme.levels);
  const sessionCount = levels.reduce((total, level) => total + level.sessions.length, 0);

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy/10 bg-cream/60">
        <HeroBackdrop src="/images/hero-workshop.jpg" />
        <div className="shell relative grid gap-10 py-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:py-20">
          <div>
            <p className="eyebrow">Programme catalogue</p>
            <h1 className="display mt-4 text-4xl text-navy sm:text-5xl lg:text-[3.7rem]">
              Four pathways for purposeful learning and practice.
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-stone-600">
              Choose the pathway that matches your context, then progress through its Foundation, Intermediate and
              Advanced levels. Every academic module is supported by a structured facilitated session, digital
              lessons, applied work and aligned assessment.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#catalogue" className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark hover:text-paper">
                Explore the catalogue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#enrol" className="inline-flex items-center gap-2 rounded-full border border-navy/20 px-6 py-3 text-sm font-semibold text-navy hover:bg-navy/5">
                Join the next cohort
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-paper p-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">Catalogue at a glance</p>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                ["Programmes", String(catalogue.length)],
                ["Progressive levels", String(levels.length)],
                ["Facilitated sessions", String(sessionCount)],
                ["Session length", "90 minutes"],
                ["Delivery", "Online cohorts + live round tables"],
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

      <section className="py-14">
        <div className="shell grid gap-3 sm:grid-cols-5">
          {PRINCIPLES.map((principle) => (
            <div key={principle.name} className="rounded-xl border border-navy/10 bg-paper p-4 text-center">
              <PrincipleIcon icon={principle.icon} accent={principle.accent} className="mx-auto" />
              <p className="mt-2.5 text-[13px] font-semibold text-navy">{principle.name}</p>
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-500">{principle.question}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="catalogue" className="scroll-mt-20 border-t border-navy/10 py-16">
        <div className="shell">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">Published pathways</p>
            <h2 className="mt-4 font-serif text-4xl text-navy">Choose a programme, then follow its levels.</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-stone-600">
              The catalogue keeps each programme’s learning sequence intact. Open a level to review its academic
              outcomes and the complete facilitated-session design.
            </p>
          </Reveal>

          <div className="mt-10 space-y-10">
            {catalogue.map((programme, programmeIndex) => (
              <Reveal key={programme.id}>
                <article id={programme.slug} className="scroll-mt-24 overflow-hidden rounded-3xl border border-navy/10 bg-paper shadow-xs">
                  <header className="grid gap-5 border-b border-navy/10 bg-cream/55 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
                        Programme {String(programmeIndex + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 font-serif text-3xl text-navy">{programme.name}</h3>
                      <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-stone-600">{programme.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:max-w-64 lg:justify-end">
                      <Badge variant="outline">{programme.duration}</Badge>
                      <Badge variant="outline">{programme.levels.length} levels</Badge>
                      <Badge variant="outline">{programme.levels.reduce((total, level) => total + level.sessions.length, 0)} sessions</Badge>
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 lg:col-span-2">{programme.structure}</p>
                  </header>

                  <div className="space-y-4 p-4 sm:p-6">
                    {programme.levels.map((level, levelIndex) => {
                      const accent = accentClasses(level.accent);
                      return (
                        <details key={level.id} open={levelIndex === 0} className="group overflow-hidden rounded-2xl border border-navy/10">
                          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 bg-paper px-5 py-4 hover:bg-cream/30">
                            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-lg text-paper", accent.bg)}>
                              {level.levelNumber}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Level {levelIndex + 1}</span>
                              <span className="block font-serif text-xl text-navy">{level.name}</span>
                              <span className={cn("block text-[10.5px] font-semibold uppercase tracking-[0.12em]", accent.fg)}>{level.tagline}</span>
                            </span>
                            <span className="text-right text-[11px] text-stone-500">
                              {level.weeks} weeks<br />{level.sessions.length} sessions
                            </span>
                          </summary>

                          <div className="border-t border-navy/10 bg-cream/20 p-5 sm:p-6">
                            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                              <div>
                                <p className="text-[13px] leading-relaxed text-stone-700">{level.introduction || level.description}</p>
                                <LevelOutcomes outcomes={level.academicOutcomes.length ? level.academicOutcomes : level.outcomes} accent={level.accent} />
                              </div>
                              <ol className="space-y-3">
                                {level.sessions.map((session) => (
                                  <li key={session.id} className="rounded-xl border border-navy/10 bg-paper p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className={cn("text-[10.5px] font-semibold uppercase tracking-[0.12em]", accent.fg)}>{session.code}</p>
                                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-stone-400">
                                        <Clock3 className="h-3 w-3" /> {session.durationMinutes} min · {session.format}
                                      </span>
                                    </div>
                                    <h4 className="mt-1 font-serif text-lg text-navy">{session.title}</h4>
                                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-stone-600">{session.summary}</p>
                                    <details className="mt-3 rounded-lg bg-cream/60 px-3 py-2">
                                      <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-[0.1em] text-navy">Session inquiry questions</summary>
                                      <ul className="mt-2 space-y-1.5 border-t border-navy/8 pt-2">
                                        {session.focusQuestions.map((question) => (
                                          <li key={question} className="text-[11.5px] leading-relaxed text-stone-600">{question}</li>
                                        ))}
                                      </ul>
                                    </details>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-paper">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow !text-gold">Academic delivery</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">A coherent path from teaching to evidence of learning.</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-paper/60">
              Each pathway connects facilitated inquiry with digital lessons, assignments, quizzes, level examinations
              and certificate requirements.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                [String(catalogue.length), "Published programmes"],
                [String(levels.length), "Progressive levels"],
                [String(sessionCount), "Facilitated sessions"],
                ["5", "Aligned principles per module"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="font-serif text-2xl text-gold">{value}</p>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-paper/50">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}><TestimonialCarousel testimonials={testimonials} /></Reveal>
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
              Select the programme level that matches your context. The admissions team will share the timetable,
              fees, orientation requirements and programme-specific pre-work.
            </p>
            <Stagger className="mt-8 space-y-4">
              {[
                { icon: CalendarDays, title: "A structured learning rhythm", body: "Facilitated sessions, digital study and applied work follow one aligned sequence." },
                { icon: GraduationCap, title: "Progressive assessment", body: "Module quizzes, assignments and examinations provide evidence of achievement." },
                { icon: Users, title: "Learning in community", body: "Dialogue, peer consultation and accountable action are built into the experience." },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="flex gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-gold-dark"><item.icon className="h-4.5 w-4.5" /></span>
                    <div><p className="text-sm font-semibold text-navy">{item.title}</p><p className="mt-0.5 text-[13px] leading-relaxed text-stone-600">{item.body}</p></div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-navy/10 bg-paper p-6 shadow-lift sm:p-8">
              <div className="flex items-center justify-between"><p className="font-serif text-2xl text-navy">Reserve your place</p><Badge variant="gold">{settings.cohort_name ?? "Next cohort"}</Badge></div>
              <p className="mt-1.5 text-[13px] text-stone-600">Interest list only — no payment required today.</p>
              <div className="mt-5">
                <EnrollForm levels={catalogue.flatMap((programme) => programme.levels.map((level) => ({ slug: level.slug, name: `${programme.name} — ${level.name}` })))} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><UpcomingEvents /></div>
    </>
  );
}
