import Link from "next/link";
import { CheckCircle2, Users } from "lucide-react";
import { getAcademyTree } from "@/db/courses";
import { getGroupsForReview, getCohortPerformance } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { GroupForm, GroupScoreForm } from "@/components/academy/assessment-forms";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Group work review" };

export default async function MentorGroupsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [groups, tree, performance] = await Promise.all([getGroupsForReview(), getAcademyTree(), getCohortPerformance()]);
  const students = performance.map((student) => ({ id: student.profileId, fullName: student.fullName }));
  const awaiting = groups.flatMap((group) => group.submissions.filter((submission) => submission.status === "submitted").map((submission) => ({ group, submission })));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Group work review</h1>
        <p className="text-[12.5px] text-stone-600">
          Form collaboration groups, read the shared deliverable, then give a score and informative feedback that every
          member receives.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Groups", value: groups.length },
          { label: "Awaiting review", value: awaiting.length },
          { label: "Reviewed", value: groups.flatMap((group) => group.submissions).filter((submission) => submission.status === "reviewed").length },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <p className="font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="admin-card overflow-hidden">
              <div className="border-b border-navy/10 bg-cream/40 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-dark">{group.courseTitle ?? "Collaborative project"}</p>
                    <p className="font-serif text-[15px] text-navy">{group.name}</p>
                    <p className="text-[10.5px] text-stone-500">{group.mentorName ? `Mentor: ${group.mentorName}` : "Unassigned"}</p>
                  </div>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-[10px] font-semibold text-stone-600">
                    {group.members.length} members
                  </span>
                </div>
                {group.brief ? <p className="mt-1 text-[11.5px] leading-relaxed text-stone-600">{group.brief}</p> : null}
              </div>

              <div className="flex flex-wrap gap-1.5 border-b border-navy/8 px-5 py-2">
                {group.members.map((member) => (
                  <span key={member.profileId} className={`rounded-full px-2 py-0.5 text-[10px] ${member.role === "lead" ? "bg-navy text-paper" : "bg-cream text-stone-600"}`}>
                    {member.fullName}
                  </span>
                ))}
              </div>

              <ul className="divide-y divide-navy/8">
                {group.submissions.length === 0 ? (
                  <li className="px-5 py-4 text-[11.5px] text-stone-500">No submission yet.</li>
                ) : (
                  group.submissions.map((submission) => (
                    <li key={submission.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12.5px] font-semibold text-navy">{submission.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${submission.status === "reviewed" ? "bg-source/10 text-source" : "bg-amber-100 text-amber-900"}`}>
                          {submission.status}
                          {submission.score !== null ? ` · ${submission.score}%` : ""}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-line rounded-lg border border-navy/10 bg-cream/40 px-3 py-2 text-[11.5px] leading-relaxed text-stone-700">
                        {submission.body}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-stone-400">
                        {submission.submittedAt ? `Submitted ${formatDateTime(submission.submittedAt)}` : "Draft"}
                      </p>
                      {submission.feedback ? (
                        <p className="mt-1.5 rounded-md border border-source/20 bg-source/5 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-700">
                          Feedback: {submission.feedback}
                        </p>
                      ) : null}
                      <GroupScoreForm submissionId={submission.id} />
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
          {groups.length === 0 ? (
            <div className="admin-card p-6 text-[12px] text-stone-600">
              No groups yet. Form the first collaboration group with the panel on the right.
            </div>
          ) : null}
        </div>

        <div className="space-y-4 xl:sticky xl:top-6">
          <div className="admin-card p-5">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
              <Users className="h-3.5 w-3.5 text-gold-dark" /> Form a group
            </p>
            <div className="mt-3">
              <GroupForm
                courses={tree.map((course) => ({ id: course.id, title: course.title }))}
                students={students}
              />
            </div>
          </div>
          <div className="rounded-xl border border-[#bcd9db] bg-[#e3eff0]/50 p-4 text-[11.5px] leading-relaxed text-stone-700">
            <p className="inline-flex items-center gap-1.5 font-semibold text-[#155e63]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Scoring guidance
            </p>
            <p className="mt-1">
              Score the thinking, not the polish. 80+ means the group evidenced its claim; 60–79 means the work needs one
              more pass; below 60 means the group should return to the module together.
            </p>
            <Link href="/mentor/assessments" className="mt-2 inline-flex font-semibold text-navy hover:underline">
              See the performance matrix →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
