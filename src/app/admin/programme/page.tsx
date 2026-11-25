import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Bell, Building2, CalendarDays, CalendarPlus, FlaskConical, ShieldCheck, Users } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { courseLevels, profiles } from "@/db/schema";
import { getCohorts, getInstrumentResultsOverview, getOpenReports, getOrganizations, getOutboxWithNames, getRoleMatrix } from "@/db/learning";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { PERMISSION_LIST, ROLE_DEFINITIONS, can } from "@/lib/rbac";
import { CohortForm, OrgForm } from "@/components/platform/forms";
import { resolveReport } from "@/app/actions/platform";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getAttendanceForSession } from "@/db/learning";
import { Led } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, MetricTile, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Programme control" };

export default async function AdminProgrammePage() {
  await requireAdminPage("/admin/programme");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, "cohort.manage") && !canManagePeople(user)) redirect("/admin");

  const [cohorts, levels, organizations, roles, instrumentResults, outbox, reports] = await Promise.all([
    getCohorts(),
    db.select().from(courseLevels).orderBy(asc(courseLevels.sortOrder)),
    getOrganizations(),
    getRoleMatrix(),
    getInstrumentResultsOverview(),
    getOutboxWithNames(12),
    getOpenReports(),
    db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).orderBy(asc(profiles.fullName)),
  ]);

  const primaryCohort = cohorts[0];
  const attendance = primaryCohort ? await getAttendanceForSession(0).catch(() => []) : [];
  const openReports = reports.filter((row) => row.report.status === "open").length;
  const queued = outbox.filter((row) => row.outbox.status === "queued").length;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Programme"
        title="Programme control"
        description="Cohorts, organisations, the RBAC matrix, instrument results, moderation reports and the notification outbox."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Cohorts" value={cohorts.length} icon={CalendarDays} />
        <MetricTile label="Organisations" value={organizations.length} icon={Building2} tone="destiny" />
        <MetricTile label="Open reports" value={openReports} icon={AlertTriangle} tone={openReports ? "rose" : "source"} led={openReports ? { tone: "red", pulse: true } : { tone: "green" }} />
        <MetricTile label="Outbox queued" value={queued} icon={Bell} tone="gold" led={queued ? { tone: "amber", pulse: true } : undefined} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-5">
          {cohorts.length ? (
            <ul className="k-stagger space-y-3.5" aria-label="Cohorts">
              {cohorts.map((row, index) => (
                <li key={row.cohort.id} style={staggerStyle(index)}>
                  <Link href={`/admin/cohorts/${row.cohort.id}`} className="admin-card group flex flex-wrap items-center gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-gold-dark">
                        <Led tone={row.cohort.status === "active" ? "green" : row.cohort.status === "draft" ? "gold" : "off"} />
                        {row.cohort.status} · {row.levelName ?? "—"}
                      </p>
                      <p className="mt-1 font-serif text-[18px] text-navy">{row.cohort.name}</p>
                      <p className="numeric text-[12.5px] text-stone-600">
                        {formatDate(row.cohort.startsAt, "short")} → {formatDate(row.cohort.endsAt, "short")} · {row.learnerCount} learners · {row.mentorCount} faculty · {row.weekCount} weeks
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-navy">
                      Manage enrolments, capacity and members <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ConsoleEmpty icon={CalendarDays} title="No cohorts yet." description="Create the first one with the form alongside." />
          )}

          <Panel
            title="RBAC matrix"
            icon={ShieldCheck}
            description={`Organisation → people → role → permission. ${PERMISSION_LIST.length} permissions, ${ROLE_DEFINITIONS.length} roles.`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-[0.08em] text-stone-600">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">Role</th>
                    <th className="px-4 py-2.5 font-bold">Scope</th>
                    <th className="px-4 py-2.5 font-bold">Level</th>
                    <th className="px-4 py-2.5 font-bold">Permissions</th>
                    <th className="px-4 py-2.5 font-bold">People</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/8">
                  {roles.map((role) => (
                    <tr key={role.id} className="transition-colors hover:bg-cream/50">
                      <td className="px-4 py-2.5 font-medium text-navy">{role.name}</td>
                      <td className="px-4 py-2.5 text-stone-700">{ROLE_DEFINITIONS.find((definition) => definition.slug === role.slug)?.scope ?? "organisation"}</td>
                      <td className="numeric px-4 py-2.5 text-stone-700">{role.level}</td>
                      <td className="numeric px-4 py-2.5 text-stone-700">{role.permissions.length}</td>
                      <td className="numeric px-4 py-2.5 text-stone-700">{role.members}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/admin/people" className="k-strip flex items-center justify-between border-t border-navy/10 px-5 py-3 text-[13px] font-semibold text-gold-dark hover:text-navy">
              <span>Assign roles & manage organisations</span>
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Panel>

          <Panel title="Assessment engine results" icon={FlaskConical}>
            <ul className="divide-y divide-navy/8">
              {instrumentResults.map((row) => (
                <li key={row.result.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="k-lcd text-[13px] font-semibold">{row.result.overallScore}</span>
                    <p className="min-w-0 flex-1 truncate text-[13.5px] text-navy">
                      {row.studentName} · {row.instrumentTitle}
                    </p>
                    <span className="text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                      v{row.version} · {row.result.bandLabel}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {row.result.dimensions.map((dimension) => (
                      <span key={dimension.slug} className="ui-badge rounded-full border border-navy/10 bg-cream px-2 py-0.5 text-[11.5px] text-stone-700">
                        {dimension.name} {dimension.score}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
              {instrumentResults.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No results yet.</li> : null}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Create a cohort" icon={CalendarPlus} riveted bodyClassName="px-5 pb-6 pt-4">
            <CohortForm levels={levels.map((level) => ({ id: level.id, name: level.name }))} />
          </Panel>

          <Panel title="Organisations" icon={Building2} bodyClassName="px-5 py-3">
            <ul className="divide-y divide-navy/8">
              {organizations.map((row) => (
                <li key={row.organization.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                  <span className="text-navy">{row.organization.name}</span>
                  <span className="text-[11.5px] uppercase tracking-[0.08em] text-stone-600">
                    {row.organization.plan} · {row.memberCount}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <OrgForm />
            </div>
          </Panel>

          <Panel title="Moderation reports" icon={AlertTriangle}>
            <ul className="divide-y divide-navy/8">
              {reports.slice(0, 6).map((row) => (
                <li key={row.report.id} className="px-5 py-3">
                  <p className="flex items-center gap-2 text-[13.5px] font-medium text-navy">
                    <Led tone={row.report.status === "open" ? "red" : "green"} pulse={row.report.status === "open"} />
                    {row.report.reason} · {row.report.targetType} #{row.report.targetId}
                  </p>
                  <p className="text-[12px] text-stone-600">
                    {row.reporterName ?? "Anonymous"} · {formatDateTime(row.report.createdAt)}
                  </p>
                  {row.report.status === "open" ? (
                    <form action={resolveReport} className="mt-2 flex gap-2">
                      <input type="hidden" name="reportId" value={row.report.id} />
                      <input name="moderatorNote" aria-label="Action taken" placeholder="Action taken" className="h-9 min-w-0 flex-1 rounded-full border px-3.5 text-[16px] sm:text-[13px]" />
                      <button type="submit" className={keyClass("navy", "sm")}>
                        Resolve
                      </button>
                    </form>
                  ) : (
                    <p className="text-[12px] text-source">resolved</p>
                  )}
                </li>
              ))}
              {reports.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No reports. The rooms are healthy.</li> : null}
            </ul>
            <Link href="/admin/community" className="k-strip flex items-center justify-between border-t border-navy/10 px-5 py-3 text-[13px] font-semibold text-gold-dark hover:text-navy">
              Community moderation <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Panel>

          <Panel title="Notification outbox" icon={Bell}>
            <ul className="divide-y divide-navy/8">
              {outbox.map((row) => (
                <li key={row.outbox.id} className="flex gap-3 px-5 py-2.5">
                  <Led tone={row.outbox.status === "sent" || row.outbox.status === "delivered" ? "green" : row.outbox.status === "queued" ? "gold" : "off"} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-[13px] text-navy">{row.outbox.subject}</p>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-600">{row.outbox.channel}</span>
                    </div>
                    <p className="text-[12px] text-stone-600">
                      {row.recipient} · <span className="k-mono text-[11.5px]">{row.outbox.templateKey}</span> · {row.outbox.status}
                    </p>
                  </div>
                </li>
              ))}
              {outbox.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">Outbox is empty.</li> : null}
            </ul>
          </Panel>

          <Panel title="Attendance" icon={Users} bodyClassName="px-5 py-4 text-[13.5px] leading-relaxed text-stone-700">
            <p>
              Mark attendance from the mentor desk. {attendance.length} records are visible for session review; cohort attendance rolls into learner progress and certificate eligibility.
            </p>
            <Link href="/mentor/learners" className={keyClass("paper", "sm", "mt-3")}>
              Open mentor desk <ArrowRight aria-hidden />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
