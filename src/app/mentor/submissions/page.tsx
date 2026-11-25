import { CheckCircle2, ClipboardCheck, Paperclip } from "lucide-react";
import { ReviewSubmissionForm } from "@/components/mentor/forms";
import { getFirstMentorId, getMentorWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/utils";
import {
  DecisionStamp,
  DeskEmpty,
  DeskHero,
  DeskSheet,
  DeskTag,
  FlapBoard,
  GradeStamp,
  InTray,
  Seal,
  SheetHead,
  rise,
} from "@/components/mentor/desk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assignment review" };

export default async function MentorSubmissionsPage() {
  const user = await getSessionUser();
  const mentorId = user?.roleSlug === "admin" ? await getFirstMentorId() : user?.profileId ?? "";
  const workspace = mentorId ? await getMentorWorkspace(mentorId) : null;
  if (!workspace) return <DeskHero compact eyebrow="Review" title="Sign in with a mentor account." />;

  const awaiting = workspace.pendingSubmissions.filter((row) => row.submission.status === "submitted");
  const reviewed = workspace.pendingSubmissions.filter((row) => row.submission.status === "reviewed");

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        eyebrow="Marking desk"
        title="Assignment review"
        description="One strength, one gap, one next action. Feedback goes straight to the student's dashboard."
        aside={
          <FlapBoard
            label="In-tray"
            items={[
              { label: "Awaiting", value: awaiting.length },
              { label: "Reviewed", value: reviewed.length },
            ]}
          />
        }
      />

      <InTray count={awaiting.length} className="desk-rise" style={rise(1)}>
        <DeskSheet className="overflow-hidden" labelledBy="awaiting-feedback">
          <SheetHead id="awaiting-feedback" eyebrow="In-tray" title="Awaiting feedback" icon={ClipboardCheck} tone="gold" count={awaiting.length} />
          {awaiting.length === 0 ? (
            <DeskEmpty>No submissions waiting. The queue is clear.</DeskEmpty>
          ) : (
            <ul className="divide-y divide-navy/8">
              {awaiting.map((row) => (
                <li key={row.submission.id}>
                  <article aria-labelledby={`submission-${row.submission.id}`} className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Seal name={row.studentName} />
                          <div className="min-w-0">
                            <h3 id={`submission-${row.submission.id}`} className="font-serif text-[17px] leading-snug text-navy">
                              {row.assignment.title}
                            </h3>
                            <p className="text-[13px] text-stone-600">
                              {row.studentName} · submitted {row.submission.submittedAt ? relativeTime(row.submission.submittedAt) : "—"}
                              {row.assignment.isCollaborative ? " · collaborative" : ""}
                            </p>
                          </div>
                        </div>
                        {row.assignment.dueAt ? <DeskTag>due {formatDateTime(row.assignment.dueAt)}</DeskTag> : null}
                      </div>
                      <div className="desk-essay mt-4">
                        <p className="desk-ruled whitespace-pre-line text-[14px] text-stone-800">{row.submission.body}</p>
                      </div>
                      {row.submission.attachmentId ? (
                        <a href={`/api/media/${row.submission.attachmentId}?download=1`} className="desk-btn mt-3" data-size="sm">
                          <Paperclip aria-hidden /> Download submitted file
                        </a>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-dashed border-navy/20 bg-cream/45 px-4 pb-4 pt-3 lg:self-start">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Marking slip</p>
                      <ReviewSubmissionForm submissionId={row.submission.id} version={row.submission.updatedAt.toISOString()} />
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </DeskSheet>
      </InTray>

      <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="recently-reviewed">
        <SheetHead id="recently-reviewed" eyebrow="Out-tray" title="Recently reviewed" icon={CheckCircle2} tone="green" count={Math.min(reviewed.length, 8)} />
        {reviewed.length === 0 ? (
          <DeskEmpty>No reviews recorded yet.</DeskEmpty>
        ) : (
          <ul className="divide-y divide-navy/8">
            {reviewed.slice(0, 8).map((row, index) => (
              <li key={row.submission.id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-navy">{row.assignment.title}</p>
                  <p className="text-[12.5px] text-stone-600">
                    {row.studentName} · reviewed {row.submission.reviewedAt ? relativeTime(row.submission.reviewedAt) : "—"}
                  </p>
                  {row.submission.feedback ? (
                    <p className="mt-2 border-l-2 border-destiny/30 pl-3 font-serif text-[14.5px] italic leading-relaxed text-[#1d4f53]">{row.submission.feedback}</p>
                  ) : null}
                </div>
                {row.submission.score !== null ? (
                  <GradeStamp score={row.submission.score} caption="Score" delay={220 + index * 50} />
                ) : (
                  <DecisionStamp ink="green" delay={220 + index * 50}>
                    Reviewed
                  </DecisionStamp>
                )}
              </li>
            ))}
          </ul>
        )}
      </DeskSheet>
    </div>
  );
}
