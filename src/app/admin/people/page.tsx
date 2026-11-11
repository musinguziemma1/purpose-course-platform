import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, KeyRound, Mail, UserRound } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, roles, users } from "@/db/schema";
import { canManagePeople, getSessionUser, homePathForRole } from "@/lib/auth";
import { ROLE_CATALOG } from "@/lib/roles";
import { getOrganizations } from "@/db/learning";
import { OrgForm } from "@/components/platform/forms";
import { InviteForm, RoleForm } from "@/components/admin/people-forms";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "People & access" };

export default async function AdminPeoplePage() {
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

  const roleOptions = roleRows.map((role) => ({ slug: role.slug, name: role.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">People & access</h1>
        <p className="text-[12.5px] text-stone-600">
          Five workspaces share one identity system. Change a role here and the person&apos;s next sign-in lands in the
          right dashboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ROLE_CATALOG.map((role) => {
          const count = directory.filter((member) => member.roleSlug === role.slug).length;
          return (
            <div key={role.slug} className="admin-card p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                  level {role.level}
                </span>
                <span className="font-serif text-lg text-navy">{count}</span>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-navy">{role.name}</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-stone-500">{role.blurb}</p>
              <Link
                href={role.workspace}
                className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gold-dark hover:underline"
              >
                {role.workspaceLabel} <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3.5">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
              <UserRound className="h-3.5 w-3.5 text-gold-dark" /> Accounts
            </p>
            <span className="text-[11px] text-stone-500">{directory.length} profiles</span>
          </div>
          <ul className="divide-y divide-navy/8">
            {directory.map((member) => (
              <li key={member.profileId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-[11px] font-semibold text-paper">
                  {member.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-navy">
                    {member.fullName}
                    {member.profileId === user.profileId ? (
                      <span className="ml-1.5 text-[10px] font-normal uppercase tracking-[0.08em] text-stone-400">(you)</span>
                    ) : null}
                  </p>
                  <p className="inline-flex items-center gap-1 text-[10.5px] text-stone-500">
                    <Mail className="h-2.5 w-2.5" /> {member.email} · joined {formatDate(member.createdAt, "short")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RoleForm
                    profileId={member.profileId}
                    currentRole={member.roleSlug}
                    roles={roleOptions}
                    disabled={member.profileId === user.profileId}
                  />
                  <Link
                    href={homePathForRole(member.roleSlug)}
                    className="text-[10px] uppercase tracking-[0.08em] text-stone-400 hover:text-gold-dark"
                  >
                    {member.roleSlug} workspace →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5">
          <div className="admin-card p-5">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
              <Mail className="h-3.5 w-3.5 text-gold-dark" /> Invite a colleague
            </p>
            <div className="mt-3">
              <InviteForm roles={roleOptions} />
            </div>
          </div>

          <div className="admin-card p-5">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
              <UserRound className="h-3.5 w-3.5 text-gold-dark" /> Organisations
            </p>
            <ul className="mt-2 space-y-1">
              {organizations.map((row) => (
                <li key={row.organization.id} className="flex items-center justify-between gap-2 border-b border-navy/8 py-1 text-[11.5px]">
                  <span className="text-navy">{row.organization.name}</span>
                  <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-500">{row.organization.plan} · {row.memberCount}</span>
                </li>
              ))}
              {organizations.length === 0 ? <li className="text-[11.5px] text-stone-500">No organisations yet.</li> : null}
            </ul>
            <div className="mt-2"><OrgForm /></div>
          </div>

          <div className="admin-card p-5">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">
              <KeyRound className="h-3.5 w-3.5 text-gold-dark" /> Demo access
            </p>
            <ul className="mt-2 space-y-1.5 text-[11.5px] text-stone-700">
              {[
                ["admin@purposecourse.org", "Administrator"],
                ["editor@purposecourse.org", "Editor"],
                ["author@purposecourse.org", "Author"],
                ["mentor@purposecourse.org", "Mentor"],
                ["student@purposecourse.org", "Student"],
              ].map(([email, role]) => (
                <li key={email} className="flex items-center justify-between gap-2 border-b border-navy/8 pb-1.5 last:border-0 last:pb-0">
                  <code className="text-[10.5px] text-navy">{email}</code>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-stone-500">{role}</span>
                </li>
              ))}
            </ul>
            <Link href="/login" className="mt-3 inline-flex text-[11px] font-semibold text-gold-dark hover:underline">
              Open one-click sign-in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
