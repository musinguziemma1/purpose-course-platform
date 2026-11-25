import { notFound } from "next/navigation";
import { BookOpenCheck, History, Info, Scale, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import { InstrumentRunner } from "@/components/academy/instrument-runner";
import { getInstrument, getInstrumentHistory } from "@/db/engine";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { BackLink, Chip, LearnHero, Panel } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** An index card: a coloured top rule, a heading and the text. */
function IndexCard({ icon: Icon, title, rule, text }: { icon: LucideIcon; title: string; rule: string; text: string }) {
  return (
    <div className="lk-paper overflow-hidden p-4 pt-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: rule }} />
      <h2 className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-navy">
        <Icon aria-hidden className="h-4 w-4" style={{ color: rule }} /> {title}
      </h2>
      <p className="lk-lined mt-2 text-[14px] text-stone-700">{text}</p>
    </div>
  );
}

export default async function InstrumentPage({ params }: Params) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) return null;
  const detail = await getInstrument(slug);
  if (!detail) notFound();
  const history = await getInstrumentHistory(user.profileId, detail.instrument.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/learn/instruments">Assessment library</BackLink>

      <LearnHero
        size="md"
        eyebrow={`${detail.instrument.category} · version ${detail.instrument.version} · ${detail.instrument.estimatedMinutes} minutes`}
        title={detail.instrument.title}
        description={detail.instrument.description}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <IndexCard icon={BookOpenCheck} title="Construct" rule="#a5811a" text={detail.instrument.construct} />
        <IndexCard icon={Scale} title="Methodology" rule="#1b3a63" text={detail.instrument.methodology} />
        <IndexCard icon={ShieldAlert} title="Limitations" rule="#b42318" text={detail.instrument.limitations} />
        <IndexCard icon={ShieldCheck} title="Data protection" rule="#2f6b40" text={detail.instrument.dataProtection} />
      </div>

      <div className="lk-well p-5">
        <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-navy">
          <Info aria-hidden className="h-4 w-4 text-[#7a5d0d]" /> How to read your result
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-stone-700">{detail.instrument.interpretationGuide}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {detail.dimensions.map((dimension) => (
            <Chip key={dimension.id} className="whitespace-normal">
              {dimension.name}: {dimension.lowLabel} → {dimension.highLabel}
            </Chip>
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
        <Panel title="Previous attempts" icon={History} bodyClassName="px-3 pb-3 pt-2 sm:px-4">
          <ul className="lk-ledger">
            {history.map((row) => (
              <li key={row.result.id} className="px-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-medium text-navy">
                    {row.result.overallScore} · {row.result.bandLabel}
                  </p>
                  <p className="text-[12px] uppercase tracking-[0.08em] text-stone-600">
                    v{row.version} · {formatDate(row.result.createdAt, "short")}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.result.dimensions.map((dimension) => (
                    <Chip key={dimension.slug}>
                      {dimension.name} {dimension.score}
                    </Chip>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
