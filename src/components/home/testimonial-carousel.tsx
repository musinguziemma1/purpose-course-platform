"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Testimonial = {
  id: number;
  name: string;
  role: string | null;
  location: string | null;
  quote: string;
  levelSlug: string | null;
};

export function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % Math.max(testimonials.length, 1));
  }, [testimonials.length]);

  const previous = useCallback(() => {
    setIndex((current) => (current - 1 + testimonials.length) % Math.max(testimonials.length, 1));
  }, [testimonials.length]);

  useEffect(() => {
    if (paused || testimonials.length < 2) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next, paused, testimonials.length]);

  if (testimonials.length === 0) return null;
  const current = testimonials[index];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[15rem] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-7 sm:p-10">
        <Quote className="h-9 w-9 text-gold/70" />
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={current.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4"
          >
            <p className="font-serif text-xl leading-relaxed text-paper/95 sm:text-2xl">“{current.quote}”</p>
            <footer className="mt-6 flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold font-serif text-sm font-semibold text-ink">
                {current.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span>
                <span className="block text-sm font-medium text-paper">{current.name}</span>
                <span className="block text-[11px] uppercase tracking-[0.12em] text-paper/50">
                  {[current.role, current.location].filter(Boolean).join(" · ")}
                </span>
              </span>
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {testimonials.map((testimonial, dotIndex) => (
            <button
              key={testimonial.id}
              type="button"
              aria-label={`Show testimonial ${dotIndex + 1}`}
              onClick={() => setIndex(dotIndex)}
              className={`h-1.5 rounded-full transition-all ${
                dotIndex === index ? "w-7 bg-gold" : "w-1.5 bg-paper/25 hover:bg-paper/50"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={previous}
            aria-label="Previous testimonial"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-paper/70 transition-colors hover:border-gold hover:text-gold"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next testimonial"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-paper/70 transition-colors hover:border-gold hover:text-gold"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
