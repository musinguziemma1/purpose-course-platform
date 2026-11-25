import { UpcomingEvents } from "@/components/academy/upcoming-events";
import { EnrollForm } from "@/components/course/enroll-form";
import { TestimonialCarousel } from "@/components/home/testimonial-carousel";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { LevelOutcomes } from "@/components/site/programme-rail";
import { Aurora, PublicHero } from "@/components/site/public-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { CatalogueDrawer, MedallionTray, SplitFlapBoard } from "@/components/atelier/atelier";
import { getCourseProgram, getSiteSettings, getTestimonials } from "@/db/queries";
import { PRINCIPLES, PRINCIPLE_COLORS } from "@/lib/media";
import { publicUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  Clock3,
  GraduationCap,
  MessagesSquare,
  Presentation,
  Puzzle,
  Users,
} from "lucide-react";
import "../atelier.css";

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

const CARD_TILTS = [-0.35, 0.3, -0.2, 0.4];

export default async function CoursePage() {
  const [catalogue, testimonials, settings] = await Promise.all([
    getCourseProgram(),
    getTestimonials(5),
    getSiteSettings().catch(() => ({}) as Record<string, string>),
  ]);
  const levels = catalogue.flatMap((programme) => programme.levels);
  const sessionCount = levels.reduce((total, level) => total + level.sessions.length, 0);
  const cohortName = settings.cohort_name ?? "Cohort 04 · 2026";

  return (
    <>
      <PublicHero
        image="/images/hero-workshop.jpg"
        eyebrow="Programme catalogue"
        title={
          <>
            Four pathways for <span className="text-sheen">purposeful</span> learning and practice.
          </>
        }
        description="Choose the pathway that matches your context, then progress through its Foundation, Intermediate and Advanced levels. Every academic module is supported by a structured facilitated session, digital lessons, applied work and aligned assessment."
        actions={
          <>
            <Link href="#catalogue" className="at-btn" data-variant="brass">
              Explore the catalogue <ArrowRight aria-hidden />
            </Link>
            <Link href="#enrol" className="at-btn" data-variant="smoke">
              Join the next cohort
            </Link>
          </>
        }
        aside={
          <CatalogueDrawer
            programmes={catalogue}
            totals={{ programmes: catalogue.length, levels: levels.length, sessions: sessionCount }}
            details={[
              ["Session length", "90 minutes"],
              ["Delivery", "Online cohorts + round tables"],
              ["Next cohort", cohortName],
            ]}
          />
        }
      >
        <ul className="flex flex-wrap gap-2" aria-label="Session formats">
          {FORMATS.map((format) => (
            <li key={format.label} className="at-stitch-tag gap-2 !py-2">
              <format.icon aria-hidden className="h-4 w-4 text-gold" /> {format.label}
            </li>
          ))}
        </ul>
      </PublicHero>

      {/* Five principles as enamel medallions in a velvet tray */}
      <section className="mesh-light py-16 lg:py-20">
        <div className="shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center">Five principles</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-navy sm:text-[2.4rem]">Every module returns to five questions.</h2>
          </Reveal>
          <div className="mx-auto mt-10 max-w-5xl">
            <MedallionTray principles={PRINCIPLES} />
          </div>
        </div>
      </section>

      {/* Catalogue: each programme a clothbound binder with tabbed level dividers */}
      <section id="catalogue" className="scroll-mt-20 border-t border-navy/10 py-16 lg:py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="Published pathways"
            title="Choose a programme, then follow its levels."
            description="The catalogue keeps each programme’s learning sequence intact. Open a level to review its academic outcomes and the complete facilitated-session design."
          />

          <div className="mt-12 space-y-14">
            {catalogue.map((programme, programmeIndex) => {
              const number = String(programmeIndex + 1).padStart(2, "0");
              const programmeSessions = programme.levels.reduce((total, level) => total + level.sessions.length, 0);
              return (
                <Reveal key={programme.id}>
                  <article id={programme.slug} aria-labelledby={`${programme.slug}-title`} className="at-paper scroll-mt-24">
                    <header className="at-binder-cover rounded-t-[1.1rem] px-6 pb-10 pt-8 sm:px-10" data-cloth={programmeIndex % 5}>
                      <div className="relative z-[1] grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div>
                          <p className="at-foil-dark text-[11px] font-bold uppercase tracking-[0.24em]">Programme {number}</p>
                          <h3 id={`${programme.slug}-title`} className="at-foil-dark mt-2 font-serif text-[2rem] leading-tight sm:text-[2.4rem]">
                            {programme.name}
                          </h3>
                          <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-[#f8efd5]/85">{programme.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:max-w-72 lg:justify-end">
                          <span className="at-stitch-tag">{programme.duration}</span>
                          <span className="at-stitch-tag">{programme.levels.length} levels</span>
                          <span className="at-stitch-tag">{programmeSessions} sessions</span>
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ecd9a0]/85 lg:col-span-2">{programme.structure}</p>
                      </div>
                      <div aria-hidden className="at-rings">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    </header>

                    <div className="space-y-5 px-4 pb-7 pt-10 sm:px-8">
                      {programme.levels.map((level, levelIndex) => {
                        const color = PRINCIPLE_COLORS[level.accent ?? "navy"] ?? PRINCIPLE_COLORS.navy;
                        return (
                          <details key={level.id} open={levelIndex === 0} className="at-divider" style={{ "--c": color } as CSSProperties}>
                            <summary className="flex cursor-pointer flex-wrap items-center gap-4 py-4 pl-10 pr-5">
                              <span aria-hidden className="at-divider-tab">
                                {level.levelNumber}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Level {levelIndex + 1}</span>
                                <span className="block font-serif text-[1.35rem] leading-tight text-navy">{level.name}</span>
                                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color }}>
                                  {level.tagline}
                                </span>
                              </span>
                              <span className="text-right text-[12.5px] leading-snug text-stone-600">
                                {level.weeks} weeks
                                <br />
                                {level.sessions.length} sessions
                              </span>
                              <ChevronDown aria-hidden className="at-chevron h-5 w-5 text-stone-400" />
                            </summary>

                            <div className="at-divider-body border-t border-navy/10 px-5 pb-7 pt-6 sm:px-7">
                              <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                                <div>
                                  <p className="text-[14.5px] leading-relaxed text-stone-700">{level.introduction || level.description}</p>
                                  <LevelOutcomes outcomes={level.academicOutcomes.length ? level.academicOutcomes : level.outcomes} accent={level.accent} />
                                </div>
                                <ol className="space-y-5">
                                  {level.sessions.map((session, sessionIndex) => (
                                    <li
                                      key={session.id}
                                      className="at-index"
                                      style={{ "--tilt": `${CARD_TILTS[sessionIndex % CARD_TILTS.length]}deg` } as CSSProperties}
                                    >
                                      <div className="at-index-head flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3">
                                        <p className="at-typecode text-[13px]" style={{ color }}>
                                          {session.code}
                                        </p>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                                          <Clock3 aria-hidden className="h-3 w-3" /> {session.durationMinutes} min · {session.format}
                                        </span>
                                      </div>
                                      <div className="px-4 pb-4 pt-2">
                                        <h4 className="font-serif text-lg leading-snug text-navy">{session.title}</h4>
                                        <p className="at-ruled mt-1 text-[13.5px] text-stone-700">{session.summary}</p>
                                        {session.focusQuestions.length ? (
                                          <details className="at-foldout mt-3 px-3 py-2">
                                            <summary className="flex min-h-8 cursor-pointer items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5b4a14]">
                                              Session inquiry questions
                                              <ChevronDown aria-hidden className="h-3.5 w-3.5" />
                                            </summary>
                                            <ul className="mt-2 space-y-1.5 border-t border-[#5b4a14]/15 pt-2">
                                              {session.focusQuestions.map((question) => (
                                                <li key={question} className="text-[13px] leading-relaxed text-[#3f3a2c]">
                                                  {question}
                                                </li>
                                              ))}
                                            </ul>
                                          </details>
                                        ) : null}
                                      </div>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* Academic delivery: split-flap board */}
      <section className="mesh-dark relative isolate overflow-hidden py-16 text-paper lg:py-24">
        <Aurora />
        <div className="shell relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow !text-gold">Academic delivery</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">A coherent path from teaching to evidence of learning.</h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-paper/75">
              Each pathway connects facilitated inquiry with digital lessons, assignments, quizzes, level examinations
              and certificate requirements.
            </p>
            <div className="mt-8 max-w-md">
              <SplitFlapBoard
                items={[
                  [String(catalogue.length), "Published programmes"],
                  [String(levels.length), "Progressive levels"],
                  [String(sessionCount), "Facilitated sessions"],
                  ["5", "Principles per module"],
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <TestimonialCarousel testimonials={testimonials} />
          </Reveal>
        </div>
      </section>

      {/* Enrolment: an admission ticket */}
      <section id="enrol" className="mesh-light scroll-mt-24 py-20 lg:py-24">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
          <Reveal>
            <p className="eyebrow">Enrolment</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-navy">
              {settings.enrollment_status ?? "Interest list open"} for {cohortName}.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-stone-600">
              Select the programme level that matches your context. The admissions team will share the timetable,
              fees, orientation requirements and programme-specific pre-work.
            </p>
            <Stagger className="mt-9 space-y-5">
              {[
                { icon: CalendarDays, title: "A structured learning rhythm", body: "Facilitated sessions, digital study and applied work follow one aligned sequence." },
                { icon: GraduationCap, title: "Progressive assessment", body: "Module quizzes, assignments and examinations provide evidence of achievement." },
                { icon: Users, title: "Learning in community", body: "Dialogue, peer consultation and accountable action are built into the experience." },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="flex gap-4">
                    <span className="at-medal" data-size="sm" style={{ "--c": "#122a4d" } as CSSProperties}>
                      <item.icon aria-hidden className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-navy">{item.title}</p>
                      <p className="mt-0.5 text-[14px] leading-relaxed text-stone-600">{item.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="at-ticket">
              <div className="at-ticket-stub">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gold">Admit one</p>
                    <p className="mt-1.5 font-serif text-[1.8rem] leading-tight">Reserve your place</p>
                    <p className="mt-1 text-[14px] text-paper/75">Interest list only — no payment required today.</p>
                  </div>
                  <span className="at-plate">{settings.cohort_name ?? "Next cohort"}</span>
                </div>
              </div>
              <div aria-hidden className="at-ticket-perf" />
              <div className="px-6 pb-8 pt-8 sm:px-8">
                <EnrollForm
                  levels={catalogue.flatMap((programme) => programme.levels.map((level) => ({ slug: level.slug, name: `${programme.name} — ${level.name}` })))}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-navy/10 py-16 lg:py-20">
        <div className="shell">
          <UpcomingEvents variant="public" />
        </div>
      </section>
    </>
  );
}
