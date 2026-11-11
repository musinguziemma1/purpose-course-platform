import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Info, Scale, ShieldAlert, ShieldCheck } from "lucide-react";
import { InstrumentRunner } from "@/components/academy/instrument-runner";
import { getInstrument, getInstrumentHistory } from "@/db/engine";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function InstrumentPage({ params }: Params) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const detail = await getInstrument(slug);
  if (!detail) notFound();
  const history = await getInstrumentHistory(user.profileId, detail.instrument.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/learn/instruments" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> Assessment library
        </Link>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {detail.instrument.category} · version {detail.instrument.version} · {detail.instrument.estimatedMinutes} minutes
        </p>
        <h1 className="mt-1 font-serif text-2xl text-navy">{detail.instrument.title}</h1>
        <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">{detail.instrument.description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="admin-card p-4">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy">
            <BookOpenCheck className="h-3.5 w-3.5 text-gold-dark" /> Construct
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{detail.instrument.construct}</p>
        </div>
        <div className="admin-card p-4">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy">
            <Scale className="h-3.5 w-3.5 text-gold-dark" /> Methodology
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{detail.instrument.methodology}</p>
        </div>
        <div className="admin-card p-4">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
            <ShieldAlert className="h-3.5 w-3.5" /> Limitations
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{detail.instrument.limitations}</p>
        </div>
        <div className="admin-card p-4">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-source">
            <ShieldCheck className="h-3.5 w-3.5" /> Data protection
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{detail.instrument.dataProtection}</p>
        </div>
      </div>

      <div className="rounded-xl border border-navy/10 bg-cream/40 p-4">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy">
          <Info className="h-3.5 w-3.5 text-gold-dark" /> How to read your result
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{detail.instrument.interpretationGuide}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detail.dimensions.map((dimension) => (
            <span key={dimension.id} className="rounded-full bg-paper px-2 py-0.5 text-[10px] text-stone-600">
              {dimension.name}: {dimension.lowLabel} → {dimension.highLabel}
            </span>
          ))}
        </div>
      </div>

      <InstrumentRunner
        instrumentId={detail.instrument.id}
        title={detail.instrument.title}
        version={detail.instrument.version}
        scale={detail.instrument.responseScale}
        dimensions={detail.dimensions.map((dimension) => ({
          id: dimension.id,
          name: dimension.name,
          description: dimension.description,
          lowLabel: dimension.lowLabel,
          highLabel: dimension.highLabel,
        }))}
        items={detail.items.map((item) => ({ id: item.id, prompt: item.prompt, dimensionId: item.dimensionId }))}
        consentSummary={detail.instrument.consentSummary}
      />

      {history.length > 0 ? (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-4 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Previous attempts</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {history.map((row) => (
              <li key={row.result.id} className="px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] text-navy">
                    {row.result.overallScore} · {row.result.bandLabel}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">
                    v{row.version} · {formatDate(row.result.createdAt, "short")}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {row.result.dimensions.map((dimension) => (
                    <span key={dimension.slug} className="rounded bg-cream px-1.5 py-0.5 text-[9.5px] text-stone-600">
                      {dimension.name} {dimension.score}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
