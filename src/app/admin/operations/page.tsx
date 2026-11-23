import Link from "next/link";
import { requireAdminPage } from "@/lib/page-access";
import { getOperationsStatus } from "@/db/operations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations" };
export default async function OperationsPage() {
  await requireAdminPage("/admin/operations");
  const status = await getOperationsStatus();
  const checks = [
    ["Enrolments needing identity or level review", status.counts.invalid_enrolments, "/admin/enrollments"],
    ["Enrolments with account email mismatch", status.counts.email_mismatches, "/admin/enrollments"],
    ["Expired sessions awaiting housekeeping", status.counts.stale_live_sessions, "/admin/academy/live"],
    ["Overdue scheduled publications", status.counts.overdue_publications, "/admin/articles"],
    ["Failed or uncertain email sends", status.counts.email_attention, "/admin/notifications"],
    ["Emails queued longer than 15 minutes", status.counts.old_queued_email, "/admin/notifications"],
  ] as const;
  return <div className="space-y-5">
    <div><h1 className="font-serif text-3xl text-navy">Operations</h1><p className="mt-2 text-sm text-stone-600">Review exceptions that need attention from the programme team. Refresh to check the latest state.</p></div>
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{checks.map(([label, count, href]) => <div key={label} className="admin-card p-5"><dt className="text-sm text-stone-600">{label}</dt><dd className={`mt-2 text-3xl font-semibold ${count ? "text-amber-700" : "text-source"}`}>{count}</dd><Link href={href} className="mt-3 inline-block text-sm font-semibold text-gold-dark underline">Review</Link></div>)}</dl>
    <section className="admin-card space-y-3 p-5"><h2 className="font-serif text-xl text-navy">Service configuration</h2>
      <p className="text-sm text-stone-600">Account email: {status.emailConfigured ? "configured — verify real delivery in Notifications" : "sender configuration incomplete"}.</p>
      <p className="text-sm text-stone-600">Live meetings: {status.nativeVideoReady ? "in-platform room available" : "platform conference relay is not configured"}.</p>
      <p className="text-xs text-stone-500">Last checked: {status.checkedAt}. Backup and restore evidence is retained privately by the operator; this page does not certify backup retention or recovery readiness.</p>
    </section>
  </div>;
}
