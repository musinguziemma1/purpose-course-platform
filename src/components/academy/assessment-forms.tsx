"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Send, Users } from "lucide-react";
import {
  addQuestion,
  createAssessment,
  createGroup,
  gradeGroupSubmission,
  saveGroupSubmission,
  type AssessmentState,
} from "@/app/actions/assessments";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

function Note({ state }: { state: AssessmentState }) {
  if (state.error) return <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p>;
  if (state.ok) return <p className="rounded-md border border-source/30 bg-source/5 px-2.5 py-2 text-[11.5px] text-source">{state.message}</p>;
  return null;
}

function Submit({ label, icon = "send" }: { label: string; icon?: "send" | "check" | "users" }) {
  const { pending } = useFormStatus();
  const Icon = icon === "check" ? Check : icon === "users" ? Users : Send;
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {pending ? "Working…" : label}
    </Button>
  );
}

export function GroupSubmissionForm({
  groupId,
  existingTitle,
  existingBody,
}: {
  groupId: number;
  existingTitle: string | null;
  existingBody: string | null;
}) {
  const [state, action] = useActionState<AssessmentState, FormData>(saveGroupSubmission, {});
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="groupId" value={groupId} />
      <Field label="Deliverable title">
        <Input name="title" required defaultValue={existingTitle ?? ""} placeholder="Gifting evidence panel — group 2" className="text-[12.5px]" />
      </Field>
      <Field label="Group output" hint="one group voice">
        <Textarea
          name="body"
          rows={5}
          required
          defaultValue={existingBody ?? ""}
          placeholder="Summarise your group's work: what you found, what you disagreed on, and what you recommend."
          className="text-[12.5px]"
        />
      </Field>
      <Note state={state} />
      <div className="flex gap-2">
        <Button type="submit" name="intent" value="submit" size="sm">
          <Send className="h-3.5 w-3.5" /> Submit to mentor
        </Button>
        <Button type="submit" name="intent" value="draft" size="sm" variant="outline">
          Save draft
        </Button>
      </div>
    </form>
  );
}

export function GroupScoreForm({ submissionId }: { submissionId: number }) {
  const [state, action] = useActionState<AssessmentState, FormData>(gradeGroupSubmission, {});
  return (
    <form action={action} className="mt-3 space-y-2 rounded-lg border border-navy/10 bg-cream/30 p-3">
      <input type="hidden" name="submissionId" value={submissionId} />
      <div className="grid grid-cols-[5rem_1fr] items-end gap-2">
        <Field label="Score">
          <Input name="score" type="number" min={0} max={100} defaultValue={80} className="h-9 text-[12.5px]" />
        </Field>
        <Field label="Informative feedback" hint="visible to the group">
          <Textarea name="feedback" rows={3} placeholder="One strength, one gap, one next action." className="text-[12.5px]" />
        </Field>
      </div>
      <Note state={state} />
      <Submit label="Publish score & feedback" icon="check" />
    </form>
  );
}

export function GroupForm({ courses, students }: { courses: { id: number; title: string }[]; students: { id: string; fullName: string }[] }) {
  const [state, action] = useActionState<AssessmentState, FormData>(createGroup, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Group name">
        <Input name="name" required placeholder="Clarity Panel B" className="text-[12.5px]" />
      </Field>
      <Field label="Course" hint="optional">
        <Select name="courseId" defaultValue="" className="text-[12.5px]">
          <option value="">No specific course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Collaborative brief">
        <Textarea
          name="brief"
          rows={3}
          placeholder="What the group must produce together — one deliverable, shared score."
          className="text-[12.5px]"
        />
      </Field>
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium text-navy">Members <span className="font-normal text-stone-500">(select 2–8)</span></legend>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-navy/12 bg-white p-2">
          {students.map((student) => (
            <label key={student.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-[12px] text-stone-700 hover:bg-cream/50">
              <input type="checkbox" name="memberIds" value={student.id} className="h-3.5 w-3.5 rounded border-navy/30" />
              {student.fullName}
            </label>
          ))}
        </div>
      </fieldset>
      <Note state={state} />
      <Submit label="Form the group" icon="users" />
    </form>
  );
}

export function AssessmentForm({
  levels,
  courses,
  modules,
}: {
  levels: { id: number; name: string }[];
  courses: { id: number; title: string }[];
  modules: { id: number; title: string }[];
}) {
  const [state, action] = useActionState<AssessmentState, FormData>(createAssessment, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Assessment title">
        <Input name="title" required placeholder="PURP 201 — session check" className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select name="kind" defaultValue="session" className="text-[12.5px]">
            <option value="session">Session quiz (5 questions)</option>
            <option value="level">Level exam (20 questions)</option>
          </Select>
        </Field>
        <Field label="Pass mark %">
          <Input name="passMark" type="number" min={50} max={100} defaultValue={80} className="text-[12.5px]" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <Select name="levelId" defaultValue={levels[0]?.id ?? ""} className="text-[12.5px]">
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Course" hint="optional">
          <Select name="courseId" defaultValue={courses[0]?.id ?? ""} className="text-[12.5px]">
            <option value="">None</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Module" hint="session quizzes only">
        <Select name="moduleId" defaultValue={modules[0]?.id ?? ""} className="text-[12.5px]">
          <option value="">None</option>
          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Instructions">
        <Textarea name="description" rows={2} className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Time limit (min)">
          <Input name="timeLimitMinutes" type="number" min={5} defaultValue={15} className="text-[12.5px]" />
        </Field>
        <Field label="Max attempts">
          <Input name="maxAttempts" type="number" min={1} max={10} defaultValue={3} className="text-[12.5px]" />
        </Field>
      </div>
      <Note state={state} />
      <Submit label="Create assessment" icon="check" />
    </form>
  );
}

export function QuestionForm({ assessmentId, nextIndex }: { assessmentId: number; nextIndex: number }) {
  const [state, action] = useActionState<AssessmentState, FormData>(addQuestion, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <Field label={`Question ${nextIndex}`}>
        <Textarea name="prompt" rows={2} required placeholder="In PURP 101, purpose is best described as…" className="text-[12.5px]" />
      </Field>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-5 text-[11px] font-semibold text-stone-500">{String.fromCharCode(65 + index)}</span>
            <Input name={`option${index}`} placeholder={index < 2 ? "Required option" : "Optional option"} className="text-[12.5px]" />
            <label className="inline-flex items-center gap-1 text-[10.5px] text-stone-600">
              <input type="radio" name="correctIndex" value={index} defaultChecked={index === 0} className="h-3.5 w-3.5" />
              correct
            </label>
          </div>
        ))}
      </div>
      <Field label="Explanation" hint="shown after submission">
        <Textarea name="explanation" rows={2} className="text-[12.5px]" />
      </Field>
      <Note state={state} />
      <Submit label="Add question" icon="check" />
    </form>
  );
}
