"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Plus, Save as SaveIcon } from "lucide-react";
import {
  createCourse,
  createLevel,
  createModule,
  saveLesson,
  saveLiveSession,
  saveRecording,
  updateCourse,
  updateModule,
  type AcademyState,
} from "@/app/actions/academy";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function Note({ state }: { state: AcademyState }) {
  if (state.error) return <p className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p>;
  if (state.ok) return <p className="rounded-md border border-source/30 bg-source/5 px-2.5 py-2 text-[11.5px] text-source">{state.message}</p>;
  return null;
}

function SaveButton({ label = "Save", icon = "save", className }: { label?: string; icon?: "save" | "plus"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className={className ?? "w-full"}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon === "plus" ? <Plus className="h-3.5 w-3.5" /> : <SaveButton className="h-3.5 w-3.5" />}
      {pending ? "Saving…" : label}
    </Button>
  );
}

const ACCENTS = ["navy", "green", "gold", "purple", "teal"];

export function LevelForm() {
  const [state, action] = useActionState<AcademyState, FormData>(createLevel, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Level name">
        <Input name="name" required placeholder="Advanced" className="text-[12.5px]" />
      </Field>
      <Field label="Tagline">
        <Input name="tagline" required placeholder="Influence and Impact" className="text-[12.5px]" />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={3} required placeholder="What this level forms in the participant." className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weeks">
          <Input name="weeks" type="number" min={1} max={20} defaultValue={5} className="text-[12.5px]" />
        </Field>
        <Field label="Accent">
          <Select name="accent" defaultValue="teal" className="text-[12.5px]">
            {ACCENTS.map((accent) => (
              <option key={accent} value={accent}>
                {accent}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Outcomes" hint="one per line">
        <Textarea name="outcomes" rows={3} placeholder={"Articulate a purpose statement\nBuild a 12-month plan"} className="text-[12.5px]" />
      </Field>
      <Note state={state} />
      <SaveButton label="Create level" icon="plus" />
    </form>
  );
}

export function CourseForm({ levels }: { levels: { id: number; name: string }[] }) {
  const [state, action] = useActionState<AcademyState, FormData>(createCourse, {});
  return (
    <form action={action} className="space-y-3">
      <Field label="Level">
        <Select name="levelId" defaultValue={levels[0]?.id ?? ""} className="text-[12.5px]">
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Course title">
        <Input name="title" required placeholder="Purpose Discovery and Clarity" className="text-[12.5px]" />
      </Field>
      <Field label="Subtitle" hint="optional">
        <Input name="subtitle" placeholder="From vague calling to a defensible statement" className="text-[12.5px]" />
      </Field>
      <Field label="Summary">
        <Textarea name="summary" rows={3} required placeholder="What the course covers and who it serves." className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estimated hours">
          <Input name="estimatedHours" type="number" min={1} max={60} defaultValue={4} className="text-[12.5px]" />
        </Field>
        <Field label="Accent">
          <Select name="accent" defaultValue="green" className="text-[12.5px]">
            {ACCENTS.map((accent) => (
              <option key={accent} value={accent}>
                {accent}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Cover image URL" hint="optional">
        <Input name="coverImageUrl" placeholder="https://…" className="text-[12px]" />
      </Field>
      <label className="flex items-center gap-2 text-[12px] text-navy">
        <input type="checkbox" name="isSequential" defaultChecked className="h-4 w-4 rounded border-navy/30 text-gold" />
        Progression mode — lessons unlock in order
      </label>
      <Note state={state} />
      <SaveButton label="Create course" icon="plus" />
    </form>
  );
}

export function CourseSettingsForm({
  course,
}: {
  course: {
    id: number;
    title: string;
    subtitle: string | null;
    summary: string;
    description: string | null;
    coverImageUrl: string | null;
    accent: string;
    estimatedHours: number;
    isSequential: boolean;
    status: string;
  };
}) {
  const [state, action] = useActionState<AcademyState, FormData>(updateCourse, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={course.id} />
      <Field label="Title">
        <Input name="title" defaultValue={course.title} className="text-[12.5px]" />
      </Field>
      <Field label="Subtitle">
        <Input name="subtitle" defaultValue={course.subtitle ?? ""} className="text-[12.5px]" />
      </Field>
      <Field label="Summary">
        <Textarea name="summary" rows={3} defaultValue={course.summary} className="text-[12.5px]" />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={3} defaultValue={course.description ?? ""} className="text-[12.5px]" />
      </Field>
      <Field label="Cover image URL">
        <Input name="coverImageUrl" defaultValue={course.coverImageUrl ?? ""} className="text-[12px]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Accent">
          <Select name="accent" defaultValue={course.accent} className="text-[12.5px]">
            {ACCENTS.map((accent) => (
              <option key={accent} value={accent}>
                {accent}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={course.status} className="text-[12.5px]">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
      </div>
      <Field label="Estimated hours">
        <Input name="estimatedHours" type="number" min={1} defaultValue={course.estimatedHours} className="text-[12.5px]" />
      </Field>
      <label className="flex items-center gap-2 text-[12px] text-navy">
        <input
          type="checkbox"
          name="isSequential"
          defaultChecked={course.isSequential}
          className="h-4 w-4 rounded border-navy/30 text-gold"
        />
        Progression mode
      </label>
      <Note state={state} />
      <SaveButton label="Save course" />
    </form>
  );
}

export function ModuleForm({ courseId }: { courseId: number }) {
  const [state, action] = useActionState<AcademyState, FormData>(createModule, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <Field label="Module title">
        <Input name="title" required placeholder="Discovering Your Purpose" className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Session code" hint="optional">
          <Input name="sessionCode" placeholder="PURP 201" className="text-[12.5px]" />
        </Field>
        <Field label="Minutes">
          <Input name="estimatedMinutes" type="number" min={5} defaultValue={45} className="text-[12.5px]" />
        </Field>
      </div>
      <Field label="Summary" hint="optional">
        <Textarea name="summary" rows={2} className="text-[12.5px]" />
      </Field>
      <label className="flex items-center gap-2 text-[12px] text-navy">
        <input type="checkbox" name="isPreview" className="h-4 w-4 rounded border-navy/30 text-gold" />
        Open as a free preview module
      </label>
      <Note state={state} />
      <SaveButton label="Add module" icon="plus" />
    </form>
  );
}

export function ModuleSettingsForm({
  module,
  courseId,
}: {
  module: { id: number; title: string; summary: string | null; sessionCode: string | null; estimatedMinutes: number; isPreview: boolean };
  courseId: number;
}) {
  const [state, action] = useActionState<AcademyState, FormData>(updateModule, {});
  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="moduleId" value={module.id} />
      <input type="hidden" name="courseId" value={courseId} />
      <Input name="title" defaultValue={module.title} className="text-[12.5px]" />
      <Textarea name="summary" rows={2} defaultValue={module.summary ?? ""} placeholder="Module summary" className="text-[12.5px]" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="sessionCode" defaultValue={module.sessionCode ?? ""} placeholder="PURP 201" className="text-[12px]" />
        <Input name="estimatedMinutes" type="number" min={5} defaultValue={module.estimatedMinutes} className="text-[12px]" />
      </div>
      <label className="flex items-center gap-2 text-[11.5px] text-navy">
        <input type="checkbox" name="isPreview" defaultChecked={module.isPreview} className="h-3.5 w-3.5 rounded border-navy/30 text-gold" />
        Preview module
      </label>
      <Note state={state} />
      <SaveButton label="Save module" />
    </form>
  );
}

const KINDS = ["video", "audio", "reading", "illustration", "download", "practice", "live"];

export function LessonForm({
  courseId,
  moduleId,
  lesson,
}: {
  courseId: number;
  moduleId: number;
  lesson?: {
    id: number;
    title: string;
    kind: string;
    summary: string | null;
    body: string;
    videoUrl: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
    downloadUrl: string | null;
    downloadLabel: string | null;
    transcript: string | null;
    practicePrompt: string | null;
    durationMinutes: number;
    isPreview: boolean;
    status: string;
  };
}) {
  const [state, action] = useActionState<AcademyState, FormData>(saveLesson, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      {lesson ? <input type="hidden" name="lessonId" value={lesson.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Lesson title">
          <Input name="title" required defaultValue={lesson?.title} placeholder="Discovering Your Purpose" className="text-[12.5px]" />
        </Field>
        <Field label="Format">
          <Select name="kind" defaultValue={lesson?.kind ?? "reading"} className="text-[12.5px]">
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Summary">
        <Input name="summary" defaultValue={lesson?.summary ?? ""} placeholder="One line shown in the outline" className="text-[12.5px]" />
      </Field>
      <Field label="Structured content" hint="markdown: ## headings, lists, quotes, :::callout">
        <Textarea name="body" rows={7} required defaultValue={lesson?.body} placeholder="Write the teaching in sections…" className="text-[12.5px]" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Video URL" hint="mp4 or YouTube/Vimeo">
          <Input name="videoUrl" defaultValue={lesson?.videoUrl ?? ""} placeholder="https://…mp4" className="text-[12px]" />
        </Field>
        <Field label="Audio URL">
          <Input name="audioUrl" defaultValue={lesson?.audioUrl ?? ""} placeholder="https://…mp3" className="text-[12px]" />
        </Field>
        <Field label="Illustration image URL">
          <Input name="imageUrl" defaultValue={lesson?.imageUrl ?? ""} placeholder="https://…jpg" className="text-[12px]" />
        </Field>
        <Field label="Image alt text">
          <Input name="imageAlt" defaultValue={lesson?.imageAlt ?? ""} className="text-[12px]" />
        </Field>
        <Field label="Download URL" hint="worksheet / PDF">
          <Input name="downloadUrl" defaultValue={lesson?.downloadUrl ?? ""} placeholder="/api/resources/…/download" className="text-[12px]" />
        </Field>
        <Field label="Download label">
          <Input name="downloadLabel" defaultValue={lesson?.downloadLabel ?? ""} placeholder="Download the worksheet" className="text-[12px]" />
        </Field>
      </div>
      <Field label="Practice prompt">
        <Textarea name="practicePrompt" rows={2} defaultValue={lesson?.practicePrompt ?? ""} className="text-[12.5px]" />
      </Field>
      <Field label="Transcript / teaching notes">
        <Textarea name="transcript" rows={2} defaultValue={lesson?.transcript ?? ""} className="text-[12.5px]" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Minutes">
          <Input name="durationMinutes" type="number" min={1} defaultValue={lesson?.durationMinutes ?? 10} className="text-[12.5px]" />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={lesson?.status ?? "published"} className="text-[12.5px]">
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-[12px] text-navy">
            <input type="checkbox" name="isPreview" defaultChecked={lesson?.isPreview} className="h-4 w-4 rounded border-navy/30 text-gold" />
            Free preview
          </label>
        </div>
      </div>
      <Note state={state} />
      <SaveButton label={lesson ? "Save lesson" : "Add lesson"} icon={lesson ? "save" : "plus"} />
    </form>
  );
}

export function LiveSessionForm({
  courses,
  hosts,
}: {
  courses: { id: number; title: string }[];
  hosts: { id: string; fullName: string }[];
}) {
  const [state, action] = useActionState<AcademyState, FormData>(saveLiveSession, {});
  const [defaultStartsAt] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16));
  return (
    <form action={action} className="space-y-3">
      <Field label="Session title">
        <Input name="title" required placeholder="Clarity lab — purpose statements" className="text-[12.5px]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select name="type" defaultValue="class" className="text-[12.5px]">
            <option value="class">Live class</option>
            <option value="group_work">Group work</option>
            <option value="discussion">Discussion</option>
            <option value="office_hours">Office hours</option>
          </Select>
        </Field>
        <Field label="Host">
          <Select name="hostId" defaultValue={hosts[0]?.id ?? ""} className="text-[12.5px]">
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.fullName}
              </option>
            ))}
          </Select>
        </Field>
      </div>
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at">
          <Input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={defaultStartsAt}
            className="text-[12.5px]"
          />
        </Field>
        <Field label="Minutes">
          <Input name="durationMinutes" type="number" min={15} defaultValue={90} className="text-[12.5px]" />
        </Field>
      </div>
      <Field label="Meeting link">
        <Input name="meetingUrl" placeholder="https://meet.google.com/…" className="text-[12.5px]" />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} className="text-[12.5px]" />
      </Field>
      <Field label="Agenda / group brief">
        <Textarea name="agenda" rows={3} placeholder={"1. Teaching\n2. Groups of four\n3. One finding per group"} className="text-[12.5px]" />
      </Field>
      <Field label="Group size" hint="group work only">
        <Input name="groupSize" type="number" min={2} max={12} placeholder="4" className="text-[12.5px]" />
      </Field>
      <Note state={state} />
      <SaveButton label="Schedule session" icon="plus" />
    </form>
  );
}

export function RecordingForm({ sessionId }: { sessionId: number }) {
  const [state, action] = useActionState<AcademyState, FormData>(saveRecording, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <Label>Recording link</Label>
      <Input name="recordingUrl" placeholder="https://…" className="text-[12px]" />
      <Note state={state} />
      <Button type="submit" size="sm" className="w-full">
        <Check className="h-3.5 w-3.5" /> Attach & close session
      </Button>
    </form>
  );
}
