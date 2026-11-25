"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { PRINCIPLES } from "@/lib/media";
import { cn } from "@/lib/utils";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { CoverImage } from "@/components/site/cover-image";
import { Aurora, rise } from "@/components/site/public-hero";
import { PrincipleGlyph } from "@/components/atelier/icons";

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
  /** Caption engraved on the brass plaque under the framed print. */
  plaque: string;
};

/**
 * Home hero. The copy changes slide by slide; the photograph hangs as a
 * framed print (matted, gilt frame, brass plaque) and crossfades inside the
 * frame. Styles: app/(site)/atelier.css.
 */
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
      plaque: "A fifteen-week journey",
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
      plaque: "Clarity, tested and evidenced",
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
      plaque: "Live, in a real room",
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
  // Copy leaves quickly and arrives with a softer ease-out, so a click never waits on the exit.
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

      <div className="shell relative z-10 grid items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
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
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="at-plate">{slide.eyebrow}</span>
                <span className="at-tile !py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">{slide.badge}</span>
              </div>

              <h1 className="display mt-6 text-[2.6rem] text-navy sm:text-5xl lg:text-[4rem]">
                {slide.headline}{" "}
                <span className="relative inline-block">
                  <span className="at-foil italic">{slide.highlight}</span>
                  <svg className="at-draw absolute -bottom-2 left-0 h-3 w-full text-gold" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                    <path d="M2 9C40 3 80 3 100 6s60 4 98-2" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-stone-700">{slide.subhead}</p>

              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {slide.bullets.map((bullet) => (
                  <li key={bullet} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-stone-600">
                    <span aria-hidden className="text-gold-dark">✦</span> {bullet}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={slide.primary.href} className="at-btn" data-variant="navy">
                  {slide.primary.label}
                  <ArrowRight aria-hidden />
                </Link>
                <Link href={slide.secondary.href} className="at-btn">
                  {slide.secondary.label}
                </Link>
              </div>

              <dl className="at-tray mt-9 grid max-w-lg grid-cols-3 gap-1.5">
                {slide.stats.map((stat) => (
                  <div key={stat.label} className="at-tile flex flex-col-reverse">
                    <dt className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">{stat.label}</dt>
                    <dd className="at-letterpress font-serif text-[1.7rem] leading-none">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
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
                    <span className={cn("at-groove", active ? "w-14" : "w-6")}>
                      {active ? (
                        <motion.span
                          key={`bar-${index}-${paused}-${interacted}`}
                          className="absolute inset-0 origin-left rounded-full bg-gradient-to-b from-[#f2d27a] to-[#b98a1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  go(index - 1);
                  setInteracted(true);
                }}
                aria-label="Previous slide"
                className="at-knob"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  go(index + 1);
                  setInteracted(true);
                }}
                aria-label="Next slide"
                className="at-knob"
              >
                <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Resume autoplay" : "Pause autoplay"}
                className="at-btn min-h-11 px-4 text-[12.5px]"
              >
                {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                {paused ? "Play" : "Pause"}
              </button>
            </div>
            <p className="ml-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500" aria-live="polite">
              {index + 1} / {slides.length}
            </p>
          </div>
        </div>

        <div className="rise relative mx-auto w-full max-w-xl lg:max-w-none" style={rise(2)}>
          {/* Framed print: gilt frame, bevelled mat, photograph crossfading inside */}
          <div className="at-frame">
            <div className="at-mat">
              <div className="at-mat-window h-[19rem] sm:h-[25rem]">
                {/* All three prints stay mounted (and loaded); the active one fades up and settles. */}
                {slides.map((item, slideIndex) => {
                  const shown = slideIndex === index;
                  return (
                    <motion.div
                      key={item.image}
                      aria-hidden={!shown}
                      className="absolute inset-0"
                      initial={false}
                      animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduceMotion ? 1 : 1.04 }}
                      transition={{ duration: shown ? 0.7 : 0.45, ease: EASE_OUT }}
                    >
                      <CoverImage
                        src={item.image}
                        alt={shown ? item.imageAlt : ""}
                        eager={slideIndex === 0}
                        sizes="(min-width: 1024px) 42vw, 100vw"
                        className={slideIndex === 1 ? "object-[center_40%]" : undefined}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Brass plaque under the frame */}
          <div className="relative -mt-4 flex justify-center">
            <div className="at-museum-plaque">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">{slide.badge}</span>
              <span className="font-serif text-[14px] italic leading-tight">{slide.plaque}</span>
            </div>
          </div>

          {/* Leather tag with the five principle medallions */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -10, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE_OUT }}
            className="at-tag-leather absolute -right-4 -top-10 hidden w-64 sm:block"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Five principles</p>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#7fd39a] shadow-[0_0_6px_#7fd39a]" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              {PRINCIPLES.map((principle) => (
                <span key={principle.name} title={principle.name} className="at-medal" data-size="sm" style={{ "--c": principle.color } as CSSProperties}>
                  <PrincipleGlyph icon={principle.icon} aria-hidden className="h-4 w-4" strokeWidth={1.8} />
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-paper/75">Identity · Source · Purpose · Potential · Destiny</p>
          </motion.div>

          {/* Gold wax seal pressed onto the frame corner */}
          <span
            aria-hidden
            className="at-seal absolute -left-5 bottom-16 hidden !h-[4.4rem] !w-[4.4rem] rotate-[-10deg] text-center sm:grid"
            data-tone="gold"
          >
            <span className="text-[9px] font-bold uppercase leading-tight tracking-[0.12em]">
              Cohort
              <br />
              based
            </span>
          </span>
        </div>
      </div>

      <div className="at-ribbon-band relative z-10 text-paper">
        <div className="shell flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/85 sm:justify-between">
          {["Experiential learning", "Key presentations", "Case studies", "Round tables", "Live classes", "Mentorship"].map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-gold">✦</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
