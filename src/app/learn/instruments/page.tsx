import Link from "next/link";
import { ArrowRight, BookOpenCheck, ChartLine, ClipboardList, Info, ShieldCheck } from "lucide-react";
import { getInstrumentHistory, getInstrumentLibrary } from "@/db/engine";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Purpose assessments" };

export default async function InstrumentLibraryPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [library, history] = await Promise.all([
    getInstrumentLibrary(user.profileId),
    getInstrumentHistory(user.profileId),
  ]);

  const latest = history[0];
  const average = history.length
    ? Math.round(history.reduce((sum, row) => sum + row.result.overallScore, 0) / history.length)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Purpose assessments</h1>
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-stone-600">
            Eight proprietary instruments covering identity, values, strengths, skills, purpose clarity, vision,
            goal-setting and development practice. Each one states its construct, method, limits and data use before you
            begin — no invented personality scores.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Completed", value: history.length },
            { label: "Average", value: average === null ? "—" : average },
            { label: "Latest band", value: latest?.result.bandLabel ?? "—" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-navy/10 bg-paper px-3 py-2 text-center">
              <p className="font-serif text-lg text-navy">{stat.value}</p>
              <p className="text-[9px] uppercase tracking-[0.08em] text-stone-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-navy/10 bg-cream/40 p-4">
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
          <Info className="h-3.5 w-3.5 text-gold-dark" /> How the engine works
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">
          Instrument → questions → responses → scoring rules → domains → results → recommendations. Every version is
          stored with your attempt, every score is reproducible from its trace, and interpretations are banded rather
          than hidden behind an opaque “score”.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {library.map(({ instrument, dimensionCount, itemCount, latestsScore, latestBand, takenCount }) => (
          <div key={instrument.id} className="admin-card flex flex-col p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                  {instrument.category} · v{instrument.version}
                </p>
                <p className="mt-0.5 font-serif text-[16px] leading-snug text-navy">{instrument.title}</p>
              </div>
              {latestsScore !== null ? (
                <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-navy">
                  {latestsScore} · {latestBand}
                </span>
              ) : (
                <span className="rounded-full border border-navy/12 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.08em] text-stone-500">
                  not taken
                </span>
              )}
            </div>
            <p className="mt-1.5 flex-1 text-[11.5px] leading-relaxed text-stone-600">{instrument.description}</p>
            <div className="mt-2 rounded-md bg-cream/50 px-2.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">Construct</p>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-stone-600">{instrument.construct}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9.5px] uppercase tracking-[0.08em] text-stone-500">
              <span className="inline-flex items-center gap-1"><BookOpenCheck className="h-2.5 w-2.5" /> {itemCount} items</span>
              <span className="inline-flex items-center gap-1"><ChartLine className="h-2.5 w-2.5" /> {dimensionCount} domains</span>
              <span className="inline-flex items-center gap-1"><ClipboardList className="h-2.5 w-2.5" /> {instrument.estimatedMinutes} min</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5" /> {takenCount} attempts</span>
            </div>
            <Link
              href={`/learn/instruments/${instrument.slug}`}
              className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
            >
              {takenCount > 0 ? "Retake" : "Read the method & begin"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>

      {history.length > 0 ? (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Your result history</p>
            <p className="text-[10.5px] text-stone-500">Every attempt is stored with its instrument version, so change over time is visible.</p>
          </div>
          <ul className="divide-y divide-navy/8">
            {history.map((row) => (
              <li key={row.result.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-navy">{row.result.overallScore}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-navy">{row.instrumentTitle}</p>
                  <p className="text-[10px] text-stone-500">
                    {row.result.bandLabel} · v{row.version} · {formatDate(row.result.createdAt, "short")}
                    {row.sharedWithMentor ? " · shared with mentor" : " · private"}
                  </p>
                </div>
                <div className="flex gap-1">
                  {row.result.dimensions.map((dimension) => (
                    <span key={dimension.slug} title={`${dimension.name}: ${dimension.score}`} className="rounded bg-cream px-1.5 py-0.5 text-[9px] text-stone-600">
                      {dimension.name.split(" ")[0]} {dimension.score}
                    </span>
                  ))}
                </div>
                <Link href={`/learn/instruments/${row.instrumentSlug}`} className="text-[10.5px] font-semibold text-gold-dark hover:underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
