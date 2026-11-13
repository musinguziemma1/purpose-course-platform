"use client";
import { useActionState, useRef, useState } from "react";
import {
  publishAssignment,
  type AssignmentState,
} from "@/app/actions/assignments";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MediaLibrary } from "@/components/media/media-library";
export function AssignmentAuthorForm({
  levels,
  learners,
  allowLevelWide,
}: {
  levels: { id: number; name: string }[];
  learners: { id: string; name: string; levelId: number }[];
  allowLevelWide: boolean;
}) {
  const [state, action, pending] = useActionState<AssignmentState, FormData>(
    publishAssignment,
    {},
  );
  const [attachment, setAttachment] = useState<{
      id: string;
      name: string;
    } | null>(null),
    [dueAt, setDueAt] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    [open, setOpen] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <Field label="Assignment title">
        <Input
          name="title"
          minLength={6}
          maxLength={220}
          required
          placeholder="A practical task with a clear outcome"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course level">
          <Select name="levelId" required>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assign to">
          <Select name="assigneeId" required={!allowLevelWide}>
            {allowLevelWide ? (
              <option value="">Every enrolled learner in this level</option>
            ) : (
              <option value="">Choose your learner</option>
            )}
            {learners.map((learner) => (
              <option
                key={`${learner.id}-${learner.levelId}`}
                value={learner.id}
              >
                {learner.name} ·{" "}
                {levels.find((level) => level.id === learner.levelId)?.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Instructions" hint="30–10,000 characters">
        <Textarea
          name="brief"
          required
          minLength={30}
          maxLength={10000}
          rows={5}
          placeholder="Explain the task, what to submit, and what a strong response includes."
        />
      </Field>
      <Field
        label="Due date"
        hint="optional · shown in your device's local time"
      >
        <Input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
      </Field>
      <input
        name="dueAt"
        type="hidden"
        value={
          dueAt && Number.isFinite(new Date(dueAt).getTime())
            ? new Date(dueAt).toISOString()
            : ""
        }
      />
      <input name="attachmentId" type="hidden" value={attachment?.id ?? ""} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            dialog.current?.showModal();
          }}
          className="font-semibold text-gold-dark underline underline-offset-4"
        >
          Choose a library attachment
        </button>
        {attachment ? (
          <>
            <span className="break-all text-stone-600">{attachment.name}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-stone-500"
            >
              Remove
            </button>
          </>
        ) : (
          <span className="text-xs text-stone-500">optional</span>
        )}
      </div>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-label="Assignment media attachment"
        className="m-auto max-h-[90dvh] w-[min(58rem,94vw)] overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl backdrop:bg-navy/55"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-navy">Choose an attachment</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-full border border-navy/15 px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>
        {open ? (
          <MediaLibrary
            onSelect={(asset) => {
              setAttachment(asset);
              dialog.current?.close();
            }}
          />
        ) : null}
      </dialog>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          role="status"
          className="rounded-xl bg-source/10 p-3 text-sm text-source"
        >
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish assignment"}
      </button>
    </form>
  );
}
