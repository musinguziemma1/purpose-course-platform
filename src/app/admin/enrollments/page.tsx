import Link from "next/link";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { ArrowLeft, ArrowRight, Filter, GraduationCap, Search } from "lucide-react";
import { db } from "@/db";
import { cohorts, enrollments, profiles, roles, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-access";
import { EnrolmentForm, NewEnrolmentForm } from "@/components/academy/cohort-forms";
import { getProgrammeLevelOptions } from "@/db/programme-options";
import { initials } from "@/lib/utils";
import { Led, type LedTone } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, keyClass, staggerStyle } from "@/components/admin/console/surfaces";
export const dynamic = "force-dynamic";
export const metadata = { title: "Enrolment management" };

const STATUS_LED: Record<string, LedTone> = { waitlist: "gold", enrolled: "green", paused: "amber", completed: "blue" };

export default async function EnrolmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; offset?: string }>;
}) {
  await requireAdminPage("/admin/enrollments");
  const params = await searchParams,
    q = (params.q ?? "").trim().slice(0, 160),
    status = ["waitlist", "enrolled", "paused", "completed"].includes(
      params.status ?? "",
    )
      ? params.status
      : undefined,
    offset = Math.max(0, Math.min(100000, Number(params.offset) || 0));
  const [rows, available, students, levels] = await Promise.all([
    db
      .select({ record: enrollments })
      .from(enrollments)
      .where(
        and(
          status ? eq(enrollments.status, status as "waitlist") : undefined,
          q
            ? or(
                ilike(enrollments.fullName, `%${q}%`),
                ilike(enrollments.email, `%${q}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(enrollments.createdAt), asc(enrollments.id))
      .limit(50)
      .offset(offset),
    db
      .select({
        id: cohorts.id,
        name: cohorts.name,
        levelId: cohorts.levelId,
        status: cohorts.status,
      })
      .from(cohorts)
      .where(inArray(cohorts.status, ["draft", "active", "completed"]))
      .orderBy(cohorts.name),
    db.select({ id: profiles.id, name: profiles.fullName, email: users.email }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).innerJoin(roles, eq(roles.id, profiles.roleId)).where(and(eq(users.isActive, true), eq(roles.slug, "student"))).orderBy(profiles.fullName).limit(250),
    getProgrammeLevelOptions(),
  ]);
  const page = (next: number) =>
    "/admin/enrollments?" +
    new URLSearchParams({ q, status: status ?? "", offset: String(next) });
  const levelLabels = new Map(levels.map((level) => [level.id, level.name]));
  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Academy"
        title="Enrolment management"
        description="Approve eligible level admissions, place learners into cohorts, pause access and transfer placements. Exam results and learning progress are preserved."
        actions={
          <>
            <Link href="/admin/admissions" className={keyClass("paper", "sm")}>
              Student applications
            </Link>
            <Link href="/admin/cohorts" className={keyClass("paper", "sm")}>
              Cohort setup
            </Link>
          </>
        }
      />
      <NewEnrolmentForm students={students} levels={levels} />
      <form className="admin-card flex flex-wrap items-center gap-3 p-3 sm:p-4" action="/admin/enrollments" role="search">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            name="q"
            aria-label="Search enrolments"
            defaultValue={q}
            placeholder="Search name or email"
            className="h-11 w-full min-w-0 rounded-full border pl-10 pr-4 text-[16px] sm:text-[14px]"
          />
        </div>
        <select
          name="status"
          aria-label="Filter enrolment status"
          defaultValue={status ?? ""}
          className="h-11 rounded-full border px-4 text-[16px] sm:text-[14px]"
        >
          <option value="">All statuses</option>
          {["waitlist", "enrolled", "paused", "completed"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button className={keyClass("navy")}>
          <Filter aria-hidden /> Filter enrolments
        </button>
      </form>
      {rows.length ? (
        <div className="k-stagger space-y-5">
          {rows.map(({ record }, index) => (
            <article key={record.id} style={staggerStyle(index)} className="admin-card k-folder p-5 sm:p-6">
              <span aria-hidden className="k-folder-tab">
                {levelLabels.get(record.levelId ?? -1) ?? "Level needs review"}
              </span>
              <div className="flex flex-wrap items-start gap-3.5">
                <span aria-hidden className="k-coin">{initials(record.fullName)}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-[1.3rem] text-navy">{record.fullName}</h2>
                  <p className="mt-0.5 break-all text-[13.5px] text-stone-600">{record.email}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-gold-dark">
                    <Led tone={STATUS_LED[record.status] ?? "off"} />
                    {levelLabels.get(record.levelId ?? -1) ?? "Level needs review"} · {record.status}
                  </p>
                </div>
              </div>
              {!record.profileId ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                  This interest record needs an approved Student account before activation.
                </p>
              ) : null}
              <EnrolmentForm
                key={record.id}
                record={{ ...record, updatedAt: record.updatedAt.toISOString() }}
                cohorts={available.filter(
                  (cohort) =>
                    cohort.levelId === record.levelId &&
                    (["draft", "active"].includes(cohort.status) ||
                      cohort.id === record.cohortId),
                )}
              />
            </article>
          ))}
        </div>
      ) : (
        <ConsoleEmpty icon={GraduationCap} title="No enrolments match this filter." description="Clear the search or choose another status." />
      )}
      <nav aria-label="Enrolment pages" className="flex justify-between gap-4">
        {offset > 0 ? (
          <Link href={page(Math.max(0, offset - 50))} className={keyClass("paper", "sm")}>
            <ArrowLeft aria-hidden /> Previous
          </Link>
        ) : (
          <span />
        )}
        {rows.length === 50 ? (
          <Link href={page(offset + 50)} className={keyClass("paper", "sm")}>
            Next <ArrowRight aria-hidden />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
