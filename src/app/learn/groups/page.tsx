import { CheckCircle2, MessageSquareQuote, Send, Users } from "lucide-react";
import { getGroupsForStudent } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { GroupSubmissionForm } from "@/components/academy/assessment-forms";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Group work" };

export default async function StudentGroupsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const groups = await getGroupsForStudent(user.profileId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Collaborative work</h1>
        <p className="text-[12.5px] text-stone-600">
          Round-table learning continues outside the live room. Submit one group deliverable, receive a score and
          informative feedback from your mentor.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 font-serif text-lg text-navy">You are not in a group yet.</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-stone-600">
            Your faculty forms groups for each module of collaborative work. You will be notified as soon as you are
            placed.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((group) => {
            const submission = group.submissions[0] ?? null;
            return (
              <div key={group.id} className="admin-card flex flex-col overflow-hidden">
                <div className="border-b border-navy/10 bg-cream/40 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-dark">
                    {group.courseTitle ?? "Collaborative project"}
                  </p>
                  <p className="font-serif text-[16px] text-navy">{group.name}</p>
                  {group.brief ? <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{group.brief}</p> : null}
                </div>

                <div className="flex flex-wrap gap-1.5 border-b border-navy/8 px-5 py-2.5">
                  {group.members.map((member) => (
                    <span
                      key={member.profileId}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                        member.role === "lead" ? "bg-navy text-paper" : "bg-cream text-stone-600"
                      }`}
                    >
                      {member.fullName}
                      {member.role === "lead" ? " · lead" : ""}
                    </span>
                  ))}
                </div>

                <div className="flex-1 p-5">
                  {submission ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12.5px] font-semibold text-navy">{submission.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${
                            submission.status === "reviewed"
                              ? "bg-source/10 text-source"
                              : submission.status === "submitted"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-cream text-stone-600"
                          }`}
                        >
                          {submission.status}
                          {submission.score !== null ? ` · ${submission.score}%` : ""}
                        </span>
                      </div>
                      <p className="whitespace-pre-line rounded-lg border border-navy/10 bg-cream/30 px-3 py-2 text-[11.5px] leading-relaxed text-stone-700">
                        {submission.body}
                      </p>
                      {submission.feedback ? (
                        <p className="inline-flex gap-2 rounded-lg border border-source/20 bg-source/5 px-3 py-2 text-[11.5px] leading-relaxed text-stone-700">
                          <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-source" />
                          <span>
                            <strong className="text-navy">Mentor feedback:</strong> {submission.feedback}
                          </span>
                        </p>
                      ) : null}
                      <p className="text-[10px] uppercase tracking-[0.08em] text-stone-400">
                        {submission.submittedAt ? `Submitted ${formatDateTime(submission.submittedAt)}` : "Draft in progress"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11.5px] leading-relaxed text-stone-600">
                      No deliverable yet. Agree the structure together, then submit one group response — every member
                      receives the same score and feedback.
                    </p>
                  )}
                </div>

                <div className="border-t border-navy/10 bg-paper px-5 py-3">
                  <details>
                    <summary className="cursor-pointer inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gold-dark">
                      <Send className="h-3.5 w-3.5" />
                      {submission ? "Update group deliverable" : "Submit group deliverable"}
                    </summary>
                    <div className="mt-3">
                      <GroupSubmissionForm
                        groupId={group.id}
                        existingTitle={submission?.title ?? null}
                        existingBody={submission?.body ?? null}
                      />
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-[#bcd9db] bg-[#e3eff0]/50 p-4 text-[11.5px] leading-relaxed text-stone-700">
        <p className="inline-flex items-center gap-1.5 font-semibold text-[#155e63]">
          <CheckCircle2 className="h-3.5 w-3.5" /> How group scores work
        </p>
        <p className="mt-1">
          Your mentor reads the group output, scores it out of 100 and writes feedback that names one strength, one gap
          and one next action. The score appears on your progress record and informs any coaching conversation.
        </p>
      </div>
    </div>
  );
}
