import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getProgrammeOutlines } from "@/db/programmes";
import { getProgrammeLevelPresentation } from "@/lib/programme-stages";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "Programme outline" };

export default async function StudentProgrammeOutlinePage({ params }: Params) {
  const { slug } = await params;
  const programme = (await getProgrammeOutlines({ includeDrafts: false })).find((outline) => outline.slug === slug);
  if (!programme) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/learn/courses" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> Academy courses
        </Link>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          Published academic programme · {programme.duration}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-navy">{programme.name}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-stone-600">{programme.description}</p>
        <p className="mt-3 max-w-3xl rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-[11.5px] leading-relaxed text-stone-700">
          This programme is connected to the Academy’s digital lessons, aligned quizzes, assignments, level examinations,
          progress rules and certificates. Course access follows your approved programme enrolment.
        </p>
      </div>

      {programme.levels.map((level, levelIndex) => {
        const { stage, focus } = getProgrammeLevelPresentation(level.name, levelIndex);
        return (
          <section key={level.id} className="admin-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-cream/40 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                  Level {levelIndex + 1} · {stage}
                </p>
                <h2 className="mt-1 font-serif text-xl text-navy">{focus}</h2>
              </div>
              <span className="rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                {level.modules.length} academic modules
              </span>
            </div>
            <ol className="divide-y divide-navy/8">
              {level.modules.map((module, moduleIndex) => (
                <li key={module.id} className="flex gap-3 px-5 py-3.5">
                  <span className="w-6 shrink-0 text-right text-[11px] text-stone-400">{moduleIndex + 1}.</span>
                  <span className="text-[12.5px] leading-relaxed text-stone-700">{module.title}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
