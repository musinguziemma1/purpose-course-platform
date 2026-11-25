import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./instruments.css";

/*
 * Console instruments. All server-rendered: the motion is CSS keyframes that
 * play once on mount (see ./instruments.css), so no client JS ships
 * for readings. Values that change after a server action glide via CSS
 * transitions instead of replaying the entrance.
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const WHEEL = Array.from({ length: 20 }, (_, index) => index % 10);

function readingText(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? new Intl.NumberFormat("en-GB").format(value) : String(value);
}

/** Mechanical counter: every digit is a wheel that turns once and lands on its value. */
export function Odometer({
  value,
  wheels = false,
  className,
}: {
  value: number | string | null | undefined;
  /** Dark counter wheels, for leather panels. */
  wheels?: boolean;
  className?: string;
}) {
  const text = readingText(value);
  let digit = 0;
  return (
    <span className={cn("k-odo", wheels && "k-odo-wheels", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="k-odo-track">
        {Array.from(text).map((char, index) => {
          if (!/[0-9]/.test(char)) {
            return (
              <span key={index} className="k-odo-sep">
                {char}
              </span>
            );
          }
          const style: Vars = { "--d": Number(char), "--i": digit++ };
          return (
            <span key={index} className="k-odo-cell">
              <span className="k-odo-strip" style={style}>
                {WHEEL.map((face, position) => (
                  <span key={position}>{face}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

export type LedTone = "green" | "amber" | "red" | "gold" | "blue" | "off";

/** Indicator lamp. Always pair it with text: colour alone never carries the meaning. */
export function Led({ tone = "green", pulse = false, label, className }: { tone?: LedTone; pulse?: boolean; label?: string; className?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("k-led", `k-led-${tone}`, pulse && "k-led-pulse", className)}
    />
  );
}

/** Glowing numerals behind navy glass. */
export function Lcd({ children, alert = false, className }: { children: ReactNode; alert?: boolean; className?: string }) {
  return <span className={cn("k-lcd", alert && "k-lcd-alert", className)}>{children}</span>;
}

export type MeterTone = "gold" | "navy" | "source" | "destiny" | "potential" | "amber";

/** Recessed glass tube that fills to the value. Decorative unless given a label. */
export function GlassMeter({
  value,
  max = 100,
  label,
  tone = "gold",
  size = "md",
  index = 0,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: MeterTone;
  size?: "sm" | "md";
  /** Position in a list, so neighbouring meters pour one after another. */
  index?: number;
  className?: string;
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const style: Vars = { "--v": `${percent.toFixed(2)}%`, "--i": index };
  return (
    <span
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(percent) : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("k-meter", tone !== "gold" && `k-meter-${tone}`, size === "sm" && "k-meter-sm", className)}
    >
      <span className="k-meter-fill" style={style} />
    </span>
  );
}

const ARC = "M14.97 86 A52 52 0 1 1 105.03 86";
const round = (value: number) => Math.round(value * 100) / 100;
function polar(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: round(60 + radius * Math.sin(radians)), y: round(60 - radius * Math.cos(radians)) };
}
const TICKS = Array.from({ length: 41 }, (_, step) => {
  const degrees = -120 + step * 6;
  const major = step % 10 === 0;
  const from = polar(major ? 40 : 44, degrees);
  const to = polar(47.5, degrees);
  return { key: step, major, ...{ x1: from.x, y1: from.y, x2: to.x, y2: to.y } };
});
const SCALE = [0, 50, 100].map((mark) => ({ mark, ...polar(32, -120 + (mark / 100) * 240) }));

const ARC_TONES: Record<MeterTone, string> = {
  gold: "#c9a227",
  navy: "#1b3a63",
  source: "#2f6b40",
  destiny: "#155e63",
  potential: "#5a3a8a",
  amber: "#d98b13",
};

/** Analog dial with a brushed bezel. The needle swings in, overshoots and settles on the reading. */
export function Gauge({
  value,
  max = 100,
  label,
  readout,
  unit,
  caption,
  tone = "gold",
}: {
  /** null when there is nothing to measure yet: the needle rests and the readout shows a dash. */
  value: number | null;
  max?: number;
  label: string;
  readout?: string;
  unit?: string;
  caption?: ReactNode;
  tone?: MeterTone;
}) {
  const ratio = value === null || max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const needle: Vars = { "--a": `${round(-120 + 240 * ratio)}deg` };
  const shown = value === null ? "—" : readout ?? `${Math.round(ratio * 100)}%`;
  return (
    <figure className="k-gauge">
      <div className="k-gauge-bezel">
        <div className="k-gauge-face">
          <svg viewBox="0 0 120 120" aria-hidden focusable="false">
            <path d={ARC} fill="none" stroke="rgba(18,42,77,0.1)" strokeWidth="4.5" strokeLinecap="round" />
            {ratio > 0 ? (
              <path
                className="k-gauge-value"
                d={ARC}
                fill="none"
                stroke={ARC_TONES[tone]}
                strokeWidth="4.5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${round(ratio * 100)} 100`}
              />
            ) : null}
            {TICKS.map((tick) => (
              <line
                key={tick.key}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={tick.major ? "rgba(18,42,77,0.7)" : "rgba(18,42,77,0.28)"}
                strokeWidth={tick.major ? 1.4 : 0.8}
                strokeLinecap="round"
              />
            ))}
            {SCALE.map((mark) => (
              <text key={mark.mark} x={mark.x} y={mark.y + 2.4} textAnchor="middle" fontSize="6.5" fontWeight="600" fill="rgba(18,42,77,0.55)">
                {Math.round((mark.mark / 100) * max)}
              </text>
            ))}
            <g className="k-gauge-needle" style={needle}>
              <path d="M60 15 L62.4 60 L61.3 71 L58.7 71 L57.6 60 Z" fill="#122a4d" />
              <path d="M60 15 L60.9 40 L59.1 40 Z" fill="#c9a227" />
            </g>
            <circle cx="60" cy="60" r="6.2" fill="#8f6d14" />
            <circle cx="60" cy="60" r="4.8" fill="#c9a227" />
            <circle cx="58.6" cy="58.5" r="1.6" fill="#f6e8b8" />
          </svg>
          <div className="k-gauge-readout">
            <span className="text-[1.45rem]">
              <Odometer value={shown} />
            </span>
            {unit ? <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">{unit}</span> : null}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 max-w-[15rem]">
        <span className="block text-[12px] font-bold uppercase tracking-[0.1em] text-navy">{label}</span>
        {caption ? <span className="mt-1 block text-[12.5px] leading-relaxed text-stone-600">{caption}</span> : null}
      </figcaption>
    </figure>
  );
}
