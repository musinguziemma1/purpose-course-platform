import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function formatDate(date: Date | string | null | undefined, style: "long" | "short" = "long") {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(value);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function relativeTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - value.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value, "short");
}

export function estimateReadingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 210));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const ARTICLE_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "revision_requested",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "archived",
] as const;

export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number];

export const STATUS_META: Record<
  ArticleStatusValue,
  { label: string; tone: string; description: string }
> = {
  draft: {
    label: "Draft",
    tone: "bg-stone-100 text-stone-700 border-stone-200",
    description: "Being written by its author.",
  },
  submitted: {
    label: "Submitted",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    description: "Waiting for an editor to pick it up.",
  },
  in_review: {
    label: "In review",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    description: "An editor is reviewing the draft.",
  },
  revision_requested: {
    label: "Revision requested",
    tone: "bg-orange-50 text-orange-800 border-orange-200",
    description: "Returned to the author with notes.",
  },
  approved: {
    label: "Approved",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    description: "Cleared for scheduling.",
  },
  scheduled: {
    label: "Scheduled",
    tone: "bg-violet-50 text-violet-800 border-violet-200",
    description: "Queued for automatic publishing.",
  },
  published: {
    label: "Published",
    tone: "bg-green-50 text-green-800 border-green-200",
    description: "Live on the public blog.",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    description: "Not moving forward. Feedback recorded.",
  },
  archived: {
    label: "Archived",
    tone: "bg-slate-100 text-slate-600 border-slate-300",
    description: "Removed from the public site.",
  },
};

export const WORKFLOW_STEPS: ArticleStatusValue[] = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "scheduled",
  "published",
];
