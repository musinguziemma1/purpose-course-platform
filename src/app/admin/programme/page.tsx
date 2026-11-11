import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Bell, Building2, CalendarDays, Users } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseLevels, profiles } from "@/db/schema";
import { getCohorts, getInstrumentResultsOverview, getOpenReports, getOrganizations, getOutboxWithNames, getRoleMatrix } from "@/db/learning";
import { canManagePeople, getSessionUser } from "@/lib/auth";
import { PERMISSION_LIST, ROLE_DEFINITIONS, can } from "@/lib/rbac";
import { CohortForm, OrgForm } from "@/components/platform/forms";
import { addCohortMember, markOutboxDelivered, moderateThread, resolveReport, setCohortStatus } from "@/app/actions/platform";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getAttendanceForSession } from "@/db/learning";

export const dynamic = "force-dynamic";

export const metadata = { title: "Programme control" };

export default async function AdminProgrammePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, "cohort.manage") && !canManagePeople(user)) redirect("/admin");

  const [cohorts, levels, organizations, roles, instrumentResults, outbox, reports, people] = await Promise.all([
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Programme control</h1>
        <p className="text-[12.5px] text-stone-600">
          Cohorts, organisations, the RBAC matrix, instrument results, moderation reports and the notification outbox.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Cohorts", value: cohorts.length, icon: CalendarDays },
          { label: "Organisations", value: organizations.length, icon: Building2 },
          { label: "Open reports", value: reports.filter((row) => row.report.status === "open").length, icon: AlertTriangle },
          { label: "Outbox queued", value: outbox.filter((row) => row.outbox.status === "queued").length, icon: Bell },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-4">
          {cohorts.map((row) => (
            <div key={row.cohort.id} className="admin-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/10 bg-cream/40 px-5 py-3">
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                    {row.cohort.status} · {row.levelName ?? "—"}
                  </p>
                  <p className="font-serif text-[15px] text-navy">{row.cohort.name}</p>
                  <p className="text-[10px] text-stone-500">
                    {formatDate(row.cohort.startsAt, "short")} → {formatDate(row.cohort.endsAt, "short")} · {row.learnerCount} learners ·{" "}
                    {row.mentorCount} faculty · {row.weekCount} weeks
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["active", "completed", "draft"].map((status) => (
                    <form key={status} action={setCohortStatus}>
                      <input type="hidden" name="cohortId" value={row.cohort.id} />
                      <input type="hidden" name="status" value={status} />
                      <button type="submit" className="rounded-full border border-navy/15 px-2.5 py-1 text-[10px] font-medium text-navy hover:bg-paper">
                        {status}
                      </button>
                    </form>
                  ))}
                  <Link href={`/learn/cohort`} className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-paper">
                    Cohort view <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
              <div className="px-5 py-3">
                <form action={addCohortMember} className="flex flex-wrap items-end gap-1.5">
                  <input type="hidden" name="cohortId" value={row.cohort.id} />
                  <select name="profileId" defaultValue={people[0]?.id ?? ""} className="h-8 min-w-40 flex-1 rounded border border-navy/15 px-2 text-[11.5px]">
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>{person.fullName}</option>
                    ))}
                  </select>
                  <select name="role" defaultValue="learner" className="h-8 rounded border border-navy/15 px-2 text-[11.5px]">
                    <option value="learner">learner</option>
                    <option value="mentor">mentor</option>
                    <option value="facilitator">facilitator</option>
                  </select>
                  <button type="submit" className="h-8 rounded-full bg-gold px-3 text-[10.5px] font-semibold text-ink">
                    Add to cohort
                  </button>
                </form>
              </div>
            </div>
          ))}
          {cohorts.length === 0 ? (
            <div className="admin-card p-6 text-[12px] text-stone-600">No cohorts yet. Create the first one on the right.</div>
          ) : null}

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">RBAC matrix</p>
              <p className="text-[10.5px] text-stone-500">Organisation → people → role → permission. {PERMISSION_LIST.length} permissions, {ROLE_DEFINITIONS.length} roles.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-[11.5px]">
                <thead className="bg-cream/40 text-[9.5px] uppercase tracking-[0.08em] text-stone-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Role</th>
                    <th className="px-4 py-2 font-semibold">Scope</th>
                    <th className="px-4 py-2 font-semibold">Level</th>
                    <th className="px-4 py-2 font-semibold">Permissions</th>
                    <th className="px-4 py-2 font-semibold">People</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/8">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-cream/30">
                      <td className="px-4 py-2 font-medium text-navy">{role.name}</td>
                      <td className="px-4 py-2 text-stone-600">
                        {ROLE_DEFINITIONS.find((definition) => definition.slug === role.slug)?.scope ?? "organisation"}
                      </td>
                      <td className="px-4 py-2 text-stone-600">{role.level}</td>
                      <td className="px-4 py-2 text-[10px] text-stone-500">{role.permissions.length}</td>
                      <td className="px-4 py-2 text-stone-600">{role.members}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/admin/people" className="flex items-center justify-between border-t border-navy/8 px-5 py-2.5 text-[11px] font-semibold text-gold-dark">
              <span>Assign roles & manage organisations</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Assessment engine results</p>
            </div>
            <ul className="divide-y divide-navy/8">
              {instrumentResults.map((row) => (
                <li key={row.result.id} className="px-5 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-semibold text-navy">{row.result.overallScore}</span>
                    <p className="min-w-0 flex-1 truncate text-[11.5px] text-navy">
                      {row.studentName} · {row.instrumentTitle}
                    </p>
                    <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-500">v{row.version} · {row.result.bandLabel}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.result.dimensions.map((dimension) => (
                      <span key={dimension.slug} className="rounded bg-cream px-1.5 py-0.5 text-[9px] text-stone-600">
                        {dimension.name} {dimension.score}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
              {instrumentResults.length === 0 ? <li className="px-5 py-4 text-[12px] text-stone-500">No results yet.</li> : null}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="admin-card p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">Create a cohort</p>
            <div className="mt-2">
              <CohortForm levels={levels.map((level) => ({ id: level.id, name: level.name }))} />
            </div>
          </div>

          <div className="admin-card p-4">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
              <Building2 className="h-3.5 w-3.5 text-gold-dark" /> Organisations
            </p>
            <ul className="mt-2 space-y-1">
              {organizations.map((row) => (
                <li key={row.organization.id} className="flex items-center justify-between gap-2 border-b border-navy/8 py-1 text-[11.5px]">
                  <span className="text-navy">{row.organization.name}</span>
                  <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-500">{row.organization.plan} · {row.memberCount}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2"><OrgForm /></div>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-4 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Moderation reports
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {reports.slice(0, 6).map((row) => (
                <li key={row.report.id} className="px-4 py-2">
                  <p className="text-[11.5px] font-medium text-navy">{row.report.reason} · {row.report.targetType} #{row.report.targetId}</p>
                  <p className="text-[10px] text-stone-500">{row.reporterName ?? "Anonymous"} · {formatDateTime(row.report.createdAt)}</p>
                  {row.report.status === "open" ? (
                    <form action={resolveReport} className="mt-1 flex gap-1">
                      <input type="hidden" name="reportId" value={row.report.id} />
                      <input name="moderatorNote" placeholder="Action taken" className="h-7 flex-1 rounded border border-navy/15 px-2 text-[10.5px]" />
                      <button type="submit" className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold text-paper">Resolve</button>
                    </form>
                  ) : (
                    <p className="text-[10px] text-source">resolved</p>
                  )}
                </li>
              ))}
              {reports.length === 0 ? <li className="px-4 py-4 text-[12px] text-stone-500">No reports. The rooms are healthy.</li> : null}
            </ul>
            <Link href="/admin/community" className="flex items-center justify-between border-t border-navy/8 px-4 py-2 text-[10.5px] font-semibold text-gold-dark">
              Community moderation <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-4 py-3">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                <Bell className="h-3.5 w-3.5 text-gold-dark" /> Notification outbox
              </p>
            </div>
            <ul className="divide-y divide-navy/8">
              {outbox.map((row) => (
                <li key={row.outbox.id} className="px-4 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-[11.5px] text-navy">{row.outbox.subject}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${row.outbox.status === "sent" ? "bg-source/10 text-source" : "bg-cream text-stone-600"}`}>
                      {row.outbox.channel}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500">{row.recipient} · {row.outbox.templateKey}</p>
                  {row.outbox.status === "queued" ? (
                    <form action={markOutboxDelivered} className="mt-0.5">
                      <input type="hidden" name="outboxId" value={row.outbox.id} />
                      <button type="submit" className="text-[10px] font-semibold text-gold-dark hover:underline">Mark dispatched</button>
                    </form>
                  ) : null}
                </li>
              ))}
              {outbox.length === 0 ? <li className="px-4 py-4 text-[12px] text-stone-500">Outbox is empty.</li> : null}
            </ul>
          </div>

          <div className="admin-card p-4 text-[11px] leading-relaxed text-stone-600">
            <p className="inline-flex items-center gap-1.5 font-semibold text-navy">
              <Users className="h-3.5 w-3.5 text-gold-dark" /> Attendance
            </p>
            <p className="mt-1">
              Mark attendance from the mentor desk. {attendance.length} records are visible for session review; cohort
              attendance rolls into learner progress and certificate eligibility.
            </p>
            <Link href="/mentor/learners" className="mt-2 inline-flex font-semibold text-gold-dark hover:underline">
              Open mentor desk →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
