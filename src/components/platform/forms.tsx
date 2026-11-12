"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import {
  addMentoringNote,
  assignMentor,
  createCohort,
  createGoal,
  createOrganization,
  markAttendance,
  postThread,
  raiseLearnerFlag,
  replyToThread,
  reportContent,
  updateGoalProgress,
  type PlatformState,
} from "@/app/actions/platform";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

function Note({ state }: { state: PlatformState }) {
  if (state.error) return <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p>;
  if (state.ok) return <p className="rounded-md border border-source/30 bg-source/5 px-2.5 py-2 text-[11.5px] text-source">{state.message}</p>;
  return null;
}

function Go({ label, pending }: { label: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={isPending}>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
      {isPending ? pending : label}
    </Button>
  );
}

export function MentorAssignForm({
  learners,
  mentors,
}: {
  learners: { id: string; fullName: string }[];
  mentors: { id: string; fullName: string }[];
}) {
  const [state, action] = useActionState<PlatformState, FormData>(assignMentor, {});
  return (
    <form action={action} className="space-y-2.5">
      <Field label="Learner">
        <Select name="studentId" defaultValue={learners[0]?.id ?? ""} className="text-[12.5px]">
          {learners.map((learner) => (
            <option key={learner.id} value={learner.id}>{learner.fullName}</option>
          ))}
        </Select>
      </Field>
      <Field label="Mentor">
        <Select name="mentorId" defaultValue={mentors[0]?.id ?? ""} className="text-[12.5px]">
          {mentors.map((mentor) => (
            <option key={mentor.id} value={mentor.id}>{mentor.fullName}</option>
          ))}
        </Select>
      </Field>
      <Field label="Focus" hint="optional">
        <Input name="focus" placeholder="Purpose statement and gifting evidence" className="text-[12.5px]" />
      </Field>
      <Note state={state} />
      <Go label="Assign mentor" pending="Assigning…" />
    </form>
  );
}

export function GoalForm({ studentId, learnerName }: { studentId: string; learnerName: string }) {
  const [state, action] = useActionState<PlatformState, FormData>(createGoal, {});
  const [defaultDueAt] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="studentId" value={studentId} />
      <p className="text-[11.5px] text-stone-600">Set a development goal for <strong className="text-navy">{learnerName}</strong>.</p>
      <Field label="Goal">
        <Input name="title" required placeholder="Write and test a purpose statement" className="text-[12.5px]" />
      </Field>
      <Field label="How it will be evidenced">
        <Textarea name="description" rows={2} placeholder="What does finished look like?" className="text-[12.5px]" />
      </Field>
      <Field label="Review date">
        <Input type="date" name="dueAt" defaultValue={defaultDueAt} className="text-[12.5px]" />
      </Field>
      <Note state={state} />
      <Go label="Set goal" pending="Saving…" />
    </form>
  );
}

export function GoalUpdateForm({ goalId, progress, status }: { goalId: number; progress: number; status: string }) {
  const [state, action] = useActionState<PlatformState, FormData>(updateGoalProgress, {});
  return (
    <form action={action} className="mt-1.5 space-y-1.5">
      <input type="hidden" name="goalId" value={goalId} />
      <div className="flex flex-wrap items-center gap-1.5">
        <input name="progress" type="number" min={0} max={100} defaultValue={progress} className="h-8 w-16 rounded border border-navy/15 px-2 text-[11.5px]" />
        <select name="status" defaultValue={status} className="h-8 rounded border border-navy/15 px-1.5 text-[11.5px]">
          <option value="active">active</option>
          <option value="achieved">achieved</option>
          <option value="deferred">deferred</option>
        </select>
        <input name="reviewNotes" placeholder="Review note" className="h-8 flex-1 rounded border border-navy/15 px-2 text-[11.5px]" />
        <Go label="Update" pending="…" />
      </div>
      <Note state={state} />
    </form>
  );
}

export function NoteForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState<PlatformState, FormData>(addMentoringNote, {});
  return (
    <form action={action} className="mt-1.5 space-y-1.5">
      <input type="hidden" name="studentId" value={studentId} />
      <Textarea name="body" rows={2} placeholder="Session notes: what you heard, what you named, homework agreed." className="text-[12px]" />
      <Note state={state} />
      <Go label="Save note" pending="Saving…" />
    </form>
  );
}

export function FlagForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState<PlatformState, FormData>(raiseLearnerFlag, {});
  return (
    <form action={action} className="mt-1.5 space-y-1.5">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-wrap gap-1.5">
        <Select name="severity" defaultValue="attention" className="h-8 w-28 text-[11.5px]">
          <option value="attention">attention</option>
          <option value="urgent">urgent</option>
          <option value="encouragement">encouragement</option>
        </Select>
        <input name="reason" placeholder="Why does this learner need follow-up?" className="h-8 flex-1 rounded border border-navy/15 px-2 text-[11.5px]" />
        <Go label="Flag" pending="…" />
      </div>
      <Note state={state} />
    </form>
  );
}

export function ThreadForm({ communityId }: { communityId: number }) {
  const [state, action] = useActionState<PlatformState, FormData>(postThread, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="communityId" value={communityId} />
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <Input name="title" required placeholder="Give the discussion a clear title" className="text-[12.5px]" />
        <Select name="threadType" defaultValue="discussion" className="text-[12.5px]">
          <option value="discussion">Discussion</option>
          <option value="question">Question</option>
        </Select>
      </div>
      <Textarea name="prompt" rows={2} required placeholder="Add context so the room can respond well." className="text-[12.5px]" />
      <Note state={state} />
      <Go label="Open discussion" pending="Posting…" />
    </form>
  );
}

export function ReplyForm({ threadId }: { threadId: number }) {
  const [state, action] = useActionState<PlatformState, FormData>(replyToThread, {});
  return (
    <form action={action} className="mt-2 flex flex-col gap-1.5 sm:flex-row">
      <input type="hidden" name="threadId" value={threadId} />
      <input name="body" placeholder="Add your reflection…" className="h-9 flex-1 rounded-lg border border-navy/15 bg-paper px-3 text-[12px]" />
      <Go label="Reply" pending="Sending…" />
    </form>
  );
}

export function ReportForm({ targetType, targetId }: { targetType: string; targetId: number }) {
  const [state, action] = useActionState<PlatformState, FormData>(reportContent, {});
  return (
    <form action={action} className="mt-1.5 space-y-1.5">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <div className="flex flex-wrap gap-1.5">
        <Select name="reason" defaultValue="Harmful or disrespectful" className="h-8 w-44 text-[11.5px]">
          <option>Harmful or disrespectful</option>
          <option>Spam or promotion</option>
          <option>Breach of confidence</option>
          <option>Off-topic</option>
        </Select>
        <input name="detail" placeholder="Anything the moderators should know" className="h-8 flex-1 rounded border border-navy/15 px-2 text-[11.5px]" />
        <Go label="Report" pending="…" />
      </div>
      <Note state={state} />
    </form>
  );
}

export function AttendanceForm({
  sessions,
  students,
}: {
  sessions: { id: number; title: string; startsAt: string }[];
  students: { id: string; fullName: string }[];
}) {
  const [state, action] = useActionState<PlatformState, FormData>(markAttendance, {});
  return (
    <form action={action} className="space-y-2.5">
      <Field label="Session">
        <Select name="sessionId" defaultValue={sessions[0]?.id ?? ""} className="text-[12.5px]">
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>{session.title}</option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Status">
          <Select name="status" defaultValue="present" className="text-[12.5px]">
            <option value="present">present</option>
            <option value="late">late</option>
            <option value="absent">absent</option>
            <option value="excused">excused</option>
          </Select>
        </Field>
        <Field label="Minutes">
          <Input name="minutes" type="number" min={0} defaultValue={90} className="text-[12.5px]" />
        </Field>
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium text-navy">Participants <span className="font-normal text-stone-500">(select all who attended)</span></legend>
        <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-navy/12 bg-white p-2">
          {students.map((student) => (
            <label key={student.id} className="flex items-center gap-2 px-1 text-[12px] text-stone-700">
              <input type="checkbox" name="studentIds" value={student.id} className="h-3.5 w-3.5" />
              {student.fullName}
            </label>
          ))}
        </div>
      </fieldset>
      <Note state={state} />
      <Go label="Save attendance" pending="Saving…" />
    </form>
  );
}

export function CohortForm({ levels }: { levels: { id: number; name: string }[] }) {
  const [state, action] = useActionState<PlatformState, FormData>(createCohort, {});
  return (
    <form action={action} className="space-y-2.5">
      <Field label="Cohort name">
        <Input name="name" required placeholder="Purpose Course — Cohort 05 · 2026" className="text-[12.5px]" />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} required placeholder="Who it is for and what it will do." className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Starts">
          <Input type="date" name="startsAt" required className="text-[12.5px]" />
        </Field>
        <Field label="Ends">
          <Input type="date" name="endsAt" required className="text-[12.5px]" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Level">
          <Select name="levelId" defaultValue={levels[0]?.id ?? ""} className="text-[12.5px]">
            {levels.map((level) => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Capacity">
          <Input name="capacity" type="number" min={5} defaultValue={50} className="text-[12.5px]" />
        </Field>
      </div>
      <Field label="Weeks" hint="one per line — Title | Theme">
        <Textarea
          name="weeks"
          rows={4}
          defaultValue={"Identity | Identity\nSource | Source\nPurpose | Purpose\nPotential | Potential\nVision | Destiny\nRelationships | Potential\nAction | Purpose\nTransformation | Identity"}
          className="text-[12.5px]"
        />
      </Field>
      <Note state={state} />
      <Go label="Create cohort" pending="Creating…" />
    </form>
  );
}

export function OrgForm() {
  const [state, action] = useActionState<PlatformState, FormData>(createOrganization, {});
  return (
    <form action={action} className="space-y-2.5">
      <Field label="Organisation name">
        <Input name="name" required placeholder="Purpose Partners Kenya" className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Plan">
          <Select name="plan" defaultValue="partner" className="text-[12.5px]">
            <option value="platform">platform</option>
            <option value="partner">partner</option>
            <option value="church">church</option>
            <option value="school">school</option>
          </Select>
        </Field>
        <Field label="Country">
          <Input name="country" placeholder="Kenya" className="text-[12.5px]" />
        </Field>
      </div>
      <Note state={state} />
      <Go label="Create organisation" pending="Creating…" />
    </form>
  );
}
