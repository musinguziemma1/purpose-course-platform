import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { workspaceLabelForRole } from "@/lib/roles";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        user={user ? { fullName: user.fullName, roleSlug: user.roleSlug, profileId: user.profileId } : null}
        dashboardHref={user ? homePathForRole(user.roleSlug) : "/login"}
        dashboardLabel={workspaceLabelForRole(user?.roleSlug)}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
