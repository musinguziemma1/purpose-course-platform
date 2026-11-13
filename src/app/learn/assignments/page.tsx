import { CalendarClock, ClipboardList, Users } from "lucide-react";
import { AssignmentForm } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assignments" };

export default async function StudentAssignmentsPage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Assignments</h1>
        <p className="text-[12.5px] text-stone-600">
          Submit your work for mentor review. Drafts stay private until you submit them.
        </p>
      </div>

      <div className="space-y-4">
        {workspace.assignments.map((row) => {
          const submission = row.submission;
          return (
            <div key={row.assignment.id} className="admin-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-lg text-navy">{row.assignment.title}</p>
                    {row.assignment.isCollaborative ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eee9f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5a3a8a]">
                        <Users className="h-2.5 w-2.5" /> collaborative
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">{row.assignment.brief}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                    {submission?.status ?? "not started"}
                  </span>
                  {row.assignment.dueAt ? (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-stone-500">
                      <CalendarClock className="h-3 w-3" /> {formatDate(row.assignment.dueAt, "short")}
                    </span>
                  ) : null}
                </div>
              </div>

              {submission?.feedback ? (
                <div className="mt-3 rounded-lg border border-source/25 bg-source/5 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-source">Mentor feedback</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-stone-700">{submission.feedback}</p>
                </div>
              ) : null}

              <AssignmentForm
                assignmentId={row.assignment.id}
                existingBody={submission?.body ?? null}
                status={submission?.status ?? null}
                version={submission?.updatedAt.toISOString() ?? ""}
                existingAttachmentId={submission?.attachmentId ?? null}
              />
              {row.assignment.attachmentId ? <a href={`/api/media/${row.assignment.attachmentId}?download=1`} className="mt-3 inline-block text-sm font-semibold text-gold-dark">Download assignment material</a> : null}
              {submission?.score !== null && submission?.score !== undefined ? <p className="mt-3 text-sm font-semibold text-source">Score: {submission.score}/100</p> : null}
            </div>
          );
        })}
        {workspace.assignments.length === 0 ? (
          <div className="admin-card p-8 text-center">
            <ClipboardList className="mx-auto h-7 w-7 text-stone-300" />
            <p className="mt-2 font-serif text-lg text-navy">No assignments set yet.</p>
            <p className="mt-1 text-[12.5px] text-stone-600">Your mentor will publish work for this level shortly.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
