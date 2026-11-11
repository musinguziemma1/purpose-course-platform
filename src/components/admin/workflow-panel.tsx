"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { transitionArticle, type ActionState } from "@/app/actions/publishing";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { STATUS_META, WORKFLOW_STEPS, type ArticleStatusValue, cn } from "@/lib/utils";

type TransitionAction =
  | "submit"
  | "start_review"
  | "request_revision"
  | "approve"
  | "reject"
  | "schedule"
  | "publish"
  | "archive"
  | "restore"
  | "feature";

const AUTHOR_ACTIONS: { action: TransitionAction; label: string; variant: "default" | "gold" | "outline" | "danger" | "subtle" }[] = [
  { action: "submit", label: "Submit for review", variant: "default" },
];

const EDITOR_ACTIONS: { action: TransitionAction; label: string; variant: "default" | "gold" | "outline" | "danger" | "subtle" }[] = [
  { action: "start_review", label: "Start review", variant: "outline" },
  { action: "approve", label: "Approve", variant: "default" },
  { action: "publish", label: "Publish now", variant: "gold" },
  { action: "schedule", label: "Schedule", variant: "subtle" },
  { action: "request_revision", label: "Request revision", variant: "outline" },
  { action: "reject", label: "Reject", variant: "danger" },
  { action: "archive", label: "Archive", variant: "outline" },
  { action: "restore", label: "Restore to draft", variant: "outline" },
];

const VALID: Record<TransitionAction, ArticleStatusValue[]> = {
  submit: ["draft", "revision_requested"],
  start_review: ["submitted", "approved", "revision_requested"],
  request_revision: ["submitted", "in_review"],
  approve: ["in_review", "submitted"],
  reject: ["submitted", "in_review", "revision_requested"],
  schedule: ["approved"],
  publish: ["approved", "scheduled"],
  archive: ["published", "scheduled", "approved"],
  restore: ["archived", "rejected"],
  feature: ["published", "approved", "scheduled"],
};

function ActionButton({
  action,
  label,
  variant,
}: {
  action: string;
  label: string;
  variant: "default" | "gold" | "outline" | "danger" | "subtle";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name="action" value={action} variant={variant} size="sm" disabled={pending} className="w-full">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function WorkflowPanel({
  articleId,
  status,
  isOwner,
  canReview,
  scheduledFor,
}: {
  articleId: string;
  status: string;
  isOwner: boolean;
  canReview: boolean;
  scheduledFor: Date | string | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(transitionArticle, {});
  const [defaultScheduledFor] = useState(() => new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16));
  const statusValue = status as ArticleStatusValue;

  const actions = [
    ...(isOwner ? AUTHOR_ACTIONS : []),
    ...(canReview ? EDITOR_ACTIONS : []),
  ].filter((item) => VALID[item.action as TransitionAction].includes(statusValue));

  const stepIndex = WORKFLOW_STEPS.indexOf(statusValue);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-navy/10 bg-paper p-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-500">Workflow</p>
        <ol className="mt-3 space-y-1.5">
          {WORKFLOW_STEPS.map((step, index) => {
            const complete = stepIndex >= 0 && index < stepIndex;
            const current = step === statusValue;
            return (
              <li key={step} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[9px] font-bold",
                    current
                      ? "border-gold bg-gold text-ink"
                      : complete
                        ? "border-source bg-source text-paper"
                        : "border-navy/20 bg-paper text-stone-400",
                  )}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <span className={cn("text-[12px]", current ? "font-semibold text-navy" : complete ? "text-stone-600" : "text-stone-400")}>
                  {STATUS_META[step].label}
                </span>
              </li>
            );
          })}
        </ol>
        {["revision_requested", "rejected", "archived"].includes(statusValue) ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11.5px] text-amber-800">
            {STATUS_META[statusValue].description}
          </p>
        ) : null}
      </div>

      <form action={formAction} className="rounded-xl border border-navy/10 bg-paper p-4">
        <input type="hidden" name="articleId" value={articleId} />
        <Label hint="optional">Review note</Label>
        <Textarea
          name="comment"
          rows={3}
          placeholder="Feedback, rejection reason or revision notes visible in the history."
          className="text-[12.5px]"
        />
        {canReview ? (
          <div className="mt-3">
            <Label hint="editor">Schedule date</Label>
            <input
              type="datetime-local"
              name="scheduledFor"
              defaultValue={
                scheduledFor
                  ? new Date(scheduledFor).toISOString().slice(0, 16)
                  : defaultScheduledFor
              }
              className="h-10 w-full rounded-lg border border-navy/15 bg-white px-3 text-[12.5px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
            />
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {actions.length ? (
            actions.map((item) => (
              <ActionButton key={item.action} action={item.action} label={item.label} variant={item.variant} />
            ))
          ) : (
            <p className="rounded-md bg-cream px-2.5 py-2 text-[11.5px] text-stone-600">
              No actions available for your role at this stage.
            </p>
          )}
        </div>

        {state.ok ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-md border border-source/30 bg-source/5 px-2.5 py-2 text-[11.5px] text-source">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {state.message}
          </p>
        ) : null}
        {state.error ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{state.error}</p>
        ) : null}
      </form>
    </div>
  );
}
