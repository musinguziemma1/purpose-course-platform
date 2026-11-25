import { desc, eq } from "drizzle-orm";
import { FolderOpen, History } from "lucide-react";
import { db } from "@/db";
import { admissionRequests } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-access";
import { AdmissionReviewForm } from "@/components/auth/admission-review-form";
import { formatDateTime } from "@/lib/utils";
import { Lcd, Led, Odometer } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, Panel, staggerStyle } from "@/components/admin/console/surfaces";

export const metadata = { title: "Student applications" };
export const dynamic = "force-dynamic";
export default async function AdmissionPage() {
  await requireAdminPage("/admin/admissions");
  const requests = await db
    .select({
      id: admissionRequests.id,
      email: admissionRequests.email,
      fullName: admissionRequests.fullName,
      notes: admissionRequests.notes,
      createdAt: admissionRequests.createdAt,
    })
    .from(admissionRequests)
    .where(eq(admissionRequests.status, "pending"))
    .orderBy(admissionRequests.createdAt)
    .limit(100);
  const recent = await db
    .select({
      id: admissionRequests.id,
      fullName: admissionRequests.fullName,
      status: admissionRequests.status,
      reviewedAt: admissionRequests.reviewedAt,
    })
    .from(admissionRequests)
    .orderBy(desc(admissionRequests.reviewedAt))
    .limit(20);
  const decided = recent.filter((row) => row.status !== "pending");
  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Admissions"
        title="Student applications"
        description="Review new applicants before they can sign in. Approval creates a Student account and admission to the first level."
        actions={
          <span className="inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-stone-600">
            Waiting
            <Lcd alert={requests.length > 0} className="text-[1.25rem]">
              <Odometer value={requests.length} />
            </Lcd>
          </span>
        }
      />
      {requests.length ? (
        <div className="k-stagger space-y-5">
          {requests.map((request, index) => (
            <article key={request.id} style={staggerStyle(index)} className="admin-card k-folder p-5 sm:p-6">
              <span aria-hidden className="k-folder-tab">
                Application {index + 1}
              </span>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-[1.35rem] text-navy">{request.fullName}</h2>
                  <p className="mt-1 break-all text-[14px] text-stone-700">{request.email}</p>
                </div>
                <p className="inline-flex items-center gap-2 text-[12.5px] text-stone-600">
                  <Led tone="amber" pulse /> Applied {formatDateTime(request.createdAt)}
                </p>
              </div>
              {request.notes ? (
                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-cream/60 px-4 py-3 text-[14px] leading-relaxed text-stone-800 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">
                  {request.notes}
                </p>
              ) : null}
              <AdmissionReviewForm id={request.id} />
            </article>
          ))}
        </div>
      ) : (
        <ConsoleEmpty icon={FolderOpen} title="No applications are waiting for review." description="New applications arrive here as folders, oldest first." />
      )}
      <Panel title="Recent decisions" icon={History}>
        <ul className="divide-y divide-navy/8">
          {decided.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]">
              <span className="text-navy">{row.fullName}</span>
              <span className="inline-flex items-center gap-2 capitalize text-stone-700">
                <Led tone={row.status === "approved" ? "green" : row.status === "rejected" ? "red" : "off"} />
                {row.status}
              </span>
            </li>
          ))}
          {!decided.length ? <li className="px-5 py-4 text-[13px] text-stone-600">No decisions recorded yet.</li> : null}
        </ul>
      </Panel>
    </div>
  );
}
