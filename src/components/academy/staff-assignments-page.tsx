import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import {
  assignments,
  assignmentSubmissions,
  courseLevels,
  enrollments,
  profiles,
  users,
} from "@/db/schema";
import { canOverseeLearners, learnerReadable } from "@/db/learner-access";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { AssignmentAuthorForm } from "@/components/academy/assignment-author-form";
import { ReviewSubmissionForm } from "@/components/mentor/forms";
export async function StaffAssignmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const oversee = canOverseeLearners(user);
  if (!oversee && !can(user, "mentorship.coach")) notFound();
  const [levels, learners, authored, submitted] = await Promise.all([
    db
      .select({ id: courseLevels.id, name: courseLevels.name })
      .from(courseLevels)
      .orderBy(courseLevels.levelNumber),
    db
      .select({
        id: profiles.id,
        name: profiles.fullName,
        levelId: enrollments.levelId,
      })
      .from(enrollments)
      .innerJoin(profiles, eq(enrollments.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(
        and(
          eq(enrollments.status, "enrolled"),
          eq(users.isActive, true),
          learnerReadable(profiles.id, user),
        ),
      ),
    db
      .select()
      .from(assignments)
      .where(oversee ? undefined : eq(assignments.createdById, user.profileId))
      .orderBy(desc(assignments.createdAt))
      .limit(40),
    oversee
      ? db
          .select({
            submission: assignmentSubmissions,
            title: assignments.title,
            studentName: profiles.fullName,
          })
          .from(assignmentSubmissions)
          .innerJoin(
            assignments,
            eq(assignmentSubmissions.assignmentId, assignments.id),
          )
          .innerJoin(profiles, eq(assignmentSubmissions.profileId, profiles.id))
          .where(eq(assignmentSubmissions.status, "submitted"))
          .orderBy(desc(assignmentSubmissions.submittedAt))
          .limit(40)
      : [],
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">Set assignments</h1>
        <p className="mt-2 text-sm text-stone-600">
          Give learners a clear brief, an optional resource and a due date.
          Students submit their own work for comments and a score out of 100.
        </p>
      </div>
      <section className="admin-card p-5">
        <h2 className="mb-5 font-serif text-xl text-navy">
          Create an assignment
        </h2>
        <AssignmentAuthorForm
          levels={levels}
          learners={learners.filter(
            (row): row is typeof row & { levelId: number } =>
              row.levelId !== null,
          )}
          allowLevelWide={oversee}
        />
      </section>
      <section className="admin-card p-5">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="font-serif text-xl text-navy">
            Published assignments
          </h2>
          {!oversee ? (
            <Link
              href="/mentor/submissions"
              className="text-sm font-semibold text-gold-dark"
            >
              Review submissions →
            </Link>
          ) : null}
        </div>
        <ul className="mt-3 divide-y divide-navy/10">
          {authored.map((assignment) => (
            <li key={assignment.id} className="py-4">
              <h3 className="font-semibold text-navy">{assignment.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">
                {assignment.brief}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                {assignment.assigneeId
                  ? (learners.find(
                      (learner) => learner.id === assignment.assigneeId,
                    )?.name ?? "Individual learner")
                  : "All enrolled learners in the level"}
                {assignment.dueAt
                  ? ` · Due ${assignment.dueAt.toLocaleString("en-GB", { timeZone: user.timezone ?? "Africa/Kampala" })}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
        {!authored.length ? (
          <p className="mt-4 text-sm text-stone-500">
            Your published assignments will appear here.
          </p>
        ) : null}
      </section>
      {oversee ? (
        <section className="admin-card p-5">
          <h2 className="font-serif text-xl text-navy">
            Submissions awaiting review
          </h2>
          <div className="mt-4 space-y-5">
            {submitted.map((row) => (
              <article
                key={row.submission.id}
                className="rounded-xl border border-navy/10 p-4"
              >
                <h3 className="font-semibold text-navy">{row.title}</h3>
                <p className="text-xs text-stone-500">{row.studentName}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">
                  {row.submission.body}
                </p>
                {row.submission.attachmentId ? (
                  <a
                    href={`/api/media/${row.submission.attachmentId}?download=1`}
                    className="mt-3 inline-block text-sm font-semibold text-gold-dark"
                  >
                    Download submitted file
                  </a>
                ) : null}
                <ReviewSubmissionForm
                  submissionId={row.submission.id}
                  version={row.submission.updatedAt.toISOString()}
                />
              </article>
            ))}
            {!submitted.length ? (
              <p className="text-sm text-stone-500">
                No submitted work is waiting for review.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
