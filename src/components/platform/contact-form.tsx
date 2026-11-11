"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { sendContactMessage, type ContactState } from "@/app/actions/messages";
import { Field, Input, Textarea } from "@/components/ui/field";

const initial: ContactState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-navy text-[12.5px] font-semibold text-paper transition-colors hover:bg-navy-700 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {pending ? "Sending…" : "Send to the faculty"}
    </button>
  );
}

export function ContactForm({
  defaultName,
  defaultEmail,
  signedIn,
}: {
  defaultName: string;
  defaultEmail: string;
  signedIn: boolean;
}) {
  const [state, action] = useActionState<ContactState, FormData>(sendContactMessage, initial);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-source/30 bg-source/5 p-4">
        <CheckCircle2 className="h-6 w-6 text-source" />
        <p className="mt-2 font-serif text-lg text-navy">Message received</p>
        <p className="mt-1 text-[12px] leading-relaxed text-stone-700">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" required defaultValue={defaultName} placeholder="Your name" className="text-[12.5px]" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required defaultValue={defaultEmail} placeholder="you@example.com" className="text-[12.5px]" />
        </Field>
      </div>
      <Field label="Subject">
        <Input name="subject" required placeholder="Cohort dates, partnership, or a question" className="text-[12.5px]" />
      </Field>
      <Field label="Message" hint="min 30 characters">
        <Textarea name="body" rows={5} required placeholder="Tell us what you need." className="text-[12.5px]" />
      </Field>
      {!signedIn ? (
        <p className="text-[10.5px] leading-relaxed text-stone-500">
          We will store your message against a faculty inbox. If you have an account, sign in so replies appear in your
          portal.
        </p>
      ) : null}
      {state.error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
