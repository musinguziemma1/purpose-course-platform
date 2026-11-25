"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PrincipleGlyph } from "@/components/atelier/icons";

export type CompassPrinciple = {
  name: string;
  question: string;
  color: string;
  icon: string;
  description: string;
  href: string;
  count: number;
};

/* Compass geometry, in viewBox units. The viewBox is centred on (C, C). */
const C = 240;
const VIEWBOX = "-40 -10 560 500";
const STEP = 72; // five principles around the dial

/** Point on the dial. Rounded: Node and the browser disagree in the last digits of sin/cos, which breaks hydration. */
function polar(radius: number, bearing: number) {
  const radians = (bearing * Math.PI) / 180;
  const round = (value: number) => Math.round(value * 100) / 100;
  return [round(C + radius * Math.sin(radians)), round(C - radius * Math.cos(radians))] as const;
}

/** Shortest-way rotation, so the needle never spins the long way round. */
function nextAngle(current: number, bearing: number) {
  const normalised = ((current % 360) + 360) % 360;
  const delta = ((bearing - normalised + 540) % 360) - 180;
  return current + delta;
}

/**
 * The five principles around a brass compass. Hovering or focusing a
 * principle swings the needle to its bearing on a spring; the needle spins
 * into place once when the instrument first scrolls into view.
 */
export function PrinciplesCompass({ principles }: { principles: CompassPrinciple[] }) {
  const [active, setActive] = useState(0);
  const [angle, setAngle] = useState(0);
  const instrument = useRef<HTMLDivElement>(null);
  const inView = useInView(instrument, { once: true, margin: "0px 0px -20% 0px" });
  const reduce = useReducedMotion();
  const current = principles[active];

  const point = (index: number) => {
    setActive(index);
    setAngle((value) => nextAngle(value, index * STEP));
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
      <div className="mx-auto w-full max-w-[30rem]">
        <div ref={instrument} className="relative aspect-[560/500] w-full" aria-hidden>
          <CompassDial principles={principles} active={active} />
          <div className="absolute inset-0 [filter:drop-shadow(3px_6px_4px_rgba(10,26,48,0.35))]">
            <motion.svg
              viewBox={VIEWBOX}
              className="absolute inset-0 h-full w-full"
              initial={{ rotate: reduce ? 0 : -150 }}
              animate={{ rotate: inView || reduce ? angle : -150 }}
              transition={reduce ? { duration: 0 } : { type: "spring", duration: 1.1, bounce: 0.3 }}
            >
              <polygon points={`${C},100 ${C - 10},${C} ${C},${C}`} fill="#f2d27a" />
              <polygon points={`${C},100 ${C},${C} ${C + 10},${C}`} fill="#b98a1f" />
              <polygon points={`${C - 10},${C} ${C},360 ${C},${C}`} fill="#2d4d7c" />
              <polygon points={`${C},${C} ${C},360 ${C + 10},${C}`} fill="#122a4d" />
            </motion.svg>
          </div>
          <svg viewBox={VIEWBOX} className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="compass-hub" cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#fff3c9" />
                <stop offset="0.6" stopColor="#c9a227" />
                <stop offset="1" stopColor="#7a5a0e" />
              </radialGradient>
              <linearGradient id="compass-glass" x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.06" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <clipPath id="compass-face-clip">
                <circle cx={C} cy={C} r="156" />
              </clipPath>
            </defs>
            <circle cx={C} cy={C} r="15" fill="url(#compass-hub)" stroke="#6f530c" strokeWidth="1" />
            <circle cx={C} cy={C} r="4" fill="#5a4208" />
            <g clipPath="url(#compass-face-clip)">
              <ellipse cx={C - 50} cy={C - 70} rx="150" ry="95" transform={`rotate(-28 ${C - 50} ${C - 70})`} fill="url(#compass-glass)" />
            </g>
          </svg>
        </div>

        <div className="at-paper mt-4 min-h-[8.5rem] px-6 py-5 text-center" aria-hidden>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.name}
              initial={{ opacity: 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: 0.14 } }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: current.color }}>
                Bearing {String(active * STEP).padStart(3, "0")}° · {current.question}
              </p>
              <p className="at-letterpress mt-1 font-serif text-[1.6rem] leading-tight">{current.name}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed text-stone-600">{current.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ul className="space-y-4">
        {principles.map((principle, index) => {
          return (
            <li key={principle.name}>
              <Link
                href={principle.href}
                onMouseEnter={() => point(index)}
                onFocus={() => point(index)}
                data-active={index === active ? "" : undefined}
                className="at-paper at-principle group flex items-center gap-4 px-5 py-4 sm:gap-5"
                style={{ "--c": principle.color } as CSSProperties}
              >
                <span aria-hidden className="at-bookmark" />
                <span className="at-medal" style={{ "--c": principle.color } as CSSProperties}>
                  <PrincipleGlyph icon={principle.icon} aria-hidden className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-serif text-[1.3rem] leading-tight text-navy">{principle.name}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: principle.color }}>
                      {principle.question}
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[13.5px] leading-relaxed text-stone-600">{principle.description}</span>
                </span>
                <span className="hidden shrink-0 flex-col items-end gap-1 pr-6 text-right sm:flex">
                  <span className="numeric font-serif text-[1.35rem] leading-none text-navy">{principle.count}</span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-500">articles</span>
                </span>
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-stone-400 transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-gold-dark" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Static parts of the instrument: bezel, engraved ticks, rose and labels. */
function CompassDial({ principles, active }: { principles: CompassPrinciple[]; active: number }) {
  const ticks = Array.from({ length: 72 }, (_, index) => index * 5);
  return (
    <svg viewBox={VIEWBOX} className="absolute inset-0 h-full w-full overflow-visible">
      <defs>
        <linearGradient id="compass-bezel" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#f6e2a3" />
          <stop offset="0.45" stopColor="#c9a227" />
          <stop offset="1" stopColor="#7d5c0f" />
        </linearGradient>
        <linearGradient id="compass-ring" x1="0" y1="1" x2="0.3" y2="0">
          <stop offset="0" stopColor="#e9cf7a" />
          <stop offset="0.5" stopColor="#a88317" />
          <stop offset="1" stopColor="#6f530c" />
        </linearGradient>
        <radialGradient id="compass-face" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="0.8" stopColor="#f4ecd8" />
          <stop offset="1" stopColor="#e4d6b4" />
        </radialGradient>
      </defs>

      {/* Bezel, inner ring and paper face */}
      <circle cx={C} cy={C + 4} r="178" fill="#0a1a30" opacity="0.18" />
      <circle cx={C} cy={C} r="176" fill="url(#compass-bezel)" />
      <circle cx={C} cy={C} r="168" fill="url(#compass-ring)" />
      <circle cx={C} cy={C} r="157" fill="url(#compass-face)" stroke="#6f530c" strokeOpacity="0.5" />
      <circle cx={C} cy={C} r="118" fill="none" stroke="#122a4d" strokeOpacity="0.1" />
      <circle cx={C} cy={C} r="76" fill="none" stroke="#122a4d" strokeOpacity="0.1" />

      {/* Engraved ticks: major ones mark the five principles */}
      {ticks.map((tick) => {
        const major = tick % STEP === 0;
        const [x1, y1] = polar(major ? 146 : 151, tick);
        const [x2, y2] = polar(156, tick);
        return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? "#8a6610" : "#122a4d"} strokeOpacity={major ? 0.9 : 0.3} strokeWidth={major ? 2 : 1} />;
      })}

      {/* Five-point rose in the principle colours */}
      {principles.map((principle, index) => {
        const bearing = index * STEP;
        const [tx, ty] = polar(138, bearing);
        const [lx, ly] = polar(30, bearing - 36);
        const [rx, ry] = polar(30, bearing + 36);
        return (
          <g key={principle.name}>
            <polygon points={`${tx},${ty} ${lx},${ly} ${C},${C}`} fill={principle.color} opacity="0.78" />
            <polygon points={`${tx},${ty} ${C},${C} ${rx},${ry}`} fill={principle.color} />
            <polygon points={`${tx},${ty} ${C},${C} ${rx},${ry}`} fill="#000" opacity="0.18" />
          </g>
        );
      })}
      {principles.map((principle, index) => {
        const bearing = index * STEP + 36;
        const [tx, ty] = polar(70, bearing);
        const [lx, ly] = polar(22, bearing - 36);
        const [rx, ry] = polar(22, bearing + 36);
        return <polygon key={`minor-${principle.name}`} points={`${tx},${ty} ${lx},${ly} ${C},${C} ${rx},${ry}`} fill="#c9a227" opacity="0.55" />;
      })}

      {/* Labels outside the bezel */}
      {principles.map((principle, index) => {
        const bearing = index * STEP;
        // East and west labels sit further out so their questions clear the bezel.
        const [x, y] = polar(bearing === 72 || bearing === 288 ? 238 : 226, bearing);
        const on = index === active;
        return (
          <g key={`label-${principle.name}`} className="at-compass-label" opacity={on ? 1 : 0.5}>
            <text x={x} y={y - 2} textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="19" fontWeight={on ? 600 : 500} fill={principle.color}>
              {principle.name}
            </text>
            <text x={x} y={y + 15} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" letterSpacing="1.1" fill="#57534e">
              {principle.question.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
