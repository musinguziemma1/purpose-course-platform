import Link from "next/link";
import { ArrowRight, BookOpenCheck, ChartLine, ChevronRight, ClipboardList, History, Info, ShieldCheck } from "lucide-react";
import { getInstrumentHistory, getInstrumentLibrary } from "@/db/engine";
import { getSessionUser } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { Chip, LeatherFigures, LearnHero, Panel, btn } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Purpose assessments" };

const ENGINE_STEPS = ["Instrument", "Questions", "Responses", "Scoring rules", "Domains", "Results", "Recommendations"];

export default async function InstrumentLibraryPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [library, history] = await Promise.all([getInstrumentLibrary(user.profileId), getInstrumentHistory(user.profileId)]);

  const latest = history[0];
  const average = history.length ? Math.round(history.reduce((sum, row) => sum + row.result.overallScore, 0) / history.length) : null;

  return (
    <div className="space-y-7">
      <LearnHero
        eyebrow="Proprietary instruments"
        title="Purpose assessments"
        description="Eight proprietary instruments covering identity, values, strengths, skills, purpose clarity, vision, goal-setting and development practice. Each one states its construct, method, limits and data use before you begin — no invented personality scores."
        aside={
          <LeatherFigures
            items={[
              { label: "Completed", value: history.length },
              { label: "Average", value: average === null ? "—" : average },
              { label: "Latest band", value: <span className="text-[1.15rem]">{latest?.result.bandLabel ?? "—"}</span> },
            ]}
          />
        }
      />

      <Panel title="How the engine works" icon={Info}>
        <ol aria-label="Assessment engine steps" className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {ENGINE_STEPS.map((step, index) => (
            <li key={step} className="inline-flex items-center gap-1">
              <Chip tone={index === 0 || index === ENGINE_STEPS.length - 1 ? "gold" : "plain"}>{step}</Chip>
              {index < ENGINE_STEPS.length - 1 ? <ChevronRight aria-hidden className="h-4 w-4 text-[#a5811a]" /> : null}
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-stone-600">
          Every version is stored with your attempt, every score is reproducible from its trace, and interpretations are banded rather than hidden behind an opaque “score”.
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {library.map(({ instrument, dimensionCount, itemCount, latestsScore, latestBand, takenCount }) => (
          <article key={instrument.id} className="lk-paper flex flex-col p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="lk-kicker">
                  {instrument.category} · v{instrument.version}
                </p>
                <h2 className="mt-1 font-serif text-[1.15rem] leading-snug text-navy">{instrument.title}</h2>
              </div>
              {latestsScore !== null ? (
                <Chip tone="gold">
                  {latestsScore} · {latestBand}
                </Chip>
              ) : (
                <Chip>not taken</Chip>
              )}
            </div>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-stone-600">{instrument.description}</p>
            <div className="lk-well mt-3 px-3.5 py-2.5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-600">Construct</p>
              <p className="line-clamp-2 text-[13px] leading-relaxed text-stone-700">{instrument.construct}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] uppercase tracking-[0.08em] text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <BookOpenCheck aria-hidden className="h-3.5 w-3.5" /> {itemCount} items
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ChartLine aria-hidden className="h-3.5 w-3.5" /> {dimensionCount} domains
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList aria-hidden className="h-3.5 w-3.5" /> {instrument.estimatedMinutes} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> {takenCount} attempts
              </span>
            </div>
            <Link href={`/learn/instruments/${instrument.slug}`} className={cn(takenCount > 0 ? btn.paper : btn.navy, btn.sm, "mt-4 self-start")}>
              {takenCount > 0 ? "Retake" : "Read the method & begin"} <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>

      {history.length > 0 ? (
        <Panel
          title="Your result history"
          icon={History}
          bodyClassName="px-3 pb-3 pt-2 sm:px-4"
        >
          <p className="px-2 pb-2 text-[13px] text-stone-600">Every attempt is stored with its instrument version, so change over time is visible.</p>
          <ul className="lk-ledger">
            {history.map((row) => (
              <li key={row.result.id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                <span className="lk-coin h-10 w-10 text-[14px]">{row.result.overallScore}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-navy">{row.instrumentTitle}</p>
                  <p className="text-[13px] text-stone-600">
                    {row.result.bandLabel} · v{row.version} · {formatDate(row.result.createdAt, "short")}
                    {row.sharedWithMentor ? " · shared with mentor" : " · private"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {row.result.dimensions.map((dimension) => (
                    <Chip key={dimension.slug}>
                      <span title={dimension.name}>{dimension.name.split(" ")[0]}</span> {dimension.score}
                    </Chip>
                  ))}
                </div>
                <Link href={`/learn/instruments/${row.instrumentSlug}`} className="lk-link">
                  Open<span className="sr-only"> {row.instrumentTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
