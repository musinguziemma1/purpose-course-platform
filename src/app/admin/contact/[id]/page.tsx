import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { History, Reply, SlidersHorizontal } from "lucide-react";
import { getContactEnquiry } from "@/db/contact-inbox";
import { requireAdminPage } from "@/lib/page-access";
import { emailConfigurationError } from "@/lib/email";
import { ContactReplyForm, ContactStatusForm } from "@/components/admin/contact-forms";
import { Led } from "@/components/admin/console/instruments";
import { ConsoleHeader, Panel, staggerStyle } from "@/components/admin/console/surfaces";

export const metadata = { title: "Website enquiry" };
const date = (value: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(value);

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("/admin/contact");
  const { id } = await params;
  const detail = await getContactEnquiry(id, actor);
  if (!detail) notFound();
  const { enquiry, replies } = detail;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/contact", label: "Contact inbox" }}
        eyebrow="Website enquiry"
        title={enquiry.subject}
        description={
          <span className="break-words">
            {enquiry.fullName}
            {enquiry.email ? ` · ${enquiry.email}` : " · Legacy enquiry (confirm email before replying)"}
          </span>
        }
        meta={<span className="text-[13px] text-stone-600">Received {date(enquiry.createdAt)} EAT</span>}
      />
      <article aria-label="Enquiry message" className="admin-card k-airmail overflow-hidden px-5 pb-7 pt-8 sm:px-9">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-stone-600">Message from {enquiry.fullName}</p>
        <p className="mt-4 whitespace-pre-wrap break-words font-serif text-[17px] leading-[1.75] text-stone-800">{enquiry.body}</p>
      </article>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_2fr]">
        <Panel title="Manage enquiry" icon={SlidersHorizontal} bodyClassName="p-5">
          <ContactStatusForm key={enquiry.version} id={id} version={enquiry.version} status={enquiry.status} />
        </Panel>
        <Panel title="Reply by email" icon={Reply} bodyClassName="p-5">
          <ContactReplyForm id={id} replyId={randomUUID()} email={enquiry.email} configurationError={emailConfigurationError()} />
        </Panel>
      </div>
      <Panel title="Reply history" icon={History} description="Accepted means Resend accepted the request. Delivered requires a verified provider callback.">
        {replies.length ? (
          <ul className="k-stagger divide-y divide-navy/8">
            {replies.map((reply, index) => (
              <li key={reply.id} style={staggerStyle(index)} className="px-5 py-4">
                <p className="flex flex-wrap items-center gap-2 break-words text-[14px] font-semibold text-navy">
                  <Led tone={reply.error ? "red" : reply.deliveryStatus === "delivered" ? "green" : "gold"} />
                  {reply.authorName ?? "Former staff member"} → {reply.recipientEmail}
                </p>
                <p className="mt-1 text-[12.5px] text-stone-600">
                  {date(reply.createdAt)} EAT · Delivery: <strong className="text-navy">{reply.deliveryStatus.replaceAll("_", " ")}</strong>
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-cream/60 px-4 py-3 text-[14px] leading-relaxed text-stone-800 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">{reply.body}</p>
                {reply.error ? <p className="mt-3 text-[14px] text-rose-700">{reply.error}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-5 text-[14px] text-stone-600">No email replies have been queued.</p>
        )}
      </Panel>
    </div>
  );
}
