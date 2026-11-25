import { requireAdminPage } from "@/lib/page-access";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, KeyRound, Mail, MailPlus, Send, UserRound } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accountInvitations, profiles, roles, users } from "@/db/schema";
import { canAssignRole } from "@/lib/admin-access";
import { emailConfigurationError } from "@/lib/email";
import { revokeAccountInvitation } from "@/app/actions/people";
import { canManagePeople, getSessionUser, homePathForRole } from "@/lib/auth";
import { ROLE_CATALOG } from "@/lib/roles";
import { getOrganizations } from "@/db/learning";
import { isDemoEnabled } from "@/lib/demo";
import { InviteForm, RoleForm } from "@/components/admin/people-forms";
import { formatDate, initials } from "@/lib/utils";
import { Led, Odometer, type LedTone } from "@/components/admin/console/instruments";
import { ConsoleHeader, Panel, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "People & access" };

const INVITE_LED: Record<string, LedTone> = { Accepted: "green", Pending: "gold", Revoked: "red", Expired: "off" };

export default async function AdminPeoplePage() {
  await requireAdminPage("/admin/people");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canManagePeople(user)) redirect("/admin");

  const organizations = await getOrganizations().catch(() => []);
  const [directory, roleRows] = await Promise.all([
    db
      .select({
        profileId: profiles.id,
        fullName: profiles.fullName,
        title: profiles.title,
        email: users.email,
        roleSlug: roles.slug,
        roleName: roles.name,
        createdAt: profiles.createdAt,
        isActive: users.isActive,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .innerJoin(roles, eq(profiles.roleId, roles.id))
      .orderBy(asc(profiles.createdAt)),
    db.select().from(roles).orderBy(asc(roles.level)),
  ]);

  const roleOptions = roleRows.filter((role) => canAssignRole(user, "guest", role.slug)).map((role) => ({ slug: role.slug, name: role.name }));
  const invitations = await db.select().from(accountInvitations).orderBy(asc(accountInvitations.createdAt)).limit(50);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Identity & access"
        title="People & access"
        description="Five workspaces share one identity system. Change a role here and the person's next sign-in lands in the right dashboard."
      />

      <ul className="k-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Roles">
        {ROLE_CATALOG.map((role, index) => {
          const count = directory.filter((member) => member.roleSlug === role.slug).length;
          return (
            <li key={role.slug} style={staggerStyle(index)} className="admin-card k-idcard flex flex-col px-4 pb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="ui-badge rounded-full border border-navy/10 bg-cream px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-700">
                  level {role.level}
                </span>
                <span className="text-[1.5rem] text-navy">
                  <Odometer value={count} />
                </span>
              </div>
              <p className="mt-2 font-serif text-[17px] text-navy">{role.name}</p>
              <p className="mt-0.5 flex-1 text-[12.5px] leading-relaxed text-stone-600">{role.blurb}</p>
              <Link
                href={role.workspace}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.08em] text-gold-dark hover:underline"
              >
                {role.workspaceLabel} <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <Panel title="Accounts" icon={UserRound} action={<span className="text-[12.5px] text-stone-600">{directory.length} profiles</span>}>
          <ul className="divide-y divide-navy/8">
            {directory.map((member) => (
              <li key={member.profileId} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
                <span aria-hidden className="k-coin">{initials(member.fullName)}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-navy">
                    {member.fullName}
                    {member.profileId === user.profileId ? (
                      <span className="text-[11px] font-normal uppercase tracking-[0.08em] text-stone-500">(you)</span>
                    ) : null}
                    {!member.isActive ? <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700">inactive</span> : null}
                  </p>
                  <p className="flex items-center gap-1 break-all text-[12.5px] text-stone-600">
                    <Mail aria-hidden className="h-3 w-3 shrink-0" /> {member.email} · joined {formatDate(member.createdAt, "short")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RoleForm
                    profileId={member.profileId}
                    currentRole={member.roleSlug}
                    roles={roleOptions}
                    disabled={member.profileId === user.profileId || !canAssignRole(user, member.roleSlug, member.roleSlug)}
                  />
                  <Link
                    href={homePathForRole(member.roleSlug)}
                    className="inline-flex items-center gap-1 text-[11.5px] uppercase tracking-[0.08em] text-stone-500 hover:text-gold-dark"
                  >
                    {member.roleSlug} workspace <ArrowRight aria-hidden className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title="Invite a colleague" icon={MailPlus} riveted bodyClassName="px-5 pb-6 pt-4">
            <InviteForm roles={roleOptions.filter((role) => role.slug !== "guest")} configurationError={emailConfigurationError()} />
          </Panel>

          <Panel title="Recent invitations" icon={Send}>
            <ul className="divide-y divide-navy/8">
              {invitations.map((invitation) => {
                const status = invitation.acceptedAt ? "Accepted" : invitation.revokedAt ? "Revoked" : invitation.expiresAt < new Date() ? "Expired" : "Pending";
                const role = roleRows.find((role) => role.id === invitation.roleId);
                return (
                  <li key={invitation.id} className="flex gap-3 break-words px-5 py-3">
                    <Led tone={INVITE_LED[status]} className="mt-1.5" />
                    <div className="min-w-0 flex-1 text-[13px]">
                      <p className="font-medium text-navy">{invitation.email}</p>
                      <p className="text-stone-600">
                        {role?.name} · {status} · expires {formatDate(invitation.expiresAt)}
                      </p>
                      {status === "Pending" && role && canAssignRole(user, "guest", role.slug) ? (
                        <form action={revokeAccountInvitation}>
                          <input type="hidden" name="invitationId" value={invitation.id} />
                          <button type="submit" className="mt-1 font-semibold text-rose-700 underline underline-offset-2">
                            Revoke invitation
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
              {!invitations.length ? <li className="px-5 py-4 text-[13px] text-stone-600">No invitations yet.</li> : null}
            </ul>
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
              {organizations.length === 0 ? <li className="py-2 text-[13px] text-stone-600">No organisations yet.</li> : null}
            </ul>
            <p className="mt-2 text-[12.5px] text-stone-600">This launch serves one organisation. Additional organisations are not enabled.</p>
          </Panel>

          {isDemoEnabled() ? (
            <Panel title="Demo access" icon={KeyRound} bodyClassName="px-5 py-3">
              <ul className="divide-y divide-navy/8 text-[13px] text-stone-700">
                {[
                  ["admin@purposecourse.org", "Administrator"],
                  ["editor@purposecourse.org", "Editor"],
                  ["author@purposecourse.org", "Author"],
                  ["mentor@purposecourse.org", "Mentor"],
                  ["student@purposecourse.org", "Student"],
                ].map(([email, role]) => (
                  <li key={email} className="flex items-center justify-between gap-2 py-2">
                    <code className="k-mono text-navy">{email}</code>
                    <span className="text-[11.5px] uppercase tracking-[0.08em] text-stone-600">{role}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-gold-dark hover:underline">
                Open one-click sign-in <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
