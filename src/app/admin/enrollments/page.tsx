import Link from "next/link";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, courseLevels, enrollments } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-access";
import { EnrolmentForm } from "@/components/academy/cohort-forms";
export const dynamic = "force-dynamic";
export const metadata = { title: "Enrolment management" };
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
  const [rows, available] = await Promise.all([
    db
      .select({ record: enrollments, levelName: courseLevels.name })
      .from(enrollments)
      .leftJoin(courseLevels, eq(enrollments.levelId, courseLevels.id))
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
  ]);
  const page = (next: number) =>
    "/admin/enrollments?" +
    new URLSearchParams({ q, status: status ?? "", offset: String(next) });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-navy">Enrolment management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
          Approve eligible level admissions, place learners into cohorts, pause
          access and transfer placements. Exam results and learning progress are
          preserved.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-gold-dark">
          <Link href="/admin/admissions" className="underline">
            Student applications
          </Link>
          <Link href="/admin/cohorts" className="underline">
            Cohort setup
          </Link>
        </div>
      </div>
      <form className="flex flex-wrap gap-3" action="/admin/enrollments">
        <input
          name="q"
          aria-label="Search enrolments"
          defaultValue={q}
          placeholder="Search name or email"
          className="h-11 min-w-0 flex-1 rounded-lg border border-navy/20 px-3"
        />
        <select
          name="status"
          aria-label="Filter enrolment status"
          defaultValue={status ?? ""}
          className="h-11 rounded-lg border border-navy/20 px-3"
        >
          <option value="">All statuses</option>
          {["waitlist", "enrolled", "paused", "completed"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-navy px-5 text-sm font-semibold text-paper">
          Filter enrolments
        </button>
      </form>
      <div className="space-y-4">
        {rows.map(({ record, levelName }) => (
          <article key={record.id} className="admin-card p-5">
            <h2 className="font-serif text-xl text-navy">{record.fullName}</h2>
            <p className="mt-1 break-all text-sm text-stone-500">
              {record.email}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gold-dark">
              {levelName ?? "Level needs review"} · {record.status}
            </p>
            {!record.profileId ? (
              <p className="mt-2 text-xs text-amber-800">
                This interest record needs an approved Student account before
                activation.
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
      {!rows.length ? (
        <p className="admin-card p-6 text-sm text-stone-500">
          No enrolments match this filter.
        </p>
      ) : null}
      <nav
        aria-label="Enrolment pages"
        className="flex justify-between text-sm font-semibold text-gold-dark"
      >
        {offset > 0 ? (
          <Link href={page(Math.max(0, offset - 50))}>← Previous</Link>
        ) : (
          <span />
        )}
        {rows.length === 50 ? (
          <Link href={page(offset + 50)}>Next →</Link>
        ) : null}
      </nav>
    </div>
  );
}
