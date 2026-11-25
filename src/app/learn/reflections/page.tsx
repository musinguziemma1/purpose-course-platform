import { NotebookPen, ShieldCheck } from "lucide-react";
import { ReflectionForm } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { isPrincipleKey } from "@/lib/purpose-journey";
import { Chip, LeatherFigures, LearnHero, Panel } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reflections" };

const VISIBILITY_TONE = { private: "plain", mentor: "teal", cohort: "purple" } as const;

export default async function StudentReflectionsPage({ searchParams }: { searchParams: Promise<{ principle?: string }> }) {
  const { principle } = await searchParams;
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  const sessionsForLevel = workspace.levelSessions.map((session) => ({
    id: session.id,
    code: session.code,
    title: session.title,
  }));
  const shared = workspace.reflections.filter((reflection) => reflection.visibility !== "private").length;

  return (
    <div className="space-y-7">
      <LearnHero
        size="md"
        eyebrow="Your learning record"
        title="Reflections"
        description="Private by default options below — share with your mentor or the cohort when it helps."
        aside={
          <LeatherFigures
            items={[
              { label: "Entries", value: workspace.reflections.length },
              { label: "Shared", value: shared },
            ]}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr] xl:items-start">
        <Panel title="New reflection" icon={NotebookPen} stacked className="xl:sticky xl:top-24">
          <ReflectionForm sessions={sessionsForLevel} defaultPrinciple={isPrincipleKey(principle) ? principle : ""} />
          <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-stone-600">
            <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-source" /> Private entries are visible only to you. Mentor-shared entries appear on your
            mentor&apos;s desk.
          </p>
        </Panel>

        <section aria-labelledby="journal-heading" className="lk-notebook py-6 pr-5 sm:pr-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="journal-heading" className="font-serif text-[1.45rem] text-navy">
              Your journal
            </h2>
            <span className="text-[13px] text-stone-600">{workspace.reflections.length} entries</span>
          </div>
          <ul className="mt-4 space-y-7">
            {workspace.reflections.length === 0 ? (
              <li className="lk-lined text-[15px] text-stone-600">Nothing written yet. One honest paragraph is a good start.</li>
            ) : (
              workspace.reflections.map((reflection) => (
                <li key={reflection.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-serif text-[1.1rem] leading-snug text-navy">{reflection.prompt}</p>
                    <Chip tone={VISIBILITY_TONE[reflection.visibility as keyof typeof VISIBILITY_TONE] ?? "plain"}>{reflection.visibility}</Chip>
                  </div>
                  <p className="lk-lined mt-1 whitespace-pre-line text-[15px] text-stone-800">{reflection.body}</p>
                  <p className="mt-1.5 text-[12px] uppercase tracking-[0.1em] text-stone-600">{formatDateTime(reflection.createdAt)}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
