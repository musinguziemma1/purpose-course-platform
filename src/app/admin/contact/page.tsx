import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { getContactInbox } from "@/db/contact-inbox";
import { requireAdminPage } from "@/lib/page-access";
import { CONTACT_STATUSES } from "@/lib/contact";
import { formatDate } from "@/lib/utils";
import { ConsoleEmpty, ConsoleHeader, SegmentedNav, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const metadata = { title: "Contact inbox" };
const labels: Record<string, string> = { new: "New", in_progress: "In progress", resolved: "Resolved" };
const stamps: Record<string, string> = { new: "k-stamp-new", in_progress: "k-stamp-progress", resolved: "k-stamp-resolved" };

export default async function ContactInboxPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const actor = await requireAdminPage("/admin/contact");
  const params = await searchParams;
  const status = CONTACT_STATUSES.includes(params.status as typeof CONTACT_STATUSES[number]) ? params.status : undefined;
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(params.page)) || 1));
  const enquiries = await getContactInbox(actor, status, page);
  const pageLink = (number: number) => `/admin/contact?page=${number}${status ? `&status=${status}` : ""}`;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ConsoleHeader eyebrow="Correspondence" title="Contact inbox" description="Website enquiries, staff ownership and email reply history." />
      <SegmentedNav
        label="Filter enquiries"
        items={["all", ...CONTACT_STATUSES].map((item) => ({
          href: item === "all" ? "/admin/contact" : `/admin/contact?status=${item}`,
          label: labels[item] ?? "All enquiries",
          current: (status ?? "all") === item,
        }))}
      />
      {enquiries.length ? (
        <ul className="k-stagger space-y-3.5">
          {enquiries.map((item, index) => (
            <li key={item.id} style={staggerStyle(index)}>
              <Link href={`/admin/contact/${item.id}`} className="admin-card k-airmail group flex items-start gap-4 overflow-hidden p-5 pt-6">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-serif text-[18px] leading-snug text-navy decoration-gold decoration-2 underline-offset-4 group-hover:underline">{item.subject}</p>
                  <p className="mt-1.5 break-words text-[14px] text-stone-700">
                    {item.fullName}
                    {item.email ? ` · ${item.email}` : " · Legacy enquiry"}
                  </p>
                  <p className="mt-1 text-[12.5px] text-stone-600">
                    {formatDate(item.createdAt)} · {item.assignedName ? `Assigned to ${item.assignedName}` : "Unassigned"}
                  </p>
                </div>
                <span className={`k-stamp ${stamps[item.status] ?? ""}`} style={{ "--tilt": index % 2 ? "-3deg" : "2.5deg" } as CSSProperties}>
                  <span className="k-stamp-face">
                    <Mail aria-hidden className="h-4 w-4" />
                    {labels[item.status] ?? item.status}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ConsoleEmpty icon={Mail} title="No enquiries on this page." description="New website enquiries land here as letters." />
      )}
      <nav aria-label="Enquiry pages" className="flex items-center justify-between gap-4 text-[14px] text-navy">
        {page > 1 ? (
          <Link href={pageLink(page - 1)} className={keyClass("paper", "sm")}>
            <ArrowLeft aria-hidden /> Previous page
          </Link>
        ) : (
          <span />
        )}
        <span className="numeric font-semibold text-stone-600">Page {page}</span>
        {enquiries.length === 50 && page < 10000 ? (
          <Link href={pageLink(page + 1)} className={keyClass("paper", "sm")}>
            Next page <ArrowRight aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
