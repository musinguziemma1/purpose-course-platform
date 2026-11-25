import { CheckCircle2, ChevronRight, Send, Users } from "lucide-react";
import { getGroupsForStudent } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { GroupSubmissionForm } from "@/components/academy/assessment-forms";
import { formatDateTime } from "@/lib/utils";
import { Chip, EmptyDesk, LearnHero, StickyNote, statusTone } from "@/components/learn/kit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Group work" };

export default async function StudentGroupsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const groups = await getGroupsForStudent(user.profileId);

  return (
    <div className="space-y-7">
      <LearnHero
        size="md"
        eyebrow="Round-table learning"
        title="Collaborative work"
        description="Round-table learning continues outside the live room. Submit one group deliverable, receive a score and informative feedback from your mentor."
      />

      {groups.length === 0 ? (
        <EmptyDesk
          icon={Users}
          title="You are not in a group yet."
          description="Your faculty forms groups for each module of collaborative work. You will be notified as soon as you are placed."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {groups.map((group) => {
            const submission = group.submissions[0] ?? null;
            return (
              // A manila project folder.
              <article key={group.id} className="lk-paper flex flex-col overflow-hidden">
                <div className="border-b border-[rgba(120,96,52,0.22)] bg-[linear-gradient(180deg,#f7e9c4,#efdcaa)] px-5 pb-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <p className="lk-kicker">{group.courseTitle ?? "Collaborative project"}</p>
                  <h2 className="mt-1 font-serif text-[1.25rem] text-navy">{group.name}</h2>
                  {group.brief ? <p className="mt-1.5 text-[14px] leading-relaxed text-stone-700">{group.brief}</p> : null}
                </div>

                <ul aria-label="Group members" className="flex flex-wrap gap-2 border-b border-dashed border-[rgba(18,42,77,0.16)] px-5 py-3">
                  {group.members.map((member) => (
                    <li key={member.profileId}>
                      <Chip tone={member.role === "lead" ? "navy" : "plain"}>
                        {member.fullName}
                        {member.role === "lead" ? " · lead" : ""}
                      </Chip>
                    </li>
                  ))}
                </ul>

                <div className="flex-1 p-5">
                  {submission ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[15px] font-semibold text-navy">{submission.title}</p>
                        <Chip tone={statusTone(submission.status)}>
                          {submission.status}
                          {submission.score !== null ? ` · ${submission.score}%` : ""}
                        </Chip>
                      </div>
                      <p className="lk-well whitespace-pre-line px-4 py-3 text-[14px] leading-relaxed text-stone-700">{submission.body}</p>
                      {submission.feedback ? (
                        <StickyNote from="Mentor feedback" tilt="right">
                          {submission.feedback}
                        </StickyNote>
                      ) : null}
                      <p className="text-[12px] uppercase tracking-[0.08em] text-stone-600">
                        {submission.submittedAt ? `Submitted ${formatDateTime(submission.submittedAt)}` : "Draft in progress"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[14px] leading-relaxed text-stone-600">
                      No deliverable yet. Agree the structure together, then submit one group response — every member receives the same score and feedback.
                    </p>
                  )}
                </div>

                <details className="group border-t border-[rgba(120,96,52,0.16)] px-5 py-3">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[14px] font-semibold text-navy [&::-webkit-details-marker]:hidden">
                    <ChevronRight aria-hidden className="h-4 w-4 text-[#a5811a] transition-transform duration-200 group-open:rotate-90" />
                    <Send aria-hidden className="h-4 w-4 text-[#a5811a]" />
                    {submission ? "Update group deliverable" : "Submit group deliverable"}
                  </summary>
                  <div className="mt-3 pb-2">
                    <GroupSubmissionForm groupId={group.id} existingTitle={submission?.title ?? null} existingBody={submission?.body ?? null} />
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}

      <div className="lk-paper flex max-w-3xl items-start gap-4 p-5">
        <span className="lk-coin lk-coin-green h-10 w-10">
          <CheckCircle2 aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <p className="font-serif text-[1.1rem] text-navy">How group scores work</p>
          <p className="mt-1 text-[14px] leading-relaxed text-stone-600">
            Your mentor reads the group output, scores it out of 100 and writes feedback that names one strength, one gap and one next action. The score appears on your progress
            record and informs any coaching conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
