import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Gauge, NotebookPen, Fingerprint } from "lucide-react";
import type { JourneyRecommendation, PurposeJourney } from "@/db/purpose-journey";
import { PRINCIPLE_INFO } from "@/lib/purpose-journey";
import { cn } from "@/lib/utils";
import { Coin, Groove, Stamp } from "@/components/learn/kit";

type Principle = PurposeJourney["principles"][number];
/** "learn" renders with the learner material kit; the mentor view keeps the plain default. */
type Variant = "default" | "learn";

function Bar({ value, color, label, variant = "default", index = 0 }: { value: number; color: string; label: string; variant?: Variant; index?: number }) {
  if (variant === "learn") return <Groove value={value} color={color} label={label} index={index} />;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2.5 overflow-hidden rounded-full bg-navy/10">
      <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function evidenceSummary(principle: Principle) {
  const { learning, assessments, reflections, checks } = principle;
  const taken = assessments.filter((item) => item.result).length;
  return [
    { icon: BookOpen, label: "Learning", value: learning.total ? `${learning.done}/${learning.total} lessons` : "No lessons in your levels yet" },
    { icon: Gauge, label: "Assessments", value: assessments.length ? `${taken} of ${assessments.length} taken` : "No assessment for this principle" },
    { icon: NotebookPen, label: "Reflections", value: reflections ? `${reflections} written` : "None yet" },
    { icon: Fingerprint, label: "Profile", value: `${checks.filter((check) => check.done).length} of ${checks.length} complete` },
  ];
}

/** The five principles as labelled bars, optionally with the evidence behind each figure. */
export function PrincipleProgress({ principles, detailed = false, variant = "default" }: { principles: Principle[]; detailed?: boolean; variant?: Variant }) {
  const learn = variant === "learn";
  return (
    <ul className={cn("space-y-4", detailed && "space-y-6", learn && detailed && "space-y-7")}>
      {principles.map((principle, index) => (
        <li key={principle.key} id={detailed ? `journey-${principle.key}` : undefined} className={learn && detailed ? "scroll-mt-24" : undefined}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-[15px] text-navy">
              {learn ? <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle shadow-[inset_0_-1px_1px_rgba(0,0,0,0.3),0_0_0_2px_rgba(255,255,255,0.9)]" style={{ backgroundColor: principle.color }} /> : null}
              <span className="font-semibold">{principle.name}</span>
              <span className="ml-2 text-[13px] text-stone-600">{principle.question}</span>
            </p>
            <span className={cn("shrink-0 font-serif text-[17px] tabular-nums text-navy", learn && "lk-emboss text-[19px]")}>{principle.score}%</span>
          </div>
          <Bar value={principle.score} color={principle.color} label={`${principle.name} progress`} variant={variant} index={index} />
          {detailed ? (
            <>
              <p className="mt-2 text-[13px] text-stone-600">{principle.focus}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {evidenceSummary(principle).map((item) => (
                  <div key={item.label} className={cn("flex items-start gap-2 px-3 py-2", learn ? "lk-well" : "rounded-lg border border-navy/10 bg-cream/40")}>
                    <item.icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                    <div>
                      <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-600">{item.label}</dt>
                      <dd className="text-[13px] text-navy">{item.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function OverallDevelopment({ value, variant = "default" }: { value: number; variant?: Variant }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-stone-600">Overall development</p>
      <p className={cn("mt-1 font-serif text-5xl leading-none tabular-nums text-navy", variant === "learn" && "lk-emboss")}>{value}%</p>
      <div className="mt-3"><Bar value={value} color="#c9a227" label="Overall development" variant={variant} /></div>
      <p className="mt-2 text-[13px] text-stone-600">The average of your five principles.</p>
    </div>
  );
}

/** Vision → Goals → Action → Impact: where reflection turns into action. */
export function JourneyStages({ stages, variant = "default" }: { stages: PurposeJourney["stages"]; variant?: Variant }) {
  const nextIndex = stages.findIndex((stage) => !stage.done);
  if (variant === "learn") {
    // A passport of the journey: each stage is a page; finished ones are stamped.
    return (
      <ol aria-label="From vision to impact" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, index) => {
          const isNext = index === nextIndex;
          return (
            <li
              key={stage.key}
              className={cn(
                "relative flex min-h-40 flex-col p-4",
                isNext ? "lk-paper outline-2 outline-offset-2 outline-[#c9a227]/70" : stage.done ? "lk-paper" : "lk-well",
              )}
            >
              <div className="flex items-center gap-3">
                <Coin tone={stage.done ? "green" : isNext ? "brass" : "muted"} className="h-9 w-9 text-[15px]">
                  {stage.done ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : index + 1}
                </Coin>
                <p className="text-[15px] font-semibold text-navy">
                  {stage.label}
                  <span className="sr-only">{stage.done ? " (done)" : isNext ? " (next)" : " (not started)"}</span>
                </p>
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-stone-600">{stage.done ? "Done." : stage.hint}</p>
              {stage.done ? (
                <Stamp className="mt-3 self-end">Done</Stamp>
              ) : isNext ? (
                <p className="mt-3 lk-kicker">Your next step</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <ol aria-label="From vision to impact" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage, index) => {
        const isNext = index === nextIndex;
        return (
          <li
            key={stage.key}
            className={cn(
              "rounded-xl border p-4",
              stage.done ? "border-source/25 bg-source/[0.06]" : isNext ? "border-gold/50 bg-gold/[0.08]" : "border-navy/10 bg-paper",
            )}
          >
            <p className="flex items-center gap-2 text-[15px] font-semibold text-navy">
              {stage.done ? <CheckCircle2 aria-hidden className="h-5 w-5 text-source" /> : <Circle aria-hidden className={cn("h-5 w-5", isNext ? "text-gold-dark" : "text-stone-400")} />}
              {stage.label}
              <span className="sr-only">{stage.done ? "(done)" : isNext ? "(next)" : "(not started)"}</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{stage.done ? "Done." : stage.hint}</p>
            {isNext ? <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-dark">Your next step</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function NextSteps({
  items,
  emptyText = "You are up to date. Keep going with your current course.",
  variant = "default",
}: {
  items: JourneyRecommendation[];
  emptyText?: string;
  variant?: Variant;
}) {
  if (!items.length) return <p className="text-[14px] text-stone-600">{emptyText}</p>;
  if (variant === "learn") {
    // Index cards on the desk, each tabbed in its principle's colour.
    return (
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.href + item.title}>
            <Link
              href={item.href}
              className="lk-paper lk-lift group flex min-h-14 items-center gap-3 overflow-hidden py-3 pl-5 pr-4"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ backgroundColor: item.principle ? PRINCIPLE_INFO[item.principle].color : "#c9a227" }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-navy">{item.title}</span>
                <span className="block text-[13px] text-stone-600">{item.detail}</span>
              </span>
              <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-navy" />
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="divide-y divide-navy/10">
      {items.map((item) => (
        <li key={item.href + item.title}>
          <Link href={item.href} className="group flex min-h-14 items-center gap-3 py-3 transition-colors hover:bg-cream/50 sm:-mx-2 sm:rounded-lg sm:px-2">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.principle ? PRINCIPLE_INFO[item.principle].color : "#c9a227" }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-navy group-hover:underline">{item.title}</span>
              <span className="block text-[13px] text-stone-600">{item.detail}</span>
            </span>
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-navy" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
