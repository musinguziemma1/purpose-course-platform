"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { enrollAction, type EnrollState } from "@/app/actions/site";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const initialState: EnrollState = {};

export function EnrollForm({ levels }: { levels: { slug: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(enrollAction, initialState);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-source/30 bg-source/5 p-6">
        <CheckCircle2 className="h-8 w-8 text-source" />
        <p className="mt-3 font-serif text-xl text-navy">You are on the interest list.</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{state.message}</p>
        <p className="mt-3 text-[12px] text-stone-500">
          Next step: we will send a short questionnaire and the reading for PURP 101 before the cohort opens.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="fullName" required placeholder="Your name" autoComplete="name" />
        </Field>
        <Field label="Email address">
          <Input name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        </Field>
      </div>
      <Field label="Level of interest">
        <Select name="level" defaultValue={levels[0]?.slug ?? ""}>
          {levels.map((level) => (
            <option key={level.slug} value={level.slug}>
              {level.name} level
            </option>
          ))}
          <option value="">Not sure yet — help me decide</option>
        </Select>
      </Field>
      <Field label="What are you hoping to clarify?" hint="optional">
        <Textarea name="notes" rows={3} placeholder="One or two sentences is plenty." />
      </Field>
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Reserving your place…" : "Join the Cohort 04 interest list"}
      </Button>
      <p className="text-[11px] leading-relaxed text-stone-500">
        No payment now. We will confirm dates, fees and the cohort calendar by email. Your details stay with the
        Purpose Course team.
      </p>
      {state.error ? <p className="text-xs font-medium text-rose-600">{state.error}</p> : null}
    </form>
  );
}
