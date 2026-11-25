import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { count, eq, inArray } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { db } from "@/db";
import { admissionRequests, articles, contactEnquiries } from "@/db/schema";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { hasAdminWorkspace } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { profileIsComplete } from "@/lib/profile";
import { adminNavigation, workspacesFor } from "@/lib/navigation";
import "./console.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "Admin console", template: "%s · Purpose Course Admin" },
  robots: { index: false, follow: false },
};

const zero = [{ value: 0 }];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!hasAdminWorkspace(user)) redirect(homePathForRole(user.roleSlug));
  if (!user.isDemo && !profileIsComplete(user)) redirect("/account?complete=1");

  const [reviews, admissions, enquiries] = await Promise.all([
    can(user, "content.review")
      ? db.select({ value: count() }).from(articles).where(inArray(articles.status, ["submitted", "in_review", "approved"])).catch(() => zero)
      : zero,
    can(user, "people.manage") || can(user, "cohort.manage")
      ? db.select({ value: count() }).from(admissionRequests).where(eq(admissionRequests.status, "pending")).catch(() => zero)
      : zero,
    can(user, "contact.manage")
      ? db.select({ value: count() }).from(contactEnquiries).where(eq(contactEnquiries.status, "new")).catch(() => zero)
      : zero,
  ]);

  const banners = (
    <>
      {user.isDemoAccount ? <p className="flex items-center gap-2 border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-[13px] text-navy sm:px-6"><span aria-hidden className="k-led k-led-gold" />Demo account · Use practice records while exploring. This account has Super Admin permissions.</p> : null}
      {user.roleSlug === "author" ? (
        <p className="flex items-center gap-2 border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-[13px] text-stone-700 sm:px-6">
          <ShieldAlert aria-hidden className="h-4 w-4 text-gold-dark" />
          You are signed in as an author: draft, edit and submit your own articles. Editors review and publish them.
        </p>
      ) : null}
    </>
  );

  return (
    <WorkspaceShell
      sections={adminNavigation(user, {
        reviews: Number(reviews[0]?.value ?? 0),
        admissions: Number(admissions[0]?.value ?? 0),
        enquiries: Number(enquiries[0]?.value ?? 0),
      })}
      user={{ profileId: user.profileId, fullName: user.fullName, roleName: user.roleName, title: user.title }}
      workspaceName="Admin console"
      workspaceHome="/admin"
      workspaces={workspacesFor(user)}
      accent="gold"
      reviewMode={Boolean(user.isDemo)}
      banner={banners}
      skin="console"
    >
      {children}
    </WorkspaceShell>
  );
}
