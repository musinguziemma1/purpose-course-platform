import { requireAdminPage } from "@/lib/page-access";
import { Lock, ShieldCheck } from "lucide-react";
import { getSiteSettings, getTeam } from "@/db/queries";
import { getSessionUser, canManageSettings } from "@/lib/auth";
import { updateSettings } from "@/app/actions/site";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { AccountSettings } from "@/components/auth/account-settings";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

const SETTING_GROUPS: { title: string; fields: { key: string; label: string; hint?: string; long?: boolean }[] }[] = [
  {
    title: "Identity",
    fields: [
      { key: "site_name", label: "Site name" },
      { key: "tagline", label: "Tagline" },
      { key: "newsletter_name", label: "Newsletter name" },
    ],
  },
  {
    title: "Homepage",
    fields: [
      { key: "hero_headline", label: "Hero headline" },
      { key: "hero_subhead", label: "Hero subheading", long: true },
    ],
  },
  {
    title: "Programme",
    fields: [
      { key: "cohort_name", label: "Next cohort" },
      { key: "enrollment_status", label: "Enrolment status" },
      { key: "total_weeks", label: "Duration (weeks)", hint: "numeric" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "contact_email", label: "Primary email" },
      { key: "contact_email_secondary", label: "Secondary email" },
      { key: "contact_phone", label: "Phone" },
      { key: "location", label: "Location" },
    ],
  },
];

export default async function AdminSettingsPage() {
  await requireAdminPage("/admin/settings");
  const [settings, user, team] = await Promise.all([getSiteSettings(), getSessionUser(), getTeam()]);
  const canEdit = canManageSettings(user);
  const activeProfiles = await db.select({ id: profiles.id, completedAt: profiles.profileCompletedAt }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).where(eq(users.isActive, true));
  const incompleteIds = new Set(activeProfiles.filter(row => !row.completedAt).map(row => row.id));

  return (
    <div className="space-y-5">
      {user ? <AccountSettings user={user} /> : null}
      <section className="admin-card p-5"><h2 className="font-serif text-xl text-navy">Profile completion reminders</h2><p className="mt-2 text-sm text-stone-600">{team.filter(member => incompleteIds.has(member.id)).length} of {activeProfiles.length} active people still need to complete their profile. They receive a required reminder when they sign in.</p><ul className="mt-3 space-y-1 text-sm text-stone-600">{team.filter(member => incompleteIds.has(member.id)).map(member => <li key={member.id}>{member.fullName} · {member.roleName}</li>)}</ul></section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Site settings</h1>
          <p className="text-[12.5px] text-stone-600">
            Global copy and contact details used across the website, emails and metadata.
          </p>
        </div>
        {!canEdit ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-800">
            <Lock className="h-3 w-3" /> Administrator access required to edit
          </span>
        ) : null}
      </div>

      <form action={updateSettings} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {SETTING_GROUPS.map((group) => (
            <div key={group.title} className="admin-card p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">{group.title}</p>
              <div className="mt-3 space-y-3">
                {group.fields.map((field) => (
                  <Field key={field.key} label={field.label} hint={field.hint}>
                    <Input
                      name={`setting.${field.key}`}
                      defaultValue={settings[field.key] ?? ""}
                      disabled={!canEdit}
                      className={field.long ? "h-16 py-2" : ""}
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </div>

        {canEdit ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-[12.5px] font-semibold text-paper hover:bg-navy-700"
            >
              <ShieldCheck className="h-4 w-4" /> Save settings
            </button>
          </div>
        ) : null}
      </form>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">People & roles</p>
          <Badge variant="outline">{team.length} profiles</Badge>
        </div>
        <ul className="divide-y divide-navy/8">
          {team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div>
                <p className="text-[12.5px] font-medium text-navy">{member.fullName}</p>
                <p className="text-[10.5px] text-stone-500">{member.title}</p>
              </div>
              <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                {member.roleName}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-navy/10 bg-cream/40 px-5 py-3 text-[11px] leading-relaxed text-stone-600">
          Authentication credentials live in a separate <code className="rounded bg-white px-1">users</code> table from
          public profiles. Passwords are hashed with scrypt and sessions are stored server-side with an http-only cookie.
        </div>
      </div>
    </div>
  );
}
