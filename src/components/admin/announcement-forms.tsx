"use client";

import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";
import { Archive, Loader2, Megaphone, Save } from "lucide-react";
import { archiveAnnouncementAction, saveAnnouncementAction } from "@/app/actions/announcements";
import type { AnnouncementState, Audience } from "@/db/announcements";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Initial = { id: number; version: number; title: string; body: string; audience: Audience; cohortId: number | null; href: string | null; pinned: boolean; expiresAt: string | null; status: string };
const AUDIENCE_OPTIONS: [Audience, string][] = [
  ["everyone", "Everyone"], ["learners", "All learners"], ["mentors", "Mentors and instructors"], ["staff", "Staff"], ["cohort", "One cohort"],
];

export function AnnouncementEditor({ cohorts, initial }: { cohorts: { id: number; name: string }[]; initial?: Initial }) {
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? "learners");
  const [state, setState] = useState<AnnouncementState>({});
  const [pending, startTransition] = useTransition();
  const published = initial?.status === "published";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(async () => {
      const result = await saveAnnouncementAction({}, formData);
      setState(result);
      if (result.ok && !initial) {
        formRef.current?.reset();
        setAudience("learners");
      }
      statusRef.current?.focus();
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
      {initial ? (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="version" value={initial.version} />
        </>
      ) : null}
      <Field label="Title" required>
        <Input name="title" defaultValue={initial?.title} maxLength={160} required />
      </Field>
      <Field label="Message" hint="Plain text. Line breaks are kept." required>
        <Textarea name="body" rows={5} defaultValue={initial?.body} maxLength={4000} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who should see it">
          <Select name="audience" value={audience} onChange={(event) => setAudience(event.target.value as Audience)}>
            {AUDIENCE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        {audience === "cohort" ? (
          <Field label="Cohort" required>
            <Select name="cohortId" defaultValue={initial?.cohortId ?? ""} required>
              <option value="">Choose a cohort</option>
              {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
            </Select>
          </Field>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link" hint="Optional: a page on this site (/events) or an https:// address.">
          <Input name="href" defaultValue={initial?.href ?? ""} inputMode="url" />
        </Field>
        <Field label="Hide after" hint="Optional date and time.">
          <Input name="expiresAt" type="datetime-local" defaultValue={initial?.expiresAt ?? ""} />
        </Field>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-navy">
        <input type="checkbox" name="pinned" defaultChecked={initial?.pinned} className="h-5 w-5" />
        Pin to the top of dashboards
      </label>
      <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={cn("min-h-5 text-[14px] outline-none", state.error ? "font-medium text-rose-700" : "text-source")}>
        {state.error ?? state.message ?? ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-[14px] font-semibold text-paper transition-[transform,background-color] duration-150 hover:bg-navy-700 active:scale-[0.97] disabled:opacity-60"
        >
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Megaphone aria-hidden className="h-4 w-4" />}
          {published ? "Save changes" : "Publish now"}
        </button>
        {!published ? (
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-navy/20 px-5 text-[14px] font-semibold text-navy transition-[transform,background-color] duration-150 hover:bg-cream active:scale-[0.97] disabled:opacity-60"
          >
            <Save aria-hidden className="h-4 w-4" /> Save draft
          </button>
        ) : null}
      </div>
      {!published ? <p className="text-[13px] text-stone-600">Publishing sends an in-app notification to everyone in the audience.</p> : null}
    </form>
  );
}

export function ArchiveAnnouncementButton({ id, version }: { id: number; version: number }) {
  const [state, action, pending] = useActionState<AnnouncementState, FormData>(archiveAnnouncementAction, {});
  return (
    <form action={action} onSubmit={(event) => { if (!window.confirm("Archive this announcement? It will disappear from dashboards.")) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-rose-300 px-3 text-[13px] font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60">
        <Archive aria-hidden className="h-4 w-4" /> Archive
      </button>
      {state.error ? <p role="alert" className="mt-1 text-[13px] text-rose-700">{state.error}</p> : null}
    </form>
  );
}
