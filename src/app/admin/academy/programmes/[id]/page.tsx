import { requireAdminPage } from "@/lib/page-access";
import { notFound, redirect } from "next/navigation";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Led } from "@/components/admin/console/instruments";
import { Caption, ConsoleHeader, Panel } from "@/components/admin/console/surfaces";
import { AddProgrammeLevelForm, AddProgrammeModuleForm, ProgrammeLevelEditor, ProgrammeModuleEditor, ProgrammeSettingsForm } from "@/components/academy/programme-editor-forms";
import { getProgrammeOutlines } from "@/db/programmes";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { getProgrammeLevelPresentation } from "@/lib/programme-stages";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminProgrammeEditorPage({ params }: Params) {
  await requireAdminPage("/admin/academy/programmes/[id]");
  const { id } = await params;
  const programmeId = Number(id);
  if (!Number.isSafeInteger(programmeId) || programmeId < 1) notFound();

  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAuthorAcademy(user)) redirect("/admin/academy");

  const outlines = await getProgrammeOutlines();
  const programme = outlines.find((item) => item.id === programmeId);
  if (!programme) notFound();

  const moduleCount = programme.levels.reduce((sum, level) => sum + level.modules.length, 0);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/academy", label: "Academy builder" }}
        eyebrow={`Programme outline · ${programme.status}`}
        title={programme.name}
        description={`${programme.levels.length} levels · ${moduleCount} outline modules · no learner-facing lessons`}
      >
        <p className="flex max-w-3xl items-start gap-2.5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-[13px] leading-relaxed text-stone-700">
          <Led tone="gold" className="mt-1" />
          Saving level or module changes returns this programme to draft. Publishing makes its outline visible in the public catalogue; it does not create or publish digital lessons.
        </p>
      </ConsoleHeader>

      <Panel title="Programme details" icon={SlidersHorizontal} riveted description="Saving as a draft hides this outline from the public catalogue." bodyClassName="px-5 pb-6 pt-4 sm:px-6">
        <ProgrammeSettingsForm
          programme={{
            id: programme.id,
            name: programme.name,
            duration: programme.duration,
            structure: programme.structure,
            description: programme.description,
          }}
        />
      </Panel>

      <section className="space-y-4">
        <div>
          <Caption>Structure</Caption>
          <h2 className="mt-1 font-serif text-[1.5rem] text-navy">Levels and modules</h2>
          <p className="text-[14px] text-stone-600">Edit names, add or remove outline items, and publish the completed structure when ready.</p>
        </div>
        {programme.levels.map((level, levelIndex) => {
          const { stage, focus } = getProgrammeLevelPresentation(level.name, levelIndex);
          return (
            <section key={level.id} className="admin-card overflow-hidden">
              <div className="k-strip p-4 sm:p-5">
                <p className="flex items-center gap-2.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-gold-dark">
                  <span className="k-well font-serif text-[14px] text-navy">{levelIndex + 1}</span>
                  Level {levelIndex + 1} · {stage} · {focus}
                </p>
                <p className="mb-3 mt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                  {level.modules.length} outline modules
                </p>
                <ProgrammeLevelEditor
                  programmeId={programme.id}
                  level={{ id: level.id, name: level.name }}
                  position={levelIndex}
                  total={programme.levels.length}
                />
              </div>
              <div className="space-y-3 p-4">
                {level.modules.map((module, moduleIndex) => (
                  <div key={module.id} className="flex items-start gap-2">
                    <span className="numeric mt-3 w-5 shrink-0 text-right text-[12px] text-stone-500">{moduleIndex + 1}.</span>
                    <ProgrammeModuleEditor
                      programmeId={programme.id}
                      levelId={level.id}
                      module={{ id: module.id, title: module.title }}
                      position={moduleIndex}
                      total={level.modules.length}
                    />
                  </div>
                ))}
                {level.modules.length === 0 ? (
                  <p className="text-[13px] text-stone-600">No outline modules yet. Add one before publishing.</p>
                ) : null}
                <div className="border-t border-navy/8 pt-3">
                  <AddProgrammeModuleForm programmeId={programme.id} levelId={level.id} />
                </div>
              </div>
            </section>
          );
        })}
        {programme.levels.length === 0 ? (
          <div className="admin-card p-5 text-[13.5px] text-stone-600">No levels yet. Add a level to begin the outline.</div>
        ) : null}
        <Panel title="Add a level" icon={Plus} riveted bodyClassName="px-5 pb-6 pt-4">
          <AddProgrammeLevelForm programmeId={programme.id} />
        </Panel>
      </section>
    </div>
  );
}
