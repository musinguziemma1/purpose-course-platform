import Link from "next/link";
import { ArrowRight, FolderOpen, Paperclip, UsersRound } from "lucide-react";
import { getAcademyTree } from "@/db/courses";
import { getGroupsForReview, getCohortPerformance } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { GroupForm, GroupScoreForm } from "@/components/academy/assessment-forms";
import { formatDateTime } from "@/lib/utils";
import { DecisionStamp, DeskEmpty, DeskHero, DeskSheet, FlapBoard, GradeStamp, PinnedNote, SheetHead, rise } from "@/components/mentor/desk";

export const dynamic = "force-dynamic";

export const metadata = { title: "Group work review" };

export default async function MentorGroupsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [groups, tree, performance] = await Promise.all([getGroupsForReview(), getAcademyTree(), getCohortPerformance()]);
  const students = performance.map((student) => ({ id: student.profileId, fullName: student.fullName }));
  const awaiting = groups.flatMap((group) => group.submissions.filter((submission) => submission.status === "submitted").map((submission) => ({ group, submission })));
  const reviewedCount = groups.flatMap((group) => group.submissions).filter((submission) => submission.status === "reviewed").length;

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        eyebrow="Collaboration"
        title="Group work review"
        description="Form collaboration groups, read the shared deliverable, then give a score and informative feedback that every member receives."
        aside={
          <FlapBoard
            label="Filing cabinet"
            items={[
              { label: "Groups", value: groups.length },
              { label: "Awaiting", value: awaiting.length },
              { label: "Reviewed", value: reviewedCount },
            ]}
          />
        }
      />

      <div className="grid gap-7 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-4">
          {groups.map((group, index) => (
            <div key={group.id} className="desk-rise pt-6" style={rise(index + 1)}>
            <article aria-labelledby={`group-${group.id}`} className="desk-folder">
              <span className="desk-folder-tab">
                <FolderOpen aria-hidden className="h-3.5 w-3.5 shrink-0" />
                <span>{group.courseTitle ?? "Collaborative project"}</span>
              </span>
              <div className="px-5 pb-5 pt-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id={`group-${group.id}`} className="font-serif text-[1.3rem] leading-tight text-[#3d2f10]">
                      {group.name}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#6b5220]">{group.mentorName ? `Mentor: ${group.mentorName}` : "Unassigned"}</p>
                  </div>
                  <span className="desk-coin">
                    {group.members.length}
                    <span className="sr-only"> members</span>
                  </span>
                </div>
                {group.brief ? <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[#4a3b18]">{group.brief}</p> : null}

                <ul aria-label={`${group.name} members`} className="mt-3 flex flex-wrap gap-1.5">
                  {group.members.map((member) => (
                    <li
                      key={member.profileId}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium shadow-[0_1px_1px_rgba(70,48,12,0.15)] ${member.role === "lead" ? "bg-navy text-paper" : "bg-[#fffaf0] text-[#4a3b18]"}`}
                    >
                      {member.role === "lead" ? <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold">Lead</span> : null}
                      {member.fullName}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 space-y-4">
                  {group.submissions.length === 0 ? (
                    <DeskSheet as="div" className="rotate-[0.3deg]">
                      <DeskEmpty>No submission yet.</DeskEmpty>
                    </DeskSheet>
                  ) : (
                    group.submissions.map((submission) => (
                      <DeskSheet key={submission.id} as="div" className="px-5 pb-5 pt-4">
                        <span aria-hidden className="desk-clip" />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-serif text-[16.5px] leading-snug text-navy">{submission.title}</p>
                            <p className="text-[12px] uppercase tracking-[0.08em] text-stone-500">
                              {submission.submittedAt ? `Submitted ${formatDateTime(submission.submittedAt)}` : "Draft"}
                            </p>
                          </div>
                          {submission.status === "reviewed" && submission.score !== null ? (
                            <GradeStamp score={submission.score} caption="Group" />
                          ) : (
                            <DecisionStamp ink={submission.status === "reviewed" ? "green" : "gold"}>{submission.status}</DecisionStamp>
                          )}
                        </div>
                        <div className="desk-essay mt-3">
                          <p className="desk-ruled whitespace-pre-line text-[14px] text-stone-800">{submission.body}</p>
                        </div>
                        {submission.feedback ? (
                          <p className="mt-3 border-l-2 border-destiny/30 pl-3 font-serif text-[14.5px] italic leading-relaxed text-[#1d4f53]">
                            <span className="sr-only">Feedback: </span>
                            {submission.feedback}
                          </p>
                        ) : null}
                        <GroupScoreForm submissionId={submission.id} />
                      </DeskSheet>
                    ))
                  )}
                </div>
              </div>
            </article>
            </div>
          ))}
          {groups.length === 0 ? (
            <div className="desk-rise pt-6" style={rise(1)}>
              <div className="desk-folder">
                <span className="desk-folder-tab">
                  <Paperclip aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  <span>Empty drawer</span>
                </span>
                <DeskEmpty className="text-[#6b5220]">No groups yet. Form the first collaboration group with the panel on the right.</DeskEmpty>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-8 xl:sticky xl:top-24">
          <DeskSheet className="desk-rise overflow-hidden" style={rise(2)} labelledBy="form-group">
            <SheetHead id="form-group" title="Form a group" icon={UsersRound} tone="gold" />
            <div className="px-5 pb-5 pt-4">
              <GroupForm courses={tree.map((course) => ({ id: course.id, title: course.title }))} students={students} />
            </div>
          </DeskSheet>

          <PinnedNote title="Scoring guidance" angle={1.1} style={rise(3)}>
            <p>
              Score the thinking, not the polish. 80+ means the group evidenced its claim; 60–79 means the work needs one more pass; below 60 means the group should
              return to the module together.
            </p>
            <Link href="/mentor/assessments" className="mt-3 inline-flex min-h-10 items-center gap-1 font-semibold text-navy underline decoration-gold-dark decoration-2 underline-offset-4">
              See the performance matrix <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </PinnedNote>
        </div>
      </div>
    </div>
  );
}
