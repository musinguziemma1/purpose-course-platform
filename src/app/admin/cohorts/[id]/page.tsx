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
import { ArrowRight, CalendarDays, Settings2, UserPlus, UsersRound } from "lucide-react";
import { initials } from "@/lib/utils";
import { GlassMeter, Led } from "@/components/admin/console/instruments";
import { ConsoleHeader, Panel, keyClass } from "@/components/admin/console/surfaces";
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
  const open = Math.max(0, cohort.capacity - size);
  const editable = ["draft", "active"].includes(cohort.status);
  return (
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/cohorts", label: "Cohorts" }}
        eyebrow={cohort.status}
        title={cohort.name}
        description={`${size} / ${cohort.capacity} active learners · ${open} places available`}
      >
        <div className="max-w-md">
          <GlassMeter value={size} max={Math.max(cohort.capacity, 1)} tone={open === 0 ? "amber" : "source"} label={`${size} of ${cohort.capacity} seats taken`} />
        </div>
      </ConsoleHeader>
      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Panel title="Members and faculty" icon={UsersRound} action={<span className="text-[12.5px] text-stone-600">{members.length} people</span>}>
            {members.length ? (
              <ul className="divide-y divide-navy/8">
                {members.map(({ member, name, email }) => (
                  <li key={member.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span aria-hidden className="k-coin">{initials(name)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">{name}</p>
                        <p className="break-all text-[12.5px] text-stone-600">{email}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] text-stone-600">
                          <Led tone={member.status === "active" ? "green" : "off"} /> {member.role} · {member.status}
                        </p>
                      </div>
                    </div>
                    {editable ? (
                      <CohortMembershipControl cohortId={id} profileId={member.profileId} role={member.role} status={member.status} />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-[14px] text-stone-600">Add approved learners and faculty to prepare this cohort.</p>
            )}
          </Panel>
          {editable ? (
            <Panel title="Place a member" icon={UserPlus} riveted bodyClassName="px-5 pb-6 pt-4">
              <CohortMemberForm cohortId={id} people={candidates} />
              <Link href="/admin/enrollments" className={keyClass("paper", "sm", "mt-4")}>
                Manage level enrolments <ArrowRight aria-hidden />
              </Link>
            </Panel>
          ) : null}
          {weeks.length ? (
            <Panel title="Week plan" icon={CalendarDays}>
              <ol className="k-ledger">
                {weeks.map((week) => (
                  <li key={week.id} className="flex gap-3 py-3 pl-[1.45rem] pr-5 text-[14px] text-stone-700">
                    <span aria-hidden className="k-rivet mt-1" />
                    <span className="pl-6">
                      <strong className="text-navy">Week {week.weekNumber}:</strong> {week.title} · {week.theme}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}
        </div>
        <Panel title="Cohort settings" icon={Settings2} riveted bodyClassName="px-5 pb-6 pt-4 sm:px-6">
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
        </Panel>
      </div>
    </div>
  );
}
