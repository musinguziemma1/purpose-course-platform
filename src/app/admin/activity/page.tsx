import { requireAdminPage } from "@/lib/page-access";
import { Activity, BookOpenText } from "lucide-react";
import { getActivityLogs } from "@/db/queries";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { ConsoleEmpty, ConsoleHeader, Panel, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Activity log" };

export default async function AdminActivityPage() {
  await requireAdminPage("/admin/activity");
  const logs = await getActivityLogs(80);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Audit trail"
        title="Activity log"
        description="An append-only record of editorial, community and audience events. Useful for handovers and accountability."
      />

      {logs.length === 0 ? (
        <ConsoleEmpty icon={Activity} title="No activity recorded yet." />
      ) : (
        <Panel title="Logbook" description={`Latest ${logs.length} entries, newest first.`} icon={BookOpenText}>
          <ol className="k-ledger k-stagger">
            {logs.map((log, index) => (
              <li key={log.id} style={staggerStyle(index)} className="flex gap-3 py-3.5 pl-[1.45rem] pr-5">
                <span aria-hidden className="k-rivet mt-1" />
                <div className="min-w-0 flex-1 pl-6">
                  <p className="text-[14px] leading-relaxed text-stone-800">{log.description}</p>
                  <p className="mt-0.5 text-[11.5px] uppercase tracking-[0.1em] text-stone-500">
                    <span className="k-mono normal-case tracking-normal text-navy">{log.action}</span> · {log.actorName ?? "System"}
                    {log.actorRole ? ` (${log.actorRole})` : ""} · <time dateTime={new Date(log.createdAt).toISOString()}>{formatDateTime(log.createdAt)}</time>
                  </p>
                </div>
                <span className="hidden shrink-0 pt-0.5 text-[12px] text-stone-500 sm:block">{relativeTime(log.createdAt)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
