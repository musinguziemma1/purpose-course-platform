"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarPlus, Check, Circle, Loader2, NotebookPen, Send } from "lucide-react";
import {
  requestCoaching,
  saveReflection,
  submitAssignment,
  toggleSessionComplete,
  type LearningState,
} from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

function StateNote({ state }: { state: LearningState }) {
  if (state.error) {
    return <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p>;
  }
  if (state.ok) {
    return (
      <p className="rounded-md border border-source/30 bg-source/5 px-2.5 py-2 text-[11.5px] text-source">{state.message}</p>
    );
  }
  return null;
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
      <button
        type="submit"
        disabled={pending}
        aria-label={completed ? "Uncheck self-reported session" : "Check self-reported session"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border text-[11px] font-medium transition-colors disabled:opacity-60",
          compact ? "h-7 px-2.5" : "h-8 px-3",
          completed
            ? "border-source/30 bg-source/10 text-source hover:bg-source/15"
            : "border-navy/15 bg-paper text-navy hover:border-navy/35",
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : completed ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Circle className="h-3.5 w-3.5" />
        )}
        {completed ? "Checked" : "Mark attended"}
      </button>
  );
}

export function AssignmentForm({
  assignmentId,
  existingBody,
  status,
}: {
  assignmentId: number;
  existingBody: string | null;
  status: string | null;
}) {
  const [state, formAction] = useActionState<LearningState, FormData>(submitAssignment, {});
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <Field label="Assignment response">
      <Textarea
        name="body"
        rows={4}
        defaultValue={existingBody ?? ""}
        placeholder="Write your response. Be concrete — evidence beats adjectives."
        className="text-[12.5px]"
      />
      </Field>
      <StateNote state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          name="intent"
          value="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
        >
          <Send className="h-3.5 w-3.5" /> {status === "reviewed" ? "Resubmit" : "Submit for review"}
        </button>
        <button
          type="submit"
          name="intent"
          value="draft"
          className="inline-flex h-9 items-center rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
        >
          Save draft
        </button>
        {status ? (
          <span className="text-[10.5px] uppercase tracking-[0.1em] text-stone-500">current: {status}</span>
        ) : null}
      </div>
    </form>
  );
}

export function ReflectionForm({ sessions }: { sessions: { id: number; code: string; title: string }[] }) {
  const [state, formAction] = useActionState<LearningState, FormData>(saveReflection, {});
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Prompt or title">
        <Input name="prompt" required placeholder="What shifted for me this week?" className="text-[12.5px]" />
      </Field>
      <Field label="Reflection" hint="minimum 40 characters">
        <Textarea
          name="body"
          rows={5}
          required
          placeholder="Write honestly. This is a learning record, not a performance."
          className="text-[12.5px]"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Related session">
          <Select name="sessionId" defaultValue="" className="text-[12.5px]">
            <option value="">General reflection</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.code} — {session.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Visibility">
          <Select name="visibility" defaultValue="mentor" className="text-[12.5px]">
            <option value="private">Private — only me</option>
            <option value="mentor">Share with my mentor</option>
            <option value="cohort">Share with the cohort</option>
          </Select>
        </Field>
      </div>
      <StateNote state={state} />
      <Button type="submit" size="sm" className="w-full">
        <NotebookPen className="h-3.5 w-3.5" /> Save reflection
      </Button>
    </form>
  );
}

export function CoachingRequestForm() {
  const [state, formAction] = useActionState<LearningState, FormData>(requestCoaching, {});
  const [defaultScheduledFor] = useState(() => new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16));
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Session title">
        <Input name="title" required placeholder="Clarity session — purpose statement" className="text-[12.5px]" />
      </Field>
      <Field label="What do you want to work on?" hint="optional">
        <Textarea name="focus" rows={2} placeholder="Bring the two drafts and the gifting evidence." className="text-[12.5px]" />
      </Field>
      <Field label="Preferred date & time">
        <Input
          type="datetime-local"
          name="scheduledFor"
          required
          defaultValue={defaultScheduledFor}
          className="text-[12.5px]"
        />
      </Field>
      <StateNote state={state} />
      <Button type="submit" size="sm" className="w-full">
        <CalendarPlus className="h-3.5 w-3.5" /> Request coaching session
      </Button>
    </form>
  );
}
