import { requireAdminPage } from "@/lib/page-access";
import { CheckCircle2, Download, GraduationCap, Hourglass, Mail, PieChart, Send, Users } from "lucide-react";
import { getEnrollments, getNewsletterPrincipleCounts, getSubscribers } from "@/db/queries";
import { formatDate } from "@/lib/utils";
import { GlassMeter } from "@/components/admin/console/instruments";
import { ConsoleHeader, MetricTile, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audience & students" };

export default async function AdminStudentsPage() {
  await requireAdminPage("/admin/students");
  const [enrollments, subscribers, principleCounts] = await Promise.all([
    getEnrollments(100),
    getSubscribers(200),
    getNewsletterPrincipleCounts(),
  ]);

  const waitlist = enrollments.filter((item) => item.status === "waitlist");
  const principleTotal = Math.max(principleCounts.reduce((sum, item) => sum + Number(item.value), 0), 1);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Audience"
        title="Audience & students"
        description="The bridge from reader to learner: newsletter subscribers, resource downloads and the Academy waitlist."
        actions={
          <a href="/api/subscribers/export" className={keyClass("paper")}>
            <Download aria-hidden /> Export subscribers (CSV)
          </a>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Subscribers" value={subscribers.length} icon={Mail} />
        <MetricTile label="Waitlist" value={waitlist.length} icon={Hourglass} tone="amber" />
        <MetricTile label="Enrolled" value={enrollments.filter((item) => item.status === "enrolled").length} icon={GraduationCap} tone="source" />
        <MetricTile label="Completed" value={enrollments.filter((item) => item.status === "completed").length} icon={CheckCircle2} tone="gold" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Panel title="Academy interest list" icon={Users} action={<span className="text-[12.5px] text-stone-600">{enrollments.length} records</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-[0.1em] text-stone-600">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Name</th>
                  <th className="px-4 py-2.5 font-bold">Level</th>
                  <th className="px-4 py-2.5 font-bold">Cohort</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/8">
                {enrollments.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-cream/50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-navy">{row.fullName}</p>
                      <p className="text-[12px] text-stone-600">{row.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-stone-700">{row.levelName ?? "Undecided"}</td>
                    <td className="px-4 py-2.5 text-stone-700">{row.cohort ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="ui-badge rounded-full border border-navy/10 bg-cream px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-700">{row.status}</span>
                    </td>
                    <td className="numeric px-4 py-2.5 text-[12.5px] text-stone-600">{formatDate(row.createdAt, "short")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Subscribers by principle" icon={PieChart} bodyClassName="px-5 py-4">
            <ul className="space-y-3">
              {principleCounts.map((row, index) => (
                <li key={row.principle ?? "unknown"} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3">
                  <span className="truncate text-[13px] text-stone-700">{row.principle ?? "Unspecified"}</span>
                  <GlassMeter value={Number(row.value)} max={principleTotal} tone="navy" index={index} />
                  <span className="numeric text-right text-[13px] font-semibold text-navy">{Number(row.value)}</span>
                </li>
              ))}
              {principleCounts.length === 0 ? <li className="text-[13px] text-stone-600">No subscribers yet.</li> : null}
            </ul>
          </Panel>

          <Panel title="Recent subscribers" icon={Send}>
            <ul className="k-stagger max-h-80 divide-y divide-navy/8 overflow-y-auto">
              {subscribers.slice(0, 12).map((row, index) => (
                <li key={row.id} style={staggerStyle(index)} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-medium text-navy">{row.fullName ?? "Reader"}</p>
                    <span className="numeric text-[12px] text-stone-500">{formatDate(row.createdAt, "short")}</span>
                  </div>
                  <p className="break-all text-[12px] text-stone-600">
                    {row.email} · {row.principle ?? "no principle"} · via {row.source}
                  </p>
                </li>
              ))}
              {subscribers.length === 0 ? <li className="px-5 py-4 text-[13px] text-stone-600">No subscribers yet.</li> : null}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
