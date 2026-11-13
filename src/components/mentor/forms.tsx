"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Send } from "lucide-react";
import {
  completeCoachingSession,
  reviewSubmission,
  scheduleFollowUp,
  type MentorState,
} from "@/app/actions/mentorship";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea, Input } from "@/components/ui/field";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      {pending ? pendingLabel : label}
    </Button>
  );
}

function StateNote({ state }: { state: MentorState }) {
  if (state.error) {
    return <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p>;
  }
  if (state.ok) {
    return (
      <p className="rounded-md border border-source/30 bg-source/5 px-2.5 py-2 text-[11.5px] text-source">
        {state.message}
      </p>
    );
  }
  return null;
}

export function CompleteSessionForm({ sessionId, existingNotes }: { sessionId: number; existingNotes: string | null }) {
  const [state, formAction] = useActionState<MentorState, FormData>(completeCoachingSession, {});
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <Field label="Session notes" hint="shared with the student">
      <Textarea
        name="mentorNotes"
        rows={3}
        defaultValue={existingNotes ?? ""}
        placeholder="What did you hear, what did you name, and what is the homework?"
        className="text-[12.5px]"
      />
      </Field>
      <StateNote state={state} />
      <Submit label="Mark complete & share notes" pendingLabel="Saving…" />
    </form>
  );
}

export function ReviewSubmissionForm({ submissionId, version }: { submissionId: number; version: string }) {
  const [state, formAction] = useActionState<MentorState, FormData>(reviewSubmission, {});
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="version" value={version} />
      <Field label="Score out of 100"><Input name="score" type="number" required min={0} max={100} step={1} /></Field>
      <Field label="Feedback" hint="be specific">
      <Textarea name="feedback" rows={3} required minLength={20} maxLength={10000} placeholder="One strength, one gap, one next action." className="text-[12.5px]" />
      </Field>
      <StateNote state={state} />
      <Submit label="Share feedback" pendingLabel="Sending…" />
    </form>
  );
}

export function ScheduleSessionForm({ students }: { students: { profileId: string; fullName: string }[] }) {
  const [state, formAction] = useActionState<MentorState, FormData>(scheduleFollowUp, {});
  const [defaultScheduledFor] = useState(() => new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 16));
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Mentee">
        <Select name="studentId" defaultValue={students[0]?.profileId ?? ""} required>
          {students.map((student) => (
            <option key={student.profileId} value={student.profileId}>
              {student.fullName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Session title">
        <Input name="title" required placeholder="Clarity session — story review" className="text-[12.5px]" />
      </Field>
      <Field label="Focus & preparation" hint="optional">
        <Textarea name="focus" rows={2} placeholder="What should they bring?" className="text-[12.5px]" />
      </Field>
      <Field label="Date & time">
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
        <Send className="h-3.5 w-3.5" /> Schedule session
      </Button>
    </form>
  );
}
