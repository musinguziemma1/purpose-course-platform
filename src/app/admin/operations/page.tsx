import Link from "next/link";
import { ArrowRight, Server } from "lucide-react";
import { requireAdminPage } from "@/lib/page-access";
import { getOperationsStatus } from "@/db/operations";
import { Lcd, Led, Odometer } from "@/components/admin/console/instruments";
import { ConsoleHeader, Panel, Plate, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

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
  const attention = checks.filter(([, count]) => Number(count) > 0).length;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Service desk"
        title="Operations"
        description="Review exceptions that need attention from the programme team. Refresh to check the latest state."
      />

      <section aria-labelledby="exceptions-heading" className="k-leather p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Plate>Exceptions board</Plate>
            <h2 id="exceptions-heading" className="mt-3 flex items-center gap-2.5 font-serif text-[1.45rem] text-paper">
              <Led tone={attention ? "amber" : "green"} pulse={attention > 0} />
              {attention ? `${attention} ${attention === 1 ? "check needs" : "checks need"} attention` : "All clear"}
            </h2>
          </div>
          <p className="text-[12.5px] text-paper/65">Last checked {status.checkedAt}</p>
        </div>
        <dl className="k-stagger mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {checks.map(([label, count, href], index) => {
            const value = Number(count);
            return (
              <div key={label} style={staggerStyle(index)} className="k-leather-tile flex flex-col gap-4 p-4">
                <dt className="flex items-start gap-2.5 text-[13.5px] leading-snug text-paper/85">
                  <Led tone={value ? "amber" : "green"} pulse={value > 0} className="mt-1" />
                  <span>
                    {label}
                    <span className="sr-only">{value ? ": needs attention" : ": clear"}</span>
                  </span>
                </dt>
                <dd className="mt-auto flex items-end justify-between gap-3">
                  <Lcd alert={value > 0} className="text-[1.6rem]">
                    <Odometer value={value} />
                  </Lcd>
                  <Link href={href} className={keyClass("ghost", "sm")}>
                    Review <ArrowRight aria-hidden />
                  </Link>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <Panel title="Service configuration" icon={Server} riveted bodyClassName="px-5 pb-6 pt-4 sm:px-7">
        <ul className="divide-y divide-navy/8">
          <li className="flex items-start gap-3 py-3">
            <Led tone={status.emailConfigured ? "green" : "amber"} className="mt-1.5" />
            <p className="text-[14px] text-stone-700">
              <span className="font-semibold text-navy">Account email:</span>{" "}
              {status.emailConfigured ? "configured — verify real delivery in Notifications" : "sender configuration incomplete"}.
            </p>
          </li>
          <li className="flex items-start gap-3 py-3">
            <Led tone={status.nativeVideoReady ? "green" : "amber"} className="mt-1.5" />
            <p className="text-[14px] text-stone-700">
              <span className="font-semibold text-navy">Live meetings:</span>{" "}
              {status.nativeVideoReady
                ? "in-platform room available"
                : "platform conference relay is not configured; add server-only TURN_URL with TURN_SECRET (preferred) or TURN_USERNAME and TURN_CREDENTIAL, then redeploy"}
              .
            </p>
          </li>
        </ul>
        <h3 className="mt-4 text-[11.5px] font-bold uppercase tracking-[0.14em] text-stone-600">Database migrations</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2" aria-label="Database migrations">
          {status.features.map((item) => (
            <li key={item.feature} className="flex items-start gap-2.5 rounded-xl bg-cream/60 px-3 py-2.5 text-[13.5px] text-stone-700 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">
              <Led tone={item.ready ? "green" : "amber"} className="mt-1" />
              <span>
                <span className="font-semibold text-navy">{item.feature}:</span>{" "}
                {item.ready ? "database ready" : `waiting for migration (missing ${item.missing.join(", ")}); run npm run db:migrate:supabase apply`}.
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] leading-relaxed text-stone-600">
          Last checked: {status.checkedAt}. Backup and restore evidence is retained privately by the operator; this page does not certify backup retention or recovery readiness.
        </p>
      </Panel>
    </div>
  );
}
