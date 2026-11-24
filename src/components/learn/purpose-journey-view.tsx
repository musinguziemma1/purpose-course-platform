import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Gauge, NotebookPen, Fingerprint } from "lucide-react";
import type { JourneyRecommendation, PurposeJourney } from "@/db/purpose-journey";
import { PRINCIPLE_INFO } from "@/lib/purpose-journey";
import { cn } from "@/lib/utils";

type Principle = PurposeJourney["principles"][number];

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
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
export function PrincipleProgress({ principles, detailed = false }: { principles: Principle[]; detailed?: boolean }) {
  return (
    <ul className={cn("space-y-4", detailed && "space-y-6")}>
      {principles.map((principle) => (
        <li key={principle.key} id={detailed ? `journey-${principle.key}` : undefined}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-[15px] text-navy">
              <span className="font-semibold">{principle.name}</span>
              <span className="ml-2 text-[13px] text-stone-600">{principle.question}</span>
            </p>
            <span className="shrink-0 font-serif text-[17px] tabular-nums text-navy">{principle.score}%</span>
          </div>
          <Bar value={principle.score} color={principle.color} label={`${principle.name} progress`} />
          {detailed ? (
            <>
              <p className="mt-2 text-[13px] text-stone-600">{principle.focus}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {evidenceSummary(principle).map((item) => (
                  <div key={item.label} className="flex items-start gap-2 rounded-lg border border-navy/10 bg-cream/40 px-3 py-2">
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

export function OverallDevelopment({ value }: { value: number }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-stone-600">Overall development</p>
      <p className="mt-1 font-serif text-5xl leading-none tabular-nums text-navy">{value}%</p>
      <div className="mt-3"><Bar value={value} color="#c9a227" label="Overall development" /></div>
      <p className="mt-2 text-[13px] text-stone-600">The average of your five principles.</p>
    </div>
  );
}

/** Vision → Goals → Action → Impact: where reflection turns into action. */
export function JourneyStages({ stages }: { stages: PurposeJourney["stages"] }) {
  const nextIndex = stages.findIndex((stage) => !stage.done);
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

export function NextSteps({ items, emptyText = "You are up to date. Keep going with your current course." }: { items: JourneyRecommendation[]; emptyText?: string }) {
  if (!items.length) return <p className="text-[14px] text-stone-600">{emptyText}</p>;
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
