"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Info, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: number; prompt: string; dimensionId: number };
type Dimension = { id: number; name: string; description: string; lowLabel: string; highLabel: string };

type DimensionResult = {
  slug: string;
  name: string;
  score: number;
  bandLabel: string;
  interpretation: string;
  recommendation: string;
  lowLabel: string;
  highLabel: string;
};

type Result = {
  result: { id: number; overallScore: number; bandLabel: string; summary: string; recommendations: string[]; createdAt: string };
  dimensions: DimensionResult[];
  weakest: DimensionResult;
  strongest: DimensionResult;
  version: string;
};

export function InstrumentRunner({
  instrumentId,
  title,
  version,
  scale,
  dimensions,
  items,
  consentSummary,
}: {
  instrumentId: number;
  title: string;
  version: string;
  scale: { value: number; label: string }[];
  dimensions: Dimension[];
  items: Item[];
  consentSummary: string;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [consent, setConsent] = useState(false);
  const [share, setShare] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = Math.round((answered / items.length) * 100);

  async function submit() {
    if (!consent) {
      setError("Please confirm the consent statement before submitting.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/instruments/${instrumentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentGiven: consent,
          sharedWithMentor: share,
          responses: Object.entries(answers).map(([itemId, rawValue]) => ({ itemId: Number(itemId), rawValue })),
        }),
      });
      const data = (await response.json()) as Result & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not score the assessment.");
        return;
      }
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-5 py-4 text-paper">
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-gold">Result · version {result.version}</p>
              <p className="font-serif text-xl">{title}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-3xl text-gold">{result.result.overallScore}</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-paper/60">{result.result.bandLabel}</p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-[12.5px] leading-relaxed text-stone-700">{result.result.summary}</p>

            <div className="space-y-3">
              {result.dimensions.map((dimension) => (
                <div key={dimension.slug}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-navy">{dimension.name}</p>
                    <p className="text-[11px] font-semibold text-gold-dark">
                      {dimension.score} · {dimension.bandLabel}
                    </p>
                  </div>
                  <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-cream">
                    <div
                      className={cn("h-full rounded-full", dimension.score < 40 ? "bg-rose-400" : dimension.score < 70 ? "bg-amber-400" : "bg-source")}
                      style={{ width: `${dimension.score}%` }}
                    />
                  </div>
                  <div className="mt-0.5 flex justify-between text-[9.5px] uppercase tracking-[0.08em] text-stone-400">
                    <span>{dimension.lowLabel}</span>
                    <span>{dimension.highLabel}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{dimension.interpretation}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-gold/40 bg-gold/10 p-3.5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-gold-dark">
                <Sparkles className="h-3.5 w-3.5" /> Recommendations
              </p>
              <ul className="mt-1.5 space-y-1">
                {result.result.recommendations.map((recommendation) => (
                  <li key={recommendation} className="flex gap-2 text-[11.5px] leading-relaxed text-stone-700">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-dark" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-navy/10 bg-cream/40 p-3.5">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-navy">
                <Info className="h-3.5 w-3.5" /> How this was scored
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">
                Each response was scored 1–5 (reverse-scored where marked), averaged per domain with item weights, then
                converted to a percentage: ((mean − 1) ÷ 4) × 100. Bands: 0–39 emerging · 40–69 developing · 70–84
                established · 85–100 strong. Version {result.version}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/learn/instruments" className="inline-flex h-9 items-center rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700">
                Assessment library <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
              <Link href="/learn/goals" className="inline-flex h-9 items-center rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy hover:bg-cream">
                Take this to my mentor
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="admin-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-navy">
            {answered} of {items.length} statements answered
          </p>
          <span className="rounded-full bg-cream px-2.5 py-1 text-[10.5px] font-semibold text-stone-600">{progress}%</span>
        </div>
        <div className="meter mt-2">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 space-y-3">
          {dimensions.map((dimension) => (
            <div key={dimension.id}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-dark">{dimension.name}</p>
              <p className="text-[11px] text-stone-500">{dimension.description}</p>
              <div className="mt-2 space-y-2">
                {items
                  .filter((item) => item.dimensionId === dimension.id)
                  .map((item) => (
                    <div key={item.id} className="rounded-lg border border-navy/10 bg-paper p-3">
                      <p className="text-[12.5px] leading-snug text-navy">{item.prompt}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {scale.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setAnswers((current) => ({ ...current, [item.id]: option.value }))}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors",
                              answers[item.id] === option.value
                                ? "border-gold bg-gold/15 text-navy"
                                : "border-navy/12 text-stone-600 hover:border-navy/30",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card space-y-3 p-4">
        <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-stone-700">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy/30" />
          <span>
            <strong className="text-navy">Consent.</strong> {consentSummary}
          </span>
        </label>
        <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-stone-700">
          <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy/30" />
          <span>Share this result with my assigned mentor so we can discuss it in coaching.</span>
        </label>
        <p className="inline-flex items-start gap-1.5 text-[10.5px] leading-relaxed text-stone-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-source" />
          Stored against your profile with instrument version {version}. Individual results are never shown publicly and
          are not used for selection decisions.
        </p>
        {error ? (
          <p className="inline-flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={pending || answered < items.length || !consent}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gold text-[12.5px] font-semibold text-ink transition-colors hover:bg-gold-dark hover:text-paper disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {pending ? "Scoring…" : `Submit ${items.length} responses for scoring`}
        </button>
        {answered < items.length ? (
          <p className="text-center text-[10.5px] text-stone-500">{items.length - answered} statements still to answer.</p>
        ) : null}
      </div>
    </div>
  );
}
