import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireAdminPage } from "@/lib/page-access";
import { db } from "@/db";
import {
  cohorts,
  cohortMembers,
  cohortWeeks,
  courses,
  enrollments,
  profiles,
  roles,
  users,
} from "@/db/schema";
import {
  CohortSetupForm,
  CohortMemberForm,
  CohortMembershipControl,
} from "@/components/academy/cohort-forms";
import { getProgrammeLevelOptions } from "@/db/programme-options";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";
export const metadata = { title: "Manage cohort" };
export default async function CohortDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("/admin/cohorts");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [cohort] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .limit(1);
  if (!cohort) notFound();
  const [members, levels, courseRows, people, eligibleLearners, weeks] =
    await Promise.all([
    db
      .select({
        member: cohortMembers,
        name: profiles.fullName,
        email: users.email,
      })
      .from(cohortMembers)
      .innerJoin(profiles, eq(cohortMembers.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(cohortMembers.cohortId, id))
      .orderBy(cohortMembers.role, profiles.fullName),
    getProgrammeLevelOptions(),
    db
      .select({
        id: courses.id,
        title: courses.title,
        levelId: courses.levelId,
      })
      .from(courses)
      .orderBy(courses.title),
    db
      .select({
        id: profiles.id,
        name: profiles.fullName,
        role: roles.name,
        roleSlug: roles.slug,
        permissions: roles.permissions,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .where(and(eq(users.isActive, true), sql`${roles.slug}<>'guest'`))
      .orderBy(profiles.fullName)
      .limit(1000),
    db
      .select({ id: enrollments.profileId })
      .from(enrollments)
      .where(
        and(
          cohort.levelId
            ? eq(enrollments.levelId, cohort.levelId)
            : sql`false`,
          eq(enrollments.status, "enrolled"),
        ),
      ),
    db
      .select()
      .from(cohortWeeks)
      .where(eq(cohortWeeks.cohortId, id))
      .orderBy(cohortWeeks.weekNumber),
  ]);
  const eligibleLearnerIds = new Set(
    eligibleLearners.flatMap((row) => (row.id ? [row.id] : [])),
  );
  const candidates = people.flatMap<{
    id: string;
    name: string;
    role: string;
    membership: "learner" | "faculty";
  }>((person) => {
    if (person.roleSlug === "student")
      return eligibleLearnerIds.has(person.id)
        ? [{ ...person, membership: "learner" as const }]
        : [];
    const authorised =
      can(person, "mentorship.coach") ||
      can(person, "academy.author") ||
      can(person, "academy.oversee");
    return authorised ? [{ ...person, membership: "faculty" as const }] : [];
  });
  const size = members.filter(
    (row) => row.member.role === "learner" && row.member.status === "active",
  ).length;
  return (
    <div className="space-y-5">
      <Link
        href="/admin/cohorts"
        className="text-sm font-semibold text-gold-dark underline"
      >
        ← Cohorts
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-source">
          {cohort.status}
        </p>
        <h1 className="mt-2 font-serif text-3xl text-navy">{cohort.name}</h1>
        <p className="mt-2 text-sm text-stone-600">
          {size} / {cohort.capacity} active learners ·{" "}
          {Math.max(0, cohort.capacity - size)} places available
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="admin-card p-5">
            <h2 className="mb-4 font-serif text-xl text-navy">
              Members and faculty
            </h2>
            <ul className="divide-y divide-navy/10">
              {members.map(({ member, name, email }) => (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-navy">{name}</p>
                    <p className="break-all text-xs text-stone-500">{email}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {member.role} · {member.status}
                    </p>
                  </div>
                  {["draft", "active"].includes(cohort.status) ? (
                    <CohortMembershipControl
                      cohortId={id}
                      profileId={member.profileId}
                      role={member.role}
                      status={member.status}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
            {!members.length ? (
              <p className="text-sm text-stone-500">
                Add approved learners and faculty to prepare this cohort.
              </p>
            ) : null}
          </section>
          {["draft", "active"].includes(cohort.status) ? (
            <section className="admin-card p-5">
              <h2 className="mb-4 font-serif text-xl text-navy">
                Place a member
              </h2>
              <CohortMemberForm cohortId={id} people={candidates} />
              <Link
                href="/admin/enrollments"
                className="mt-4 inline-block text-sm font-semibold text-gold-dark underline"
              >
                Manage level enrolments
              </Link>
            </section>
          ) : null}
          {weeks.length ? (
            <section className="admin-card p-5">
              <h2 className="font-serif text-xl text-navy">Week plan</h2>
              <ol className="mt-4 space-y-2 text-sm text-stone-600">
                {weeks.map((week) => (
                  <li key={week.id}>
                    Week {week.weekNumber}: {week.title} · {week.theme}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        <section className="admin-card p-5">
          <h2 className="mb-4 font-serif text-xl text-navy">Cohort settings</h2>
          <CohortSetupForm
            key={cohort.id}
            levels={levels}
            courses={courseRows}
            cohort={{
              ...cohort,
              startsAt: cohort.startsAt.toISOString(),
              endsAt: cohort.endsAt.toISOString(),
              updatedAt: cohort.updatedAt.toISOString(),
            }}
          />
        </section>
      </div>
    </div>
  );
}
