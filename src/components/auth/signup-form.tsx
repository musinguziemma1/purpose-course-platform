"use client";
import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { applyForAccount, type AdmissionState } from "@/app/actions/admissions";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";
export function SignupForm() {
  const [state, action, pending] = useActionState<AdmissionState, FormData>(
    applyForAccount,
    {},
  );
  if (state.ok)
    return (
      <div
        role="status"
        className="rounded-2xl border border-source/20 bg-source/5 p-6"
      >
        <CheckCircle2 className="h-9 w-9 text-source" />
        <h2 className="mt-4 font-serif text-2xl text-navy">
          Application received
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          {state.message}
        </p>
        <p className="mt-3 text-sm text-stone-600">
          Your application starts at the first level. Contact the course team if
          you need an update.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-paper"
        >
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form action={action} className="mt-7 space-y-4">
      <Field label="Full name">
        <Input
          name="fullName"
          required
          minLength={2}
          maxLength={160}
          autoComplete="name"
          placeholder="Your full name"
        />
      </Field>
      <Field label="Email address">
        <Input
          name="email"
          type="email"
          required
          maxLength={255}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Password" hint="at least 12 characters">
        <PasswordInput
          name="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm password">
        <PasswordInput
          name="confirmPassword"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </Field>
      <Field label="What brings you here?" hint="optional">
        <Textarea
          name="notes"
          rows={2}
          maxLength={2000}
          placeholder="Share a little about your learning goals."
        />
      </Field>
      <div className="hidden" aria-hidden>
        <label htmlFor="signup-website">Website</label>
        <input
          id="signup-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-stone-600">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
        />
        <span>
          I have read the{" "}
          <Link href="/privacy" className="font-semibold text-navy underline">
            privacy notice
          </Link>{" "}
          and agree to the course team reviewing my application.
        </span>
      </label>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {state.error}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="h-12 w-full rounded-full bg-navy text-sm font-semibold text-paper transition hover:bg-navy-700 disabled:opacity-50"
      >
        {pending ? "Submitting application…" : "Apply for a student account"}
      </button>
      <p className="text-center text-xs leading-relaxed text-stone-500">
        Staff approval is required. You can sign in after your application is
        approved.
      </p>
    </form>
  );
}
