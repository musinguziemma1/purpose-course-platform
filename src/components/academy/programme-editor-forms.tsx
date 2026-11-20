"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import {
  createProgrammeLevel,
  createProgrammeModule,
  deleteProgrammeLevel,
  deleteProgrammeModule,
  moveProgrammeItem,
  saveProgramme,
  updateProgrammeLevel,
  updateProgrammeModule,
  type ProgrammeActionState,
} from "@/app/actions/programmes";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

function ActionFeedback({ state }: { state: ProgrammeActionState }) {
  if (state.error) return <p role="alert" className="text-[11px] text-rose-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-[11px] text-source">{state.message}</p>;
  return null;
}

function SubmitButton({
  children,
  pendingLabel = "Saving…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function ProgrammeSettingsForm({
  programme,
}: {
  programme: { id: number; name: string; duration: string; structure: string; description: string };
}) {
  const [state, action] = useActionState<ProgrammeActionState, FormData>(saveProgramme, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="programmeId" value={programme.id} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Programme name">
          <Input name="name" required maxLength={200} defaultValue={programme.name} />
        </Field>
        <Field label="Duration">
          <Input name="duration" required maxLength={80} defaultValue={programme.duration} />
        </Field>
      </div>
      <Field label="Structure">
        <Input name="structure" required maxLength={180} defaultValue={programme.structure} />
      </Field>
      <Field label="Description" hint="20–5,000 characters">
        <Textarea name="description" rows={4} required minLength={20} maxLength={5000} defaultValue={programme.description} />
      </Field>
      <ActionFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton type="submit" name="intent" value="draft" size="sm" variant="outline">
          <Save /> Save as draft
        </SubmitButton>
        <SubmitButton type="submit" name="intent" value="publish" size="sm" variant="success" pendingLabel="Publishing…">
          Publish to catalogue
        </SubmitButton>
      </div>
    </form>
  );
}

export function ProgrammeLevelEditor({
  programmeId,
  level,
  position,
  total,
}: {
  programmeId: number;
  level: { id: number; name: string };
  position: number;
  total: number;
}) {
  const [state, action] = useActionState<ProgrammeActionState, FormData>(updateProgrammeLevel, {});
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="programmeId" value={programmeId} />
        <input type="hidden" name="levelId" value={level.id} />
        <Field label="Level name" className="min-w-[220px] flex-1">
          <Input name="name" required minLength={3} maxLength={200} defaultValue={level.name} />
        </Field>
        <SubmitButton type="submit" size="sm" variant="outline"><Save /> Save</SubmitButton>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ActionFeedback state={state} />
        <div className="flex items-center gap-2">
          <MoveProgrammeItemForm itemType="level" programmeId={programmeId} itemId={level.id} position={position} total={total} />
          <DeleteOutlineForm
            action={deleteProgrammeLevel}
            programmeId={programmeId}
            levelId={level.id}
            confirmation={`Remove “${level.name}” and all its outline modules?`}
            label="Remove level"
          />
        </div>
      </div>
    </div>
  );
}

export function ProgrammeModuleEditor({
  programmeId,
  levelId,
  module,
  position,
  total,
}: {
  programmeId: number;
  levelId: number;
  module: { id: number; title: string };
  position: number;
  total: number;
}) {
  const [state, action] = useActionState<ProgrammeActionState, FormData>(updateProgrammeModule, {});
  return (
    <div className="flex flex-wrap items-end gap-2">
      <form action={action} className="flex min-w-[250px] flex-1 items-end gap-2">
        <input type="hidden" name="programmeId" value={programmeId} />
        <input type="hidden" name="levelId" value={levelId} />
        <input type="hidden" name="moduleId" value={module.id} />
        <Field label="Module title" className="min-w-[200px] flex-1">
          <Input name="title" required minLength={3} maxLength={220} defaultValue={module.title} />
        </Field>
        <SubmitButton type="submit" size="sm" variant="outline" aria-label={`Save ${module.title}`}>
          <Save />
        </SubmitButton>
      </form>
      <DeleteOutlineForm
        action={deleteProgrammeModule}
        programmeId={programmeId}
        levelId={levelId}
        moduleId={module.id}
        confirmation={`Remove the module “${module.title}”?`}
        label="Remove module"
      />
      <MoveProgrammeItemForm
        itemType="module"
        programmeId={programmeId}
        levelId={levelId}
        itemId={module.id}
        position={position}
        total={total}
      />
      <ActionFeedback state={state} />
    </div>
  );
}

export function AddProgrammeLevelForm({ programmeId }: { programmeId: number }) {
  const [state, action] = useActionState<ProgrammeActionState, FormData>(createProgrammeLevel, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="programmeId" value={programmeId} />
      <Field label="New level name">
        <Input name="name" required minLength={3} maxLength={200} placeholder="New level" />
      </Field>
      <ActionFeedback state={state} />
      <SubmitButton type="submit" size="sm"><Plus /> Add level</SubmitButton>
    </form>
  );
}

export function AddProgrammeModuleForm({
  programmeId,
  levelId,
}: {
  programmeId: number;
  levelId: number;
}) {
  const [state, action] = useActionState<ProgrammeActionState, FormData>(createProgrammeModule, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="programmeId" value={programmeId} />
      <input type="hidden" name="levelId" value={levelId} />
      <Field label="New module title" className="min-w-[220px] flex-1">
        <Input name="title" required minLength={3} maxLength={220} placeholder="Module title" />
      </Field>
      <ActionFeedback state={state} />
      <SubmitButton type="submit" size="sm"><Plus /> Add module</SubmitButton>
    </form>
  );
}

type ProgrammeAction = (
  previousState: ProgrammeActionState,
  formData: FormData,
) => Promise<ProgrammeActionState>;

function MoveProgrammeItemForm({
  itemType,
  programmeId,
  levelId,
  itemId,
  position,
  total,
}: {
  itemType: "level" | "module";
  programmeId: number;
  levelId?: number;
  itemId: number;
  position: number;
  total: number;
}) {
  const [state, action] = useActionState<ProgrammeActionState, FormData>(moveProgrammeItem, {});
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="itemType" value={itemType} />
      <input type="hidden" name="programmeId" value={programmeId} />
      {levelId ? <input type="hidden" name="levelId" value={levelId} /> : null}
      <input type="hidden" name="itemId" value={itemId} />
      <SubmitButton
        type="submit"
        name="direction"
        value="up"
        size="icon-sm"
        variant="outline"
        aria-label={`Move ${itemType} up`}
        disabled={position === 0}
      >
        <ArrowUp />
      </SubmitButton>
      <SubmitButton
        type="submit"
        name="direction"
        value="down"
        size="icon-sm"
        variant="outline"
        aria-label={`Move ${itemType} down`}
        disabled={position === total - 1}
      >
        <ArrowDown />
      </SubmitButton>
      <ActionFeedback state={state} />
    </form>
  );
}

function DeleteOutlineForm({
  action,
  programmeId,
  levelId,
  moduleId,
  confirmation,
  label,
}: {
  action: ProgrammeAction;
  programmeId: number;
  levelId: number;
  moduleId?: number;
  confirmation: string;
  label: string;
}) {
  const [state, formAction] = useActionState<ProgrammeActionState, FormData>(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="programmeId" value={programmeId} />
      <input type="hidden" name="levelId" value={levelId} />
      {moduleId ? <input type="hidden" name="moduleId" value={moduleId} /> : null}
      <SubmitButton type="submit" size="sm" variant="danger" aria-label={label} pendingLabel="Removing…">
        <Trash2 /> {label}
      </SubmitButton>
      <ActionFeedback state={state} />
    </form>
  );
}
