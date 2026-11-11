"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { applyArticleTransition, persistArticle, publishScheduledArticles } from "@/db/publishing";
import { canPublishArticles, getSessionUser } from "@/lib/auth";

export type ActionState = { ok?: boolean; error?: string; message?: string; updatedAt?: string };
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function refreshArticle(id: string, slug: string) {
  for (const path of ["/admin", "/admin/articles", `/admin/articles/${id}`, "/admin/reviews", "/", "/blog", `/blog/${slug}`]) revalidatePath(path);
}

export async function saveArticle(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await getSessionUser();
  if (!viewer) return { error: "Please sign in again." };
  const title = text(form, "title"), body = text(form, "body"), excerpt = text(form, "excerpt") || body.slice(0, 180);
  const result = await persistArticle({ id: text(form, "id"), expectedVersion: text(form, "expectedVersion"), title, body,
    categoryId: text(form, "categoryId") ? Number(form.get("categoryId")) : null, authorId: text(form, "authorId"),
    subtitle: text(form, "subtitle") || null, excerpt, coverImageUrl: text(form, "coverImageUrl") || null,
    coverAlt: text(form, "coverAlt") || title, seoTitle: text(form, "seoTitle") || title.slice(0, 60),
    seoDescription: text(form, "seoDescription") || excerpt.slice(0, 160), changeNote: text(form, "changeNote"),
    isFeatured: form.get("isFeatured") === "on", tags: text(form, "tags"),
  }, viewer).catch(() => ({ error: "The article could not be saved. No changes were committed. Check the category and author, then try again." } as const));
  if ("error" in result) return { error: result.error };
  refreshArticle(result.articleId, result.slug);
  if (result.created) redirect(`/admin/articles/${result.articleId}`);
  return { ok: true, message: "Article saved and revision recorded.", updatedAt: result.updatedAt };
}

export async function transitionArticle(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await getSessionUser();
  if (!viewer) return { error: "Please sign in again." };
  const result = await applyArticleTransition({ articleId: text(form, "articleId"), action: text(form, "action"),
    comment: text(form, "comment"), scheduledFor: text(form, "scheduledFor"), expectedVersion: text(form, "expectedVersion"),
  }, viewer).catch(() => ({ error: "The workflow change could not be saved. No changes were committed. Please try again." } as const));
  if ("error" in result) return { error: result.error };
  refreshArticle(result.articleId, result.slug);
  return { ok: true, message: result.message, updatedAt: result.updatedAt };
}

export async function quickPublishDue(): Promise<void> {
  const viewer = await getSessionUser();
  if (!canPublishArticles(viewer)) return;
  await publishScheduledArticles();
  for (const path of ["/admin", "/admin/articles", "/admin/reviews", "/", "/blog"]) revalidatePath(path);
}

export async function getCategoryOptions() { return db.select().from(categories).orderBy(categories.sortOrder); }
