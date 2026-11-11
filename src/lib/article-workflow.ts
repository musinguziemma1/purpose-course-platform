import type { ArticleStatusValue } from "@/lib/utils";

export const ARTICLE_WORKFLOW = {
  submit: { from: ["draft", "revision_requested"], to: "submitted", review: "submitted", label: "submitted for review" },
  start_review: { from: ["submitted", "approved", "revision_requested"], to: "in_review", review: "review_started", label: "moved into editorial review" },
  request_revision: { from: ["submitted", "in_review"], to: "revision_requested", review: "revision_requested", label: "sent back for revision" },
  approve: { from: ["submitted", "in_review"], to: "approved", review: "approved", label: "approved for publishing" },
  reject: { from: ["submitted", "in_review", "revision_requested"], to: "rejected", review: "rejected", label: "rejected" },
  schedule: { from: ["approved"], to: "scheduled", review: "scheduled", label: "scheduled for publishing" },
  publish: { from: ["approved", "scheduled"], to: "published", review: "published", label: "published" },
  archive: { from: ["published", "scheduled", "approved"], to: "archived", review: "archived", label: "archived" },
  restore: { from: ["archived", "rejected"], to: "draft", review: "restored", label: "restored to draft" },
  feature: { from: ["published", "approved", "scheduled"], to: null, review: "comment", label: "featured status updated" },
} as const satisfies Record<string, { from: ArticleStatusValue[]; to: ArticleStatusValue | null; review: string; label: string }>;

export type TransitionAction = keyof typeof ARTICLE_WORKFLOW;
export function isTransitionAction(value: string): value is TransitionAction {
  return Object.hasOwn(ARTICLE_WORKFLOW, value);
}

export function validArticleTransition(status: ArticleStatusValue, action: TransitionAction) {
  return (ARTICLE_WORKFLOW[action].from as readonly ArticleStatusValue[]).includes(status);
}
