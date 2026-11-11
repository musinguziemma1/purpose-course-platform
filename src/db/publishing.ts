import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { activityLogs, articleReviews, articleRevisions, articleTags, articles, notifications, profiles, tags, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ARTICLE_WORKFLOW, isTransitionAction, validArticleTransition } from "@/lib/article-workflow";
import { estimateReadingMinutes, slugify } from "@/lib/utils";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const conflict = "This article changed since you opened it. Reload the page before saving or reviewing.";
function currentVersion(existing: Date, expected: string) { return Boolean(expected) && existing.getTime() === new Date(expected).getTime(); }
function nextVersion(existing: Date) { return new Date(Math.max(Date.now(), existing.getTime() + 1)); }

async function syncTags(tx: Transaction, articleId: string, raw: string) {
  await tx.delete(articleTags).where(eq(articleTags.articleId, articleId));
  const names = raw.split(",").map((name) => name.trim().slice(0, 80)).filter(Boolean).slice(0, 8);
  // Use a stable lock order when two editors introduce the same tag set.
  const unique = [...new Map(names.map((name) => [slugify(name).slice(0, 96), name])).entries()].filter(([slug]) => slug).sort(([a], [b]) => a.localeCompare(b));
  for (const [slug, name] of unique) {
    const [tag] = await tx.insert(tags).values({ name, slug }).onConflictDoUpdate({ target: tags.slug, set: { slug } }).returning({ id: tags.id });
    await tx.insert(articleTags).values({ articleId, tagId: tag.id }).onConflictDoNothing();
  }
}

export type ArticleDraftInput = {
  id: string; expectedVersion: string; title: string; body: string; categoryId: number | null;
  authorId: string; subtitle: string | null; excerpt: string; coverImageUrl: string | null; coverAlt: string;
  seoTitle: string; seoDescription: string; changeNote: string; isFeatured: boolean; tags: string;
};

export async function persistArticle(input: ArticleDraftInput, viewer: SessionUser) {
  if (!can(viewer, "content.write") && !can(viewer, "content.review")) return { error: "An editorial account is required." } as const;
  if (input.id && !uuid.test(input.id)) return { error: "Article not found." } as const;
  if (input.title.length < 6 || input.title.length > 240 || input.body.length < 80 || input.body.length > 200000 || input.subtitle && input.subtitle.length > 280 || input.coverAlt.length > 240 || input.seoTitle.length > 200 || input.changeNote.length > 280) return { error: "Check the article length and metadata limits." } as const;
  if (input.categoryId !== null && (!Number.isSafeInteger(input.categoryId) || input.categoryId < 1)) return { error: "Choose a valid category." } as const;
  return db.transaction(async (tx) => {
    const review = can(viewer, "content.review");
    const existing = input.id ? (await tx.select().from(articles).where(eq(articles.id, input.id)).for("update").limit(1))[0] : null;
    if (input.id && !existing) return { error: "Article not found." } as const;
    if (existing) {
      if (existing.authorId !== viewer.profileId && !review) return { error: "You can only edit your own articles." } as const;
      if (!review && !["draft", "revision_requested"].includes(existing.status)) return { error: "This article is in the editorial workflow. Request a revision before editing it." } as const;
      if (existing.status === "published" && !can(viewer, "content.publish")) return { error: "Publishing permission is required to edit a live article." } as const;
      if (!currentVersion(existing.updatedAt, input.expectedVersion)) return { error: conflict } as const;
    }
    const authorId = review && input.authorId ? input.authorId : existing?.authorId ?? viewer.profileId;
    if (!uuid.test(authorId)) return { error: "Choose a valid author." } as const;
    if (!existing || authorId !== existing.authorId) {
      const [author] = await tx.select({ id: profiles.id }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).where(and(eq(profiles.id, authorId), eq(users.isActive, true))).limit(1);
      if (!author) return { error: "Choose an active author account." } as const;
    }
    const payload = { title: input.title, body: input.body, categoryId: input.categoryId, subtitle: input.subtitle,
      excerpt: input.excerpt, coverImageUrl: input.coverImageUrl, coverAlt: input.coverAlt, seoTitle: input.seoTitle,
      seoDescription: input.seoDescription, readingMinutes: estimateReadingMinutes(input.body),
      isFeatured: review ? input.isFeatured : existing?.isFeatured ?? false };
    let saved: typeof articles.$inferSelect;
    if (existing) {
      const resetApproval = ["approved", "scheduled"].includes(existing.status);
      [saved] = await tx.update(articles).set({ ...payload, authorId, updatedAt: nextVersion(existing.updatedAt),
        ...(resetApproval ? { status: "draft" as const, scheduledFor: null } : {}) }).where(eq(articles.id, existing.id)).returning();
      if (resetApproval) await tx.insert(articleReviews).values({ articleId: existing.id, reviewerId: viewer.profileId, action: "restored", fromStatus: existing.status, toStatus: "draft", comment: "Approval cleared because the article was edited." });
    } else {
      const base = (slugify(input.title) || "article").slice(0, 195);
      const [created] = await tx.insert(articles).values({ ...payload, authorId, slug: base, status: "draft" }).onConflictDoNothing().returning();
      [saved] = created ? [created] : await tx.insert(articles).values({ ...payload, authorId, slug: `${base}-${randomBytes(8).toString("hex")}`, status: "draft" }).returning();
    }
    const [latest] = await tx.select({ number: articleRevisions.revisionNumber }).from(articleRevisions).where(eq(articleRevisions.articleId, saved.id)).orderBy(desc(articleRevisions.revisionNumber)).limit(1);
    await tx.insert(articleRevisions).values({ articleId: saved.id, editorId: viewer.profileId, title: input.title, body: input.body, revisionNumber: (latest?.number ?? 0) + 1, changeNote: input.changeNote || (existing ? "Draft saved" : "First draft") });
    await syncTags(tx, saved.id, input.tags);
    await tx.insert(activityLogs).values({ actorId: viewer.profileId, action: existing ? "article.updated" : "article.created", entityType: "article", entityId: saved.id, description: `${existing ? "Updated" : "Created"} article “${saved.title}”.` });
    return { ok: true, articleId: saved.id, slug: saved.slug, updatedAt: saved.updatedAt.toISOString(), created: !existing } as const;
  });
}

export async function applyArticleTransition(input: { articleId: string; action: string; comment: string; scheduledFor: string; expectedVersion: string }, viewer: SessionUser) {
  if (!uuid.test(input.articleId) || !isTransitionAction(input.action)) return { error: "Choose a valid article workflow action." } as const;
  const action = input.action, workflow = ARTICLE_WORKFLOW[action];
  if (input.comment.length > 6000) return { error: "Keep the review note under 6,000 characters." } as const;
  return db.transaction(async (tx) => {
    const [article] = await tx.select().from(articles).where(eq(articles.id, input.articleId)).for("update").limit(1);
    if (!article) return { error: "Article not found." } as const;
    const ownsWriting = article.authorId === viewer.profileId && can(viewer, "content.write");
    if (!can(viewer, "content.review") && !(ownsWriting && ["submit", "restore"].includes(action))) return { error: "Your role cannot perform that workflow action." } as const;
    if (["publish", "schedule"].includes(action) && !can(viewer, "content.publish")) return { error: "Publishing permission is required." } as const;
    if (!currentVersion(article.updatedAt, input.expectedVersion)) return { error: conflict } as const;
    if (!validArticleTransition(article.status, action)) return { error: `Cannot ${action.replaceAll("_", " ")} an article that is ${article.status.replaceAll("_", " ")}.` } as const;
    const patch: Partial<typeof articles.$inferInsert> = { updatedAt: nextVersion(article.updatedAt) };
    if (workflow.to) patch.status = workflow.to;
    if (action === "publish") { patch.publishedAt = new Date(); patch.scheduledFor = null; }
    if (action === "archive") { patch.archivedAt = new Date(); patch.scheduledFor = null; }
    if (["restore", "start_review", "request_revision", "reject"].includes(action)) patch.scheduledFor = null;
    if (action === "restore") { patch.publishedAt = null; patch.archivedAt = null; }
    if (action === "schedule") {
      const scheduledFor = new Date(input.scheduledFor);
      if (!Number.isFinite(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) return { error: "Choose a valid future date and time." } as const;
      patch.scheduledFor = scheduledFor;
    }
    if (action === "feature") patch.isFeatured = !article.isFeatured;
    const [updated] = await tx.update(articles).set(patch).where(eq(articles.id, article.id)).returning();
    await tx.insert(articleReviews).values({ articleId: article.id, reviewerId: viewer.profileId, action: workflow.review, fromStatus: article.status, toStatus: updated.status,
      comment: input.comment || (action === "feature" ? updated.isFeatured ? "Added to featured articles." : "Removed from featured articles." : null) });
    await tx.insert(activityLogs).values({ actorId: viewer.profileId, action: `article.${action}`, entityType: "article", entityId: article.id, description: `Article “${article.title}” ${workflow.label}.` });
    if (article.authorId !== viewer.profileId) await tx.insert(notifications).values({ recipientId: article.authorId, type: action === "publish" ? "publish" : "review", title: action === "publish" ? "Your article is live" : `Article ${workflow.label}`,
      body: input.comment || `“${article.title}” was ${workflow.label} by ${viewer.fullName}.`, href: `/admin/articles/${article.id}` });
    return { ok: true, articleId: article.id, slug: article.slug, updatedAt: updated.updatedAt.toISOString(), message: `Article ${workflow.label}.` } as const;
  });
}

/** All scheduled publishers share this locked, atomic path. */
export async function publishScheduledArticles(articleIds?: string[]) {
  if (articleIds && articleIds.length === 0) return 0;
  return db.transaction(async (tx) => {
    const due = await tx.select().from(articles).where(and(eq(articles.status, "scheduled"), lte(articles.scheduledFor, new Date()), articleIds ? inArray(articles.id, articleIds) : undefined))
      .orderBy(articles.id).limit(100).for("update", { skipLocked: true });
    for (const article of due) {
      await tx.update(articles).set({ status: "published", publishedAt: new Date(), scheduledFor: null, updatedAt: nextVersion(article.updatedAt) }).where(eq(articles.id, article.id));
      await tx.insert(articleReviews).values({ articleId: article.id, action: "published", fromStatus: "scheduled", toStatus: "published", comment: "Published automatically at the scheduled time." });
      await tx.insert(activityLogs).values({ action: "article.published.scheduled", entityType: "article", entityId: article.id, description: `Scheduled article “${article.title}” went live.` });
      await tx.insert(notifications).values({ recipientId: article.authorId, type: "publish", title: "Your article is live", body: `“${article.title}” was published on schedule.`, href: `/blog/${article.slug}` });
    }
    return due.length;
  });
}
