import { NotebookPen, ShieldCheck } from "lucide-react";
import { ReflectionForm } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reflections" };

export default async function StudentReflectionsPage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  const sessionsForLevel = workspace.levelSessions.map((session) => ({
    id: session.id,
    code: session.code,
    title: session.title,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Reflections</h1>
        <p className="text-[12.5px] text-stone-600">
          Your learning record. Private by default options below — share with your mentor or the cohort when it helps.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr] xl:items-start">
        <div className="admin-card p-5">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
            <NotebookPen className="h-3.5 w-3.5 text-gold-dark" /> New reflection
          </p>
          <div className="mt-3">
            <ReflectionForm sessions={sessionsForLevel} />
          </div>
          <p className="mt-3 inline-flex items-start gap-1.5 text-[10.5px] leading-relaxed text-stone-500">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /> Private entries are visible only to you. Mentor-shared
            entries appear on your mentor&apos;s desk.
          </p>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Your journal</p>
            <span className="text-[11px] text-stone-500">{workspace.reflections.length} entries</span>
          </div>
          <ul className="divide-y divide-navy/8">
            {workspace.reflections.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-stone-500">
                Nothing written yet. One honest paragraph is a good start.
              </li>
            ) : (
              workspace.reflections.map((reflection) => (
                <li key={reflection.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-serif text-[15px] text-navy">{reflection.prompt}</p>
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                      {reflection.visibility}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-stone-700">{reflection.body}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-stone-400">
                    {formatDateTime(reflection.createdAt)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
