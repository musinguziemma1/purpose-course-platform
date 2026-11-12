import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContactEnquiry } from "@/db/contact-inbox";
import { requireAdminPage } from "@/lib/page-access";
import { emailConfigurationError } from "@/lib/email";
import { ContactReplyForm, ContactStatusForm } from "@/components/admin/contact-forms";

export const metadata = { title: "Website enquiry" };
const date = (value: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(value);

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPage("/admin/contact");
  const { id } = await params;
  const detail = await getContactEnquiry(id, actor);
  if (!detail) notFound();
  const { enquiry, replies } = detail;
  return <div className="mx-auto max-w-5xl space-y-6">
    <Link href="/admin/contact" className="text-sm text-navy underline">Back to contact inbox</Link>
    <article className="rounded-xl border border-navy/10 bg-paper p-5 sm:p-7">
      <h1 className="break-words font-serif text-2xl text-navy">{enquiry.subject}</h1>
      <p className="mt-2 break-words text-sm">{enquiry.fullName}{enquiry.email ? ` · ${enquiry.email}` : " · Legacy enquiry (confirm email before replying)"}</p>
      <p className="mt-1 text-xs text-stone-500">Received {date(enquiry.createdAt)} EAT</p>
      <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-800">{enquiry.body}</p>
    </article>
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_2fr]">
      <section className="rounded-xl border border-navy/10 bg-paper p-5"><h2 className="mb-4 font-serif text-xl text-navy">Manage enquiry</h2><ContactStatusForm key={enquiry.version} id={id} version={enquiry.version} status={enquiry.status} /></section>
      <section className="rounded-xl border border-navy/10 bg-paper p-5"><h2 className="mb-4 font-serif text-xl text-navy">Reply by email</h2><ContactReplyForm id={id} replyId={randomUUID()} email={enquiry.email} configurationError={emailConfigurationError()} /></section>
    </div>
    <section><h2 className="font-serif text-xl text-navy">Reply history</h2><p className="mt-1 text-xs text-stone-600">Accepted means Resend accepted the request. Delivered requires a verified provider callback.</p>
      <ul className="mt-4 space-y-3">{replies.map((reply) => <li key={reply.id} className="rounded-xl border border-navy/10 bg-paper p-5">
        <p className="break-words text-sm font-semibold text-navy">{reply.authorName ?? "Former staff member"} → {reply.recipientEmail}</p>
        <p className="mt-1 text-xs text-stone-600">{date(reply.createdAt)} EAT · Delivery: <strong>{reply.deliveryStatus.replaceAll("_", " ")}</strong></p>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm">{reply.body}</p>
        {reply.error ? <p className="mt-3 text-sm text-rose-700">{reply.error}</p> : null}
      </li>)}</ul>
      {!replies.length ? <p className="mt-3 text-sm text-stone-600">No email replies have been queued.</p> : null}
    </section>
  </div>;
}
