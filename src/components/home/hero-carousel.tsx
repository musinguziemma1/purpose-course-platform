"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Compass,
  Pause,
  Play,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PRINCIPLES } from "@/lib/media";
import { PrincipleIcon } from "@/components/site/principle-icon";
import { cn } from "@/lib/utils";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { CoverImage } from "@/components/site/cover-image";
import { Aurora, rise } from "@/components/site/public-hero";

const AUTOPLAY_MS = 7000;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export type HeroSlide = {
  eyebrow: string;
  headline: string;
  highlight: string;
  subhead: string;
  image: string;
  imageAlt: string;
  bullets: string[];
  stats: { value: string; label: string }[];
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  badge: string;
};

export function HeroCarousel({
  headline,
  subhead,
  cohortName,
  enrolmentStatus,
}: {
  headline?: string;
  subhead?: string;
  cohortName: string;
  enrolmentStatus: string;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides: HeroSlide[] = [
    {
      eyebrow: `${cohortName} · ${enrolmentStatus}`,
      headline: headline?.replace(/\s+significance[.!]?$/i, "").trim() || "You were born for",
      highlight: "significance.",
      subhead:
        subhead ??
        "A 15-week journey through Identity, Source, Purpose, Potential and Destiny — teaching, reflection and a community that helps you live what you discover.",
      image: "/images/learning-together.jpg",
      imageAlt: "A teacher and adult learners discussing their work together in a library",
      bullets: ["Key presentations", "Case studies", "Round tables"],
      stats: [
        { value: "3", label: "Levels" },
        { value: "15", label: "Sessions" },
        { value: "5", label: "Principles" },
      ],
      primary: { label: "Explore the 15 sessions", href: "/course" },
      secondary: { label: "Read the Purpose Journal", href: "/blog" },
      badge: "Purpose Course",
    },
    {
      eyebrow: "Clarity you can defend",
      headline: "From a vague calling to a",
      highlight: "purpose statement.",
      subhead:
        "Eight proprietary assessments, gifting evidence and clarity coaching with a mentor — so your direction is articulated, tested and evidenced rather than assumed.",
      image: "/images/mentor-guidance.jpg",
      imageAlt: "A mentor helping an adult learner with her work on a laptop",
      bullets: ["8 assessments", "1:1 clarity coaching", "Verified certificates"],
      stats: [
        { value: "8", label: "Instruments" },
        { value: "80%", label: "Pass mark" },
        { value: "1:1", label: "Coaching" },
      ],
      primary: { label: "See the assessments", href: "/learn/instruments" },
      secondary: { label: "How the programme works", href: "/course" },
      badge: "Assessment engine",
    },
    {
      eyebrow: "A learning community, not a library",
      headline: "Learn in a live room with",
      highlight: "real people.",
      subhead:
        "Live video classes, cohort group work, round-table discussions and mentors who notice when you go quiet — all inside one platform, peer to peer and light to run.",
      image: "/images/community.jpg",
      imageAlt: "A group joining hands across a table in a gesture of collaboration",
      bullets: ["Live video classes", "8-week cohorts", "7 communities"],
      stats: [
        { value: "Live", label: "Classes" },
        { value: "8", label: "Week cohort" },
        { value: "7", label: "Communities" },
      ],
      primary: { label: "Enter the community", href: "/community" },
      secondary: { label: "Join the next cohort", href: "/course#enrol" },
      badge: "Learning community",
    },
  ];

  const go = useCallback((next: number) => {
    setIndex((next + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || reduceMotion || interacted) return;
    const timer = setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reduceMotion, interacted, go]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const slide = slides[index];
  // Slides leave quickly and arrive with a softer ease-out, so a click never waits on the exit.
  const leave = { duration: 0.18, ease: EASE_OUT };

  return (
    <section
      ref={containerRef}
      aria-roledescription="carousel"
      aria-label="Purpose Course introduction"
      className="relative isolate overflow-hidden bg-paper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <HeroBackdrop src="/images/hero-workshop.jpg" />
      <Aurora tone="light" />

      <div className="shell relative z-10 grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20">
        <div className="rise min-w-0" style={rise(0)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`copy-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}`}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8, transition: leave }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  <Sparkles className="h-3.5 w-3.5" />
                  {slide.eyebrow}
                </span>
                <span className="glass inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                  {slide.badge}
                </span>
              </div>

              <h1 className="display mt-5 text-[2.6rem] text-navy sm:text-5xl lg:text-[4rem]">
                {slide.headline}{" "}
                <span className="relative text-gold-dark">
                  {slide.highlight}
                  <svg className="absolute -bottom-2 left-0 h-3 w-full text-gold/60" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                    <path d="M2 9C40 3 80 3 100 6s60 4 98-2" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-stone-700">{slide.subhead}</p>

              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {slide.bullets.map((bullet) => (
                  <li key={bullet} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-600">
                    <span className="h-1 w-1 rounded-full bg-gold" /> {bullet}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={slide.primary.href} className={cn(buttonVariants({ variant: "default", size: "lg" }))}>
                  {slide.primary.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={slide.secondary.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-paper/70")}>
                  {slide.secondary.label}
                </Link>
              </div>

              <dl className="glass mt-8 grid max-w-lg grid-cols-3 divide-x divide-navy/10 rounded-2xl py-4">
                {slide.stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse px-5">
                    <dt className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-600">{stat.label}</dt>
                    <dd className="font-serif text-2xl text-navy">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center" role="group" aria-label="Choose a slide">
              {slides.map((item, slideIndex) => {
                const active = slideIndex === index;
                return (
                  <button
                    key={item.badge}
                    type="button"
                    aria-label={`Show slide ${slideIndex + 1}: ${item.badge}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      go(slideIndex);
                      setInteracted(true);
                    }}
                    className="group flex h-11 items-center px-1.5"
                  >
                    <span
                      className={cn(
                        "relative block h-1.5 overflow-hidden rounded-full bg-navy/15 transition-[width,background-color] duration-300 ease-out",
                        active ? "w-12" : "w-5 group-hover:bg-navy/30",
                      )}
                    >
                      {active ? (
                        <motion.span
                          key={`bar-${index}-${paused}-${interacted}`}
                          className="absolute inset-0 origin-left rounded-full bg-gold"
                          initial={{ scaleX: paused || interacted || reduceMotion ? 1 : 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: paused || interacted || reduceMotion ? 0.2 : AUTOPLAY_MS / 1000, ease: "linear" }}
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  go(index - 1);
                  setInteracted(true);
                }}
                aria-label="Previous slide"
                className="glass inline-flex h-11 w-11 items-center justify-center rounded-full text-navy transition-[color,transform] duration-150 hover:text-gold-dark active:scale-[0.96]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  go(index + 1);
                  setInteracted(true);
                }}
                aria-label="Next slide"
                className="glass inline-flex h-11 w-11 items-center justify-center rounded-full text-navy transition-[color,transform] duration-150 hover:text-gold-dark active:scale-[0.96]"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Resume autoplay" : "Pause autoplay"}
                className="glass inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium text-stone-700 transition-transform duration-150 active:scale-[0.96]"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {paused ? "Play" : "Pause"}
              </button>
            </div>
            <p className="ml-1 text-[11px] uppercase tracking-[0.1em] text-stone-500" aria-live="polite">
              {index + 1} / {slides.length}
            </p>
          </div>
        </div>

        <div className="rise relative" style={rise(2)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`image-${index}`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } }}
              exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.01, transition: leave }}
              className="relative overflow-hidden rounded-[2rem] shadow-editorial ring-1 ring-navy/10"
            >
              <div className="relative h-[22rem] sm:h-[28rem]">
                <CoverImage src={slide.image} alt={slide.imageAlt} eager={index === 0} sizes="(min-width: 1024px) 45vw, 100vw" className={index === 1 ? "object-[center_40%]" : undefined} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
              <div className="glass-dark absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{slide.badge}</p>
                  <p className="mt-0.5 text-[13px] text-paper/90">{slide.primary.label}</p>
                </div>
                <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-paper/15 px-2.5 text-[11px] font-medium text-paper">
                  {index === 2 ? <Video className="h-3.5 w-3.5" /> : index === 1 ? <Compass className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                  {index === 2 ? "Live" : index === 1 ? "Clarity" : "15 weeks"}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE_OUT }}
            className="absolute -right-3 -top-8 hidden w-64 rounded-2xl border border-white/10 bg-gradient-to-br from-navy to-ink px-4 py-3.5 text-paper shadow-editorial sm:block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Five principles</p>
              <span className="live-pulse h-1.5 w-1.5 rounded-full bg-source" />
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              {PRINCIPLES.map((principle) => (
                <PrincipleIcon key={principle.name} icon={principle.icon} accent={principle.accent} size="sm" />
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-paper/70">Identity · Source · Purpose · Potential · Destiny</p>
          </motion.div>

          <div className="glass absolute -left-2 top-4 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-navy sm:flex">
            <Users className="h-3.5 w-3.5 text-gold-dark" /> Cohort-based
          </div>
        </div>
      </div>

      <div className="relative z-10 border-y border-navy/10 bg-navy text-paper">
        <div className="shell flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/80 sm:justify-between">
          {["Experiential learning", "Key presentations", "Case studies", "Round tables", "Live classes", "Mentorship"].map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-gold" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
