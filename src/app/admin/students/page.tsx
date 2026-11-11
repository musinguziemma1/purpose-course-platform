import { Download, Mail, Users } from "lucide-react";
import { getEnrollments, getNewsletterPrincipleCounts, getSubscribers } from "@/db/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audience & students" };

export default async function AdminStudentsPage() {
  const [enrollments, subscribers, principleCounts] = await Promise.all([
    getEnrollments(100),
    getSubscribers(200),
    getNewsletterPrincipleCounts(),
  ]);

  const waitlist = enrollments.filter((item) => item.status === "waitlist");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Audience & students</h1>
          <p className="text-[12.5px] text-stone-600">
            The bridge from reader to learner: newsletter subscribers, resource downloads and the Academy waitlist.
          </p>
        </div>
        <a
          href="/api/subscribers/export"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-navy/15 bg-paper px-4 text-[12px] font-medium text-navy hover:bg-cream"
        >
          <Download className="h-3.5 w-3.5" /> Export subscribers (CSV)
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Subscribers", value: subscribers.length, icon: Mail },
          { label: "Waitlist", value: waitlist.length, icon: Users },
          { label: "Enrolled", value: enrollments.filter((item) => item.status === "enrolled").length, icon: Users },
          { label: "Completed", value: enrollments.filter((item) => item.status === "completed").length, icon: Users },
        ].map((card) => (
          <div key={card.label} className="admin-card p-4">
            <card.icon className="h-4 w-4 text-gold-dark" />
            <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/10 px-5 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Academy interest list</p>
            <span className="text-[11px] text-stone-500">{enrollments.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-[12px]">
              <thead className="bg-cream/40 text-[10px] uppercase tracking-[0.1em] text-stone-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Level</th>
                  <th className="px-4 py-2 font-semibold">Cohort</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/8">
                {enrollments.map((row) => (
                  <tr key={row.id} className="hover:bg-cream/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-navy">{row.fullName}</p>
                      <p className="text-[10.5px] text-stone-500">{row.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">{row.levelName ?? "Undecided"}</td>
                    <td className="px-4 py-2.5 text-stone-600">{row.cohort ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-stone-500">{formatDate(row.createdAt, "short")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-card p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Subscribers by principle</p>
            <ul className="mt-3 space-y-2">
              {principleCounts.map((row) => {
                const total = Math.max(
                  principleCounts.reduce((sum, item) => sum + Number(item.value), 0),
                  1,
                );
                return (
                  <li key={row.principle ?? "unknown"} className="flex items-center gap-2.5">
                    <span className="w-20 text-[11px] text-stone-600">{row.principle ?? "Unspecified"}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                      <span
                        className="block h-full rounded-full bg-navy"
                        style={{ width: `${(Number(row.value) / total) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-[11px] font-semibold text-navy">{Number(row.value)}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="admin-card overflow-hidden">
            <div className="border-b border-navy/10 px-5 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Recent subscribers</p>
            </div>
            <ul className="max-h-72 divide-y divide-navy/8 overflow-y-auto">
              {subscribers.slice(0, 12).map((row) => (
                <li key={row.id} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-navy">{row.fullName ?? "Reader"}</p>
                    <span className="text-[10px] text-stone-400">{formatDate(row.createdAt, "short")}</span>
                  </div>
                  <p className="text-[10.5px] text-stone-500">
                    {row.email} · {row.principle ?? "no principle"} · via {row.source}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
