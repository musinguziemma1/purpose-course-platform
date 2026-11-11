import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { ReviewSubmissionForm } from "@/components/mentor/forms";
import { getFirstMentorId, getMentorWorkspace } from "@/db/academy";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assignment review" };

export default async function MentorSubmissionsPage() {
  const user = await getSessionUser();
  const mentorId = user?.roleSlug === "admin" ? await getFirstMentorId() : user?.profileId ?? "";
  const workspace = mentorId ? await getMentorWorkspace(mentorId) : null;
  if (!workspace) return <p className="admin-card p-8 text-sm text-stone-600">Sign in with a mentor account.</p>;

  const awaiting = workspace.pendingSubmissions.filter((row) => row.submission.status === "submitted");
  const reviewed = workspace.pendingSubmissions.filter((row) => row.submission.status === "reviewed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Assignment review</h1>
        <p className="text-[12.5px] text-stone-600">
          One strength, one gap, one next action. Feedback goes straight to the student&apos;s dashboard.
        </p>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
          <p className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
            <ClipboardCheck className="h-3.5 w-3.5" /> Awaiting feedback
          </p>
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10.5px] font-semibold text-gold-dark">{awaiting.length}</span>
        </div>
        <ul className="divide-y divide-navy/8">
          {awaiting.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-stone-500">No submissions waiting. The queue is clear.</li>
          ) : (
            awaiting.map((row) => (
              <li key={row.submission.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-[16px] text-navy">{row.assignment.title}</p>
                    <p className="text-[11.5px] text-stone-500">
                      {row.studentName} · submitted {row.submission.submittedAt ? relativeTime(row.submission.submittedAt) : "—"}
                      {row.assignment.isCollaborative ? " · collaborative" : ""}
                    </p>
                  </div>
                  {row.assignment.dueAt ? (
                    <span className="rounded-full bg-cream px-2.5 py-0.5 text-[10.5px] text-stone-600">
                      due {formatDateTime(row.assignment.dueAt)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-line rounded-lg border border-navy/10 bg-cream/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-stone-700">
                  {row.submission.body}
                </p>
                <ReviewSubmissionForm submissionId={row.submission.id} />
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="border-b border-navy/10 px-5 py-3">
          <p className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
            <CheckCircle2 className="h-3.5 w-3.5 text-source" /> Recently reviewed
          </p>
        </div>
        <ul className="divide-y divide-navy/8">
          {reviewed.length === 0 ? (
            <li className="px-5 py-6 text-[12px] text-stone-500">No reviews recorded yet.</li>
          ) : (
            reviewed.slice(0, 8).map((row) => (
              <li key={row.submission.id} className="px-5 py-3.5">
                <p className="text-[12.5px] font-medium text-navy">{row.assignment.title}</p>
                <p className="text-[11px] text-stone-500">
                  {row.studentName} · reviewed {row.submission.reviewedAt ? relativeTime(row.submission.reviewedAt) : "—"}
                </p>
                {row.submission.feedback ? (
                  <p className="mt-1 rounded-md bg-source/5 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-700">
                    {row.submission.feedback}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
