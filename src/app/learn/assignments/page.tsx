import { CalendarClock, ClipboardList, Download, Users } from "lucide-react";
import { AssignmentForm } from "@/components/learn/forms";
import { getStudentWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Chip, EmptyDesk, LeatherFigures, LearnHero, PaperClip, Stamp, StickyNote, statusTone } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assignments" };

export default async function StudentAssignmentsPage() {
  const user = await getSessionUser();
  const workspace = user ? await getStudentWorkspace(user.profileId) : null;
  if (!workspace) return null;

  const rows = workspace.assignments;
  const toDo = rows.filter((row) => !row.submission || row.submission.status === "draft").length;
  const awaiting = rows.filter((row) => row.submission?.status === "submitted").length;
  const reviewed = rows.filter((row) => row.submission?.status === "reviewed").length;

  return (
    <div className="space-y-7">
      <LearnHero
        size="md"
        eyebrow="Mentor-reviewed work"
        title="Assignments"
        description="Submit your work for mentor review. Drafts stay private until you submit them."
        aside={
          <LeatherFigures
            items={[
              { label: "To do", value: toDo },
              { label: "Awaiting", value: awaiting },
              { label: "Reviewed", value: reviewed },
            ]}
          />
        }
      />

      {rows.length === 0 ? (
        <EmptyDesk icon={ClipboardList} title="No assignments set yet." description="Your mentor will publish work for this level shortly." />
      ) : (
        <div className="space-y-8">
          {rows.map((row) => {
            const submission = row.submission;
            const scored = submission?.score !== null && submission?.score !== undefined;
            return (
              <article key={row.assignment.id} className="lk-paper lk-stack relative p-5 sm:p-7">
                <PaperClip className="absolute -top-4 right-8" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-[1.35rem] leading-snug text-navy">{row.assignment.title}</h2>
                      {row.assignment.isCollaborative ? (
                        <Chip tone="purple" icon={Users}>
                          collaborative
                        </Chip>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-stone-700">{row.assignment.brief}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Chip tone={statusTone(submission?.status)}>{submission?.status ?? "not started"}</Chip>
                    {row.assignment.dueAt ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-stone-600">
                        <CalendarClock aria-hidden className="h-3.5 w-3.5" /> Due {formatDate(row.assignment.dueAt, "short")}
                      </span>
                    ) : null}
                  </div>
                </div>

                {submission?.feedback || scored ? (
                  <div className="mt-5 flex flex-wrap items-start gap-5">
                    {submission?.feedback ? (
                      <StickyNote from="Mentor feedback" className="min-w-0 max-w-xl flex-1">
                        {submission.feedback}
                      </StickyNote>
                    ) : null}
                    {scored ? (
                      <div className="pt-2">
                        <Stamp tone="gold" size="lg">
                          Score {submission?.score}/100
                        </Stamp>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 border-t border-dashed border-[rgba(18,42,77,0.16)] pt-4">
                  <AssignmentForm
                    assignmentId={row.assignment.id}
                    existingBody={submission?.body ?? null}
                    status={submission?.status ?? null}
                    version={submission?.updatedAt.toISOString() ?? ""}
                    existingAttachmentId={submission?.attachmentId ?? null}
                  />
                </div>
                {row.assignment.attachmentId ? (
                  <a href={`/api/media/${row.assignment.attachmentId}?download=1`} className="lk-link mt-3">
                    <Download aria-hidden className="h-4 w-4" /> Download assignment material
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
