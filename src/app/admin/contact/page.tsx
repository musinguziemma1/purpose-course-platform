import Link from "next/link";
import { getContactInbox } from "@/db/contact-inbox";
import { requireAdminPage } from "@/lib/page-access";
import { CONTACT_STATUSES } from "@/lib/contact";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Contact inbox" };
const labels: Record<string, string> = { new: "New", in_progress: "In progress", resolved: "Resolved" };

export default async function ContactInboxPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const actor = await requireAdminPage("/admin/contact");
  const params = await searchParams;
  const status = CONTACT_STATUSES.includes(params.status as typeof CONTACT_STATUSES[number]) ? params.status : undefined;
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(params.page)) || 1));
  const enquiries = await getContactInbox(actor, status, page);
  const pageLink = (number: number) => `/admin/contact?page=${number}${status ? `&status=${status}` : ""}`;
  return <div className="mx-auto max-w-5xl space-y-5">
    <div><h1 className="font-serif text-3xl text-navy">Contact inbox</h1><p className="mt-2 text-sm text-stone-600">Website enquiries, staff ownership and email reply history.</p></div>
    <nav aria-label="Filter enquiries" className="flex flex-wrap gap-2">
      {["all", ...CONTACT_STATUSES].map((item) => <Link key={item} href={item === "all" ? "/admin/contact" : `/admin/contact?status=${item}`} aria-current={(status ?? "all") === item ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm ${(status ?? "all") === item ? "bg-navy text-paper" : "border-navy/15 text-navy"}`}>{labels[item] ?? "All enquiries"}</Link>)}
    </nav>
    <ul className="space-y-3">
      {enquiries.map((item) => <li key={item.id} className="rounded-xl border border-navy/10 bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><Link className="break-words font-semibold text-navy underline underline-offset-4" href={`/admin/contact/${item.id}`}>{item.subject}</Link><span className="text-xs text-stone-600">{labels[item.status]}</span></div>
        <p className="mt-2 break-words text-sm text-stone-700">{item.fullName}{item.email ? ` · ${item.email}` : " · Legacy enquiry"}</p>
        <p className="mt-1 text-xs text-stone-500">{formatDate(item.createdAt)} · {item.assignedName ? `Assigned to ${item.assignedName}` : "Unassigned"}</p>
      </li>)}
    </ul>
    {!enquiries.length ? <p className="rounded-xl border border-navy/10 bg-paper p-6 text-sm">No enquiries on this page.</p> : null}
    <nav aria-label="Enquiry pages" className="flex items-center gap-5 text-sm text-navy">
      {page > 1 ? <Link href={pageLink(page - 1)}>Previous page</Link> : null}<span>Page {page}</span>{enquiries.length === 50 && page < 10000 ? <Link href={pageLink(page + 1)}>Next page</Link> : null}
    </nav>
  </div>;
}
