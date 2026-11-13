import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { LogOut, ShieldAlert, Sparkles } from "lucide-react";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandPalette } from "@/components/platform/command-palette";
import { logoutAction } from "@/app/actions/auth";
import { canAccessAdminPath, hasAdminWorkspace } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { profileIsComplete } from "@/lib/profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "Editorial desk", template: "%s · Purpose Course Editorial" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!hasAdminWorkspace(user)) redirect(homePathForRole(user.roleSlug));
  if (!user.isDemo && !profileIsComplete(user)) redirect("/account?complete=1");

  const pending = can(user, "content.review") ? await db
    .select({ value: count() })
    .from(articles)
    .where(and(inArray(articles.status, ["submitted", "in_review", "approved"])))
    .catch(() => [{ value: 0 }]) : [{ value: 0 }];

  return (
    <div className="min-h-screen bg-[#f6f2e9] lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 self-start overflow-hidden bg-ink lg:block">
        <AdminNav
          user={{ fullName: user.fullName, roleName: user.roleName, roleSlug: user.roleSlug, email: user.email, permissions: user.permissions }}
          pendingReviews={Number(pending[0]?.value ?? 0)}
          reviewMode={Boolean(user.isDemo)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {user.isDemoAccount ? <p className="border-b border-gold/30 bg-gold/10 px-4 py-3 text-sm text-navy">Demo account · Use your practice records while exploring. This account has Super Admin permissions.</p> : null}
        {user.isDemo ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-gold/40 bg-gold/15 px-4 py-2 text-[11.5px] text-stone-700">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.1em] text-gold-dark">
              <Sparkles className="h-3.5 w-3.5" /> Review mode
            </span>
            <span>
              You are reviewing the {user.roleName.toLowerCase()} workspace as{" "}
              <strong className="text-navy">{user.fullName}</strong> — demo data, no sign-in required.
            </span>
            <Link href="/login" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
              Switch role or sign in
            </Link>
          </div>
        ) : null}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-navy/10 bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-[11px] font-bold text-gold">PC</span>
            <span className="font-serif text-sm text-navy">Editorial desk</span>
          </Link>
          <div className="flex items-center gap-2">
            <CommandPalette signedIn />
            <span className="hidden rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-navy sm:inline">
              {user.roleName}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-navy/15 text-navy">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </header>

        <div className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-navy/10 bg-paper px-3 py-2 lg:hidden">
          {[
            ["/admin", "Overview"],
            ["/admin/articles", "Articles"],
            ["/admin/reviews", "Reviews"],
            ["/admin/academy", "Academy"],
            ["/admin/academy/live", "Live"],
            ["/admin/academy/assessments", "Assessments"],
            ["/admin/students", "Audience"],
            ["/admin/people", "People"],
            ["/admin/programme", "Programme"],
            ["/admin/analytics", "Analytics"],
            ["/admin/notifications", "Notifications"],
            ["/admin/contact", "Contact inbox"],
            ["/admin/community", "Community"],
            ["/admin/activity", "Activity"],
            ["/admin/settings", "Settings"],
          ].filter(([href]) => canAccessAdminPath(user, href)).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-full border border-navy/10 px-3 py-1.5 text-[11.5px] font-medium text-navy"
            >
              {label}
            </Link>
          ))}
        </div>

        {user.roleSlug === "author" ? (
          <div className="flex items-center gap-2 border-b border-gold/30 bg-gold/10 px-5 py-2 text-[11.5px] text-stone-700">
            <ShieldAlert className="h-3.5 w-3.5 text-gold-dark" />
            You are signed in as an author — you can draft, edit and submit your own articles. Reviews are handled at
            editor level.
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
