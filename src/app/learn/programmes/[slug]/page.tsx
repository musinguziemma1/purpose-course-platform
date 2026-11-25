import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { getProgrammeOutlines } from "@/db/programmes";
import { getProgrammeLevelPresentation } from "@/lib/programme-stages";
import { BackLink, Chip, Coin, LeatherChip, LearnHero } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "Programme outline" };

export default async function StudentProgrammeOutlinePage({ params }: Params) {
  const { slug } = await params;
  const programme = (await getProgrammeOutlines({ includeDrafts: false })).find((outline) => outline.slug === slug);
  if (!programme) notFound();

  const moduleCount = programme.levels.reduce((total, level) => total + level.modules.length, 0);

  return (
    <div className="space-y-7">
      <BackLink href="/learn/courses">Academy courses</BackLink>

      <LearnHero
        eyebrow={`Published academic programme · ${programme.duration}`}
        title={programme.name}
        description={programme.description}
        meta={
          <>
            <LeatherChip>{programme.levels.length} levels</LeatherChip>
            <LeatherChip>{moduleCount} academic modules</LeatherChip>
          </>
        }
      />

      <div className="lk-well flex max-w-3xl items-start gap-3 p-4 text-[14px] leading-relaxed text-stone-700">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#7a5d0d]" />
        <p>
          This programme is connected to the Academy’s digital lessons, aligned quizzes, assignments, level examinations, progress rules and certificates. Course access follows your
          approved programme enrolment.
        </p>
      </div>

      {/* The outline reads like a bound table of contents: one sheet per level. */}
      {programme.levels.map((level, levelIndex) => {
        const { stage, focus } = getProgrammeLevelPresentation(level.name, levelIndex);
        return (
          <section key={level.id} className="lk-paper lk-stack overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(120,96,52,0.16)] bg-[linear-gradient(180deg,#fbf3dc,#fffdf8)] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-4">
                <Coin className="h-11 w-11 text-lg">{levelIndex + 1}</Coin>
                <div>
                  <p className="lk-kicker">
                    Level {levelIndex + 1} · {stage}
                  </p>
                  <h2 className="mt-0.5 font-serif text-[1.25rem] text-navy">{focus}</h2>
                </div>
              </div>
              <Chip>{level.modules.length} academic modules</Chip>
            </div>
            <ol className="lk-ledger px-3 sm:px-4">
              {level.modules.map((module, moduleIndex) => (
                <li key={module.id} className="flex items-baseline gap-4 px-2 py-3.5">
                  <span className="w-7 shrink-0 text-right font-serif text-[1.05rem] tabular-nums text-[#7a5d0d]">{moduleIndex + 1}.</span>
                  <span className="text-[15px] leading-relaxed text-stone-800">{module.title}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
