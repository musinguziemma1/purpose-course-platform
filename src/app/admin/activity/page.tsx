import { requireAdminPage } from "@/lib/page-access";
import { Activity } from "lucide-react";
import { getActivityLogs } from "@/db/queries";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Activity log" };

export default async function AdminActivityPage() {
  await requireAdminPage("/admin/activity");
  const logs = await getActivityLogs(80);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Activity log</h1>
        <p className="text-[12.5px] text-stone-600">
          An append-only record of editorial, community and audience events. Useful for handovers and accountability.
        </p>
      </div>

      <div className="admin-card overflow-hidden">
        {logs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-stone-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-navy/8">
            {logs.map((log) => (
              <li key={log.id} className="flex gap-3 px-5 py-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-gold-dark">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-relaxed text-stone-700">{log.description}</p>
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-stone-400">
                    {log.action} · {log.actorName ?? "System"}
                    {log.actorRole ? ` (${log.actorRole})` : ""} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-[10.5px] text-stone-400">{relativeTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
