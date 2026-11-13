import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { admissionRequests } from "@/db/schema";
import { requireAdminPage } from "@/lib/page-access";
import { AdmissionReviewForm } from "@/components/auth/admission-review-form";
import { formatDateTime } from "@/lib/utils";
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-navy">Student applications</h1>
        <p className="mt-2 text-sm text-stone-600">
          Review new applicants before they can sign in. Approval creates a
          Student account and admission to the first level.
        </p>
      </div>
      <div className="space-y-4">
        {requests.map((request) => (
          <article key={request.id} className="admin-card p-5">
            <h2 className="font-serif text-xl text-navy">{request.fullName}</h2>
            <p className="mt-1 break-all text-sm text-stone-600">
              {request.email}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Applied {formatDateTime(request.createdAt)}
            </p>
            {request.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {request.notes}
              </p>
            ) : null}
            <AdmissionReviewForm id={request.id} />
          </article>
        ))}
        {!requests.length ? (
          <p className="admin-card p-6 text-sm text-stone-500">
            No applications are waiting for review.
          </p>
        ) : null}
      </div>
      <section className="admin-card p-5">
        <h2 className="font-serif text-xl text-navy">Recent decisions</h2>
        <ul className="mt-3 divide-y divide-navy/10">
          {recent
            .filter((row) => row.status !== "pending")
            .map((row) => (
              <li
                key={row.id}
                className="flex justify-between gap-3 py-3 text-sm"
              >
                <span>{row.fullName}</span>
                <span className="capitalize text-stone-500">{row.status}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
