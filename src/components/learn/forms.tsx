"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CalendarPlus, Check, Loader2, NotebookPen, Send } from "lucide-react";
import {
  requestCoaching,
  saveReflection,
  submitAssignment,
  toggleSessionComplete,
  type LearningState,
} from "@/app/actions/learning";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PRINCIPLE_INFO, PRINCIPLE_KEYS } from "@/lib/purpose-journey";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/media/file-upload";
import { btn } from "@/components/learn/kit";

function StateNote({ state }: { state: LearningState }) {
  if (state.error) {
    return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{state.error}</p>;
  }
  if (state.ok) {
    return (
      <p role="status" className="rounded-lg border border-source/30 bg-source/5 px-3 py-2 text-[13px] text-source">{state.message}</p>
    );
  }
  return null;
}

/** A tactile submit button that shows the press is being handled. */
export function SubmitButton({
  children,
  className,
  name,
  value,
  disabled = false,
}: {
  children: ReactNode;
  className: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={disabled || pending} aria-busy={pending || undefined} className={className}>
      {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function SessionToggle({
  sessionId,
  completed,
  compact = false,
}: {
  sessionId: number;
  completed: boolean;
  compact?: boolean;
}) {
  return (
    <form action={toggleSessionComplete}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="completed" value={String(!completed)} />
      <SessionToggleButton completed={completed} compact={compact} />
    </form>
  );
}

function SessionToggleButton({ completed, compact }: { completed: boolean; compact: boolean }) {
  const { pending } = useFormStatus();
  return (
      // A key on the desk: raised until pressed, then it stays down with a green tick.
      <button
        type="submit"
        disabled={pending}
        aria-label={completed ? "Uncheck self-reported session" : "Check self-reported session"}
        className={cn("lk-btn lk-btn-sm gap-2", completed ? "lk-btn-down" : "lk-btn-paper", compact && "px-3")}
      >
        <span aria-hidden className={cn("lk-tickbox", completed && "lk-tickbox-on")}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : completed ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        {completed ? "Checked" : "Mark attended"}
      </button>
  );
}

export function AssignmentForm({
  assignmentId,
  existingBody,
  status,
  version,
  existingAttachmentId,
}: {
  assignmentId: number;
  existingBody: string | null;
  status: string | null;
  version: string;
  existingAttachmentId: string | null;
}) {
  const [state, formAction] = useActionState<LearningState, FormData>(submitAssignment, {});
  const [attachmentId, setAttachmentId] = useState(existingAttachmentId ?? "");
  const [uploading, setUploading] = useState(false);
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="attachmentId" value={attachmentId} />
      <Field label="Assignment response">
      <Textarea
        name="body"
        required
        minLength={30}
        maxLength={20000}
        readOnly={status === "reviewed"}
        rows={4}
        defaultValue={existingBody ?? ""}
        placeholder="Write your response. Be concrete — evidence beats adjectives."
        
      />
      </Field>
      {status !== "reviewed" ? <FileUpload purpose="submission" onUploaded={asset => setAttachmentId(asset.id)} onBusyChange={setUploading} /> : null}
      {attachmentId ? <div className="flex flex-wrap gap-4 text-[13px]"><a href={`/api/media/${attachmentId}?download=1`} className="lk-link">Download attached file</a>{status !== "reviewed" ? <button type="button" onClick={() => setAttachmentId("")} className="min-h-9 text-stone-600 hover:text-navy">Remove attachment</button> : null}</div> : null}
      <StateNote state={state} />
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <SubmitButton name="intent" value="submit" disabled={status === "reviewed" || uploading} className={cn(btn.navy, btn.sm)}>
          <Send aria-hidden className="h-3.5 w-3.5" /> {status === "reviewed" ? "Graded response" : "Submit for review"}
        </SubmitButton>
        <SubmitButton name="intent" value="draft" disabled={status === "reviewed" || uploading} className={cn(btn.paper, btn.sm)}>
          Save draft
        </SubmitButton>
        {status ? <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">Current: {status}</span> : null}
      </div>
    </form>
  );
}

export function ReflectionForm({ sessions, defaultPrinciple = "" }: { sessions: { id: number; code: string; title: string }[]; defaultPrinciple?: string }) {
  const [state, formAction] = useActionState<LearningState, FormData>(saveReflection, {});
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Prompt or title">
        <Input name="prompt" required placeholder="What shifted for me this week?" />
      </Field>
      <Field label="Reflection" hint="minimum 40 characters">
        <Textarea
          name="body"
          rows={6}
          required
          className="lk-ruled-field pl-12 leading-7"
          placeholder="Write honestly. This is a learning record, not a performance."
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Related session">
          <Select name="sessionId" defaultValue="">
            <option value="">General reflection</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.code} — {session.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Principle" hint="Optional: which principle were you reflecting on?">
          <Select name="principle" defaultValue={defaultPrinciple}>
            <option value="">Not specific to one principle</option>
            {PRINCIPLE_KEYS.map((key) => (
              <option key={key} value={key}>
                {PRINCIPLE_INFO[key].name} — {PRINCIPLE_INFO[key].question}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Visibility">
          <Select name="visibility" defaultValue="mentor">
            <option value="private">Private — only me</option>
            <option value="mentor">Share with my mentor</option>
            <option value="cohort">Share with the cohort</option>
          </Select>
        </Field>
      </div>
      <StateNote state={state} />
      <SubmitButton className={cn(btn.navy, "w-full")}>
        <NotebookPen aria-hidden className="h-4 w-4" /> Save reflection
      </SubmitButton>
    </form>
  );
}

export function CoachingRequestForm() {
  const [state, formAction] = useActionState<LearningState, FormData>(requestCoaching, {});
  const [defaultScheduledFor] = useState(() => new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16));
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Session title">
        <Input name="title" required placeholder="Clarity session — purpose statement" />
      </Field>
      <Field label="What do you want to work on?" hint="optional">
        <Textarea name="focus" rows={2} placeholder="Bring the two drafts and the gifting evidence." />
      </Field>
      <Field label="Preferred date & time">
        <Input
          type="datetime-local"
          name="scheduledFor"
          required
          defaultValue={defaultScheduledFor}
          
        />
      </Field>
      <StateNote state={state} />
      <SubmitButton className={cn(btn.brass, "w-full")}>
        <CalendarPlus aria-hidden className="h-4 w-4" /> Request coaching session
      </SubmitButton>
    </form>
  );
}
