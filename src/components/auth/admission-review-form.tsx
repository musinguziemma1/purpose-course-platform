"use client";
import { useActionState } from "react";
import { decideAdmission, type AdmissionState } from "@/app/actions/admissions";
export function AdmissionReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<AdmissionState, FormData>(
    decideAdmission,
    {},
  );
  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending || state.ok}
          name="decision"
          value="approve"
          className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          Approve student &amp; first level
        </button>
        <button
          disabled={pending || state.ok}
          name="decision"
          value="decline"
          className="rounded-full border border-navy/15 px-4 py-2 text-sm text-navy disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-source">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
