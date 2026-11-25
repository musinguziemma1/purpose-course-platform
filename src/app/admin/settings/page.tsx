import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { Activity, Lock, ShieldCheck, UserCheck, Users } from "lucide-react";
import { getSiteSettings, getTeam } from "@/db/queries";
import { getSessionUser, canManageSettings } from "@/lib/auth";
import { updateSettings } from "@/app/actions/site";
import { Field, Input } from "@/components/ui/field";
import { AccountSettings } from "@/components/auth/account-settings";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { initials } from "@/lib/utils";
import { GlassMeter } from "@/components/admin/console/instruments";
import { Caption, ConsoleHeader, Panel, keyClass } from "@/components/admin/console/surfaces";

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
  const incomplete = team.filter(member => incompleteIds.has(member.id));

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Configuration"
        title="Settings"
        description="Your own account, profile reminders for the team, and the global copy and contact details used across the website, emails and metadata."
        actions={
          <Link href="/admin/operations" className={keyClass("paper")}>
            <Activity aria-hidden /> Service health and exceptions
          </Link>
        }
      />

      {user ? <AccountSettings user={user} headerless /> : null}

      <Panel title="Profile completion reminders" icon={UserCheck} bodyClassName="px-5 py-4">
        <p className="text-[14px] text-stone-700">
          {incomplete.length} of {activeProfiles.length} active people still need to complete their profile. They receive a required reminder when they sign in.
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
          <GlassMeter
            value={activeProfiles.length - incomplete.length}
            max={Math.max(activeProfiles.length, 1)}
            tone="source"
            label="Profiles complete"
          />
          <span className="numeric text-[13px] font-semibold text-navy">
            {activeProfiles.length - incomplete.length}/{activeProfiles.length} complete
          </span>
        </div>
        {incomplete.length ? (
          <ul className="mt-3 flex flex-wrap gap-2 text-[13px] text-stone-700">
            {incomplete.map(member => (
              <li key={member.id} className="ui-badge rounded-full border border-navy/10 bg-cream px-3 py-1">
                {member.fullName} · {member.roleName}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <section aria-labelledby="site-settings-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Caption>Website</Caption>
            <h2 id="site-settings-heading" className="mt-1 font-serif text-[1.6rem] text-navy">
              Site settings
            </h2>
            <p className="text-[14px] text-stone-600">Global copy and contact details used across the website, emails and metadata.</p>
          </div>
          {!canEdit ? (
            <span className="ui-badge inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12.5px] text-amber-900">
              <Lock aria-hidden className="h-3.5 w-3.5" /> Administrator access required to edit
            </span>
          ) : null}
        </div>

        <form action={updateSettings} className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {SETTING_GROUPS.map((group) => (
              <Panel key={group.title} title={group.title} riveted bodyClassName="space-y-3 px-6 pb-6 pt-4">
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
              </Panel>
            ))}
          </div>

          {canEdit ? (
            <div className="flex items-center justify-end gap-2">
              <button type="submit" className={keyClass("navy")}>
                <ShieldCheck aria-hidden /> Save settings
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <Panel
        title="People & roles"
        icon={Users}
        action={<span className="ui-badge rounded-full border border-navy/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-navy">{team.length} profiles</span>}
      >
        <ul className="divide-y divide-navy/8">
          {team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span aria-hidden className="k-coin">{initials(member.fullName)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-navy">{member.fullName}</p>
                <p className="text-[12.5px] text-stone-600">{member.title}</p>
              </div>
              <span className="ui-badge rounded-full border border-navy/10 bg-cream px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-700">
                {member.roleName}
              </span>
            </li>
          ))}
        </ul>
        <div className="k-strip border-t border-navy/10 px-5 py-3 text-[12.5px] leading-relaxed text-stone-600">
          Authentication credentials live in a separate <code className="rounded bg-white px-1">users</code> table from
          public profiles. Passwords are hashed with scrypt and sessions are stored server-side with an http-only cookie.
        </div>
      </Panel>
    </div>
  );
}
