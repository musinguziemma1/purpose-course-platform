import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
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
    <div className="space-y-5">
      <div>
        <Link href="/admin/academy" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> Academy builder
        </Link>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
          Programme outline · {programme.status}
        </p>
        <h1 className="font-serif text-2xl text-navy">{programme.name}</h1>
        <p className="text-[12px] text-stone-600">
          {programme.levels.length} levels · {moduleCount} outline modules · no learner-facing lessons
        </p>
        <p className="mt-2 max-w-3xl rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[11.5px] leading-relaxed text-stone-700">
          Saving level or module changes returns this programme to draft. Publishing makes its outline visible in the public catalogue;
          it does not create or publish digital lessons.
        </p>
      </div>

      <section className="admin-card p-5">
        <h2 className="font-serif text-lg text-navy">Programme details</h2>
        <p className="mb-4 text-[11px] text-stone-500">Saving as a draft hides this outline from the public catalogue.</p>
        <ProgrammeSettingsForm
          programme={{
            id: programme.id,
            name: programme.name,
            duration: programme.duration,
            structure: programme.structure,
            description: programme.description,
          }}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-lg text-navy">Levels and modules</h2>
          <p className="text-[11.5px] text-stone-600">Edit names, add or remove outline items, and publish the completed structure when ready.</p>
        </div>
        {programme.levels.map((level, levelIndex) => {
          const { stage, focus } = getProgrammeLevelPresentation(level.name, levelIndex);
          return (
            <section key={level.id} className="admin-card overflow-hidden">
              <div className="border-b border-navy/10 bg-cream/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-dark">
                  Level {levelIndex + 1} · {stage} · {focus}
                </p>
                <p className="mb-3 mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">
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
                    <span className="mt-3 w-5 shrink-0 text-right text-[11px] text-stone-400">{moduleIndex + 1}.</span>
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
                  <p className="text-[11px] text-stone-500">No outline modules yet. Add one before publishing.</p>
                ) : null}
                <div className="border-t border-navy/8 pt-3">
                  <AddProgrammeModuleForm programmeId={programme.id} levelId={level.id} />
                </div>
              </div>
            </section>
          );
        })}
        {programme.levels.length === 0 ? (
          <div className="admin-card p-4 text-[11.5px] text-stone-600">No levels yet. Add a level to begin the outline.</div>
        ) : null}
        <section className="admin-card p-5">
          <h3 className="mb-3 inline-flex items-center gap-1.5 font-serif text-base text-navy">
            <Plus className="h-4 w-4 text-gold-dark" /> Add a level
          </h3>
          <AddProgrammeLevelForm programmeId={programme.id} />
        </section>
      </section>
    </div>
  );
}
