"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  articleReviews,
  articleRevisions,
  articleTags,
  articles,
  categories,
  notifications,
  profiles,
  tags,
} from "@/db/schema";
import { canPublishArticles, canReviewArticles, getSessionUser, roleAtLeast } from "@/lib/auth";
import { estimateReadingMinutes, slugify, type ArticleStatusValue } from "@/lib/utils";

export type ActionState = { ok?: boolean; error?: string; message?: string };

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

const AUTHOR_ACTIONS: TransitionAction[] = ["submit", "restore"];
const EDITOR_ACTIONS: TransitionAction[] = [
  "start_review",
  "request_revision",
  "approve",
  "reject",
  "schedule",
  "publish",
  "archive",
  "restore",
  "feature",
];

function transitionTarget(action: TransitionAction): ArticleStatusValue | null {
  switch (action) {
    case "submit":
      return "submitted";
    case "start_review":
      return "in_review";
    case "request_revision":
      return "revision_requested";
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "schedule":
      return "scheduled";
    case "publish":
      return "published";
    case "archive":
      return "archived";
    case "restore":
      return "draft";
    default:
      return null;
  }
}

function isValidTransition(from: ArticleStatusValue, action: TransitionAction) {
  const map: Record<TransitionAction, ArticleStatusValue[]> = {
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
  return map[action].includes(from);
}

async function logActivity(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
}) {
  await db.insert(activityLogs).values(input);
}

async function notifyAuthor(input: {
  authorId: string;
  actorId: string;
  title: string;
  body: string;
  href: string;
  type?: "review" | "publish" | "system" | "community";
}) {
  if (input.authorId === input.actorId) return;
  await db.insert(notifications).values({
    recipientId: input.authorId,
    type: input.type ?? "review",
    title: input.title,
    body: input.body,
    href: input.href,
  });
}

async function syncTags(articleId: string, raw: string) {
  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  const names = raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const existing = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    const tag = existing[0] ?? (await db.insert(tags).values({ name, slug }).returning())[0];
    await db.insert(articleTags).values({ articleId, tagId: tag.id }).onConflictDoNothing();
  }
}

export async function saveArticle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user, "author")) return { error: "You need an editorial account to save articles." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 6) return { error: "Give the article a title of at least 6 characters." };
  if (body.length < 80) return { error: "The draft body needs at least 80 characters before it can be saved." };

  const categoryIdRaw = String(formData.get("categoryId") ?? "");
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;
  const requestedAuthor = String(formData.get("authorId") ?? "");
  const excerpt = String(formData.get("excerpt") ?? "").trim() || body.slice(0, 180);
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim() || null;
  const coverAlt = String(formData.get("coverAlt") ?? "").trim() || title;
  const seoTitle = String(formData.get("seoTitle") ?? "").trim() || title.slice(0, 60);
  const seoDescription = String(formData.get("seoDescription") ?? "").trim() || excerpt.slice(0, 160);
  const changeNote = String(formData.get("changeNote") ?? "").trim() || "Draft saved";
  const isFeatured = formData.get("isFeatured") === "on";
  const tagInput = String(formData.get("tags") ?? "");

  if (id) {
    const rows = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    const existing = rows[0];
    if (!existing) return { error: "That article no longer exists." };
    const isOwner = existing.authorId === user.profileId;
    if (!isOwner && !canReviewArticles(user)) return { error: "You can only edit your own articles." };
    if (existing.status === "published" && !canPublishArticles(user)) {
      return { error: "Published articles can only be edited by an editor." };
    }

    await db
      .update(articles)
      .set({
        title,
        subtitle,
        excerpt,
        body,
        categoryId,
        coverImageUrl,
        coverAlt,
        seoTitle,
        seoDescription,
        readingMinutes: estimateReadingMinutes(body),
        isFeatured: canReviewArticles(user) ? isFeatured : existing.isFeatured,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));

    const revisionRows = await db
      .select({ number: articleRevisions.revisionNumber })
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, id))
      .orderBy(desc(articleRevisions.revisionNumber))
      .limit(1);

    await db.insert(articleRevisions).values({
      articleId: id,
      editorId: user.profileId,
      title,
      body,
      revisionNumber: (revisionRows[0]?.number ?? 0) + 1,
      changeNote,
    });
    await syncTags(id, tagInput);
    await logActivity({
      actorId: user.profileId,
      action: "article.updated",
      entityType: "article",
      entityId: id,
      description: `Updated “${title}” (${changeNote}).`,
    });
    revalidatePath(`/admin/articles/${id}`);
    revalidatePath("/admin/articles");
    revalidatePath(`/blog/${slugify(title)}`);
    return { ok: true, message: "Draft saved and revision recorded." };
  }

  const authorId = canReviewArticles(user) && requestedAuthor ? requestedAuthor : user.profileId;
  const baseSlug = slugify(title) || `article-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 1;
  while ((await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(1)).length) {
    slug = `${baseSlug}-${++attempt}`;
  }

  const inserted = await db
    .insert(articles)
    .values({
      slug,
      title,
      subtitle,
      excerpt,
      body,
      status: "draft",
      categoryId,
      authorId,
      coverImageUrl,
      coverAlt,
      seoTitle,
      seoDescription,
      readingMinutes: estimateReadingMinutes(body),
      isFeatured: canReviewArticles(user) ? isFeatured : false,
    })
    .returning({ id: articles.id });

  const articleId = inserted[0].id;
  await db.insert(articleRevisions).values({
    articleId,
    editorId: user.profileId,
    title,
    body,
    revisionNumber: 1,
    changeNote: "First draft",
  });
  await syncTags(articleId, tagInput);
  await logActivity({
    actorId: user.profileId,
    action: "article.created",
    entityType: "article",
    entityId: articleId,
    description: `Created the draft “${title}”.`,
  });

  revalidatePath("/admin/articles");
  revalidatePath("/admin");
  redirect(`/admin/articles/${articleId}`);
}

export async function transitionArticle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const articleId = String(formData.get("articleId") ?? "");
  const action = String(formData.get("action") ?? "") as TransitionAction;
  const comment = String(formData.get("comment") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "");

  const rows = await db
    .select({
      article: articles,
      authorName: profiles.fullName,
    })
    .from(articles)
    .innerJoin(profiles, eq(articles.authorId, profiles.id))
    .where(eq(articles.id, articleId))
    .limit(1);
  const record = rows[0];
  if (!record) return { error: "Article not found." };

  const isOwner = record.article.authorId === user.profileId;
  const permitted =
    EDITOR_ACTIONS.includes(action) && canReviewArticles(user)
      ? true
      : AUTHOR_ACTIONS.includes(action) && isOwner;

  if (!permitted) return { error: "Your role cannot perform that workflow action." };
  if (!isValidTransition(record.article.status, action)) {
    return { error: `Cannot ${action.replace("_", " ")} an article that is currently ${record.article.status.replace("_", " ")}.` };
  }

  const nextStatus = transitionTarget(action);
  const patch: Partial<typeof articles.$inferInsert> = { updatedAt: new Date() };

  if (nextStatus) patch.status = nextStatus;
  if (action === "publish") patch.publishedAt = new Date();
  if (action === "archive") patch.archivedAt = new Date();
  if (action === "restore") {
    patch.publishedAt = null;
    patch.archivedAt = null;
    patch.scheduledFor = null;
  }
  if (action === "schedule") {
    const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;
    if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
      return { error: "Choose a valid date and time for scheduling." };
    }
    if (scheduledFor.getTime() < Date.now() - 60_000) {
      return { error: "Scheduled time must be in the future." };
    }
    patch.scheduledFor = scheduledFor;
  }
  if (action === "feature") {
    patch.isFeatured = !record.article.isFeatured;
  }

  await db.update(articles).set(patch).where(eq(articles.id, articleId));
  await db.insert(articleReviews).values({
    articleId,
    reviewerId: user.profileId,
    action:
      action === "submit"
        ? "submitted"
        : action === "start_review"
          ? "review_started"
          : action === "feature"
            ? "comment"
            : (action as "published" | "approved" | "rejected" | "revision_requested" | "scheduled" | "archived" | "restored"),
    fromStatus: record.article.status,
    toStatus: nextStatus ?? record.article.status,
    comment:
      comment ||
      (action === "feature"
        ? record.article.isFeatured
          ? "Removed from the featured rotation."
          : "Added to the featured rotation."
        : undefined),
  });

  const labels: Record<TransitionAction, string> = {
    submit: "submitted for review",
    start_review: "moved into editorial review",
    request_revision: "sent back for revision",
    approve: "approved for publishing",
    reject: "rejected",
    schedule: "scheduled for publishing",
    publish: "published",
    archive: "archived",
    restore: "restored to draft",
    feature: "featured status updated",
  };

  await logActivity({
    actorId: user.profileId,
    action: `article.${action}`,
    entityType: "article",
    entityId: articleId,
    description: `${labels[action]} “${record.article.title}”.`,
  });

  await notifyAuthor({
    authorId: record.article.authorId,
    actorId: user.profileId,
    title:
      action === "publish"
        ? "Your article is live"
        : action === "request_revision"
          ? "Revision requested"
          : action === "approve"
            ? "Article approved"
            : action === "reject"
              ? "Article needs a new direction"
              : `Article ${labels[action]}`,
    body: comment || `“${record.article.title}” was ${labels[action]} by ${user.fullName}.`,
    href: `/admin/articles/${articleId}`,
    type: action === "publish" ? "publish" : "review",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${articleId}`);
  revalidatePath("/admin/reviews");
  revalidatePath("/blog");
  revalidatePath(`/blog/${record.article.slug}`);

  return { ok: true, message: `Article ${labels[action]}.` };
}

export async function quickPublishDue(): Promise<void> {
  const user = await getSessionUser();
  if (!user || !canPublishArticles(user)) return;
  const due = await db
    .select()
    .from(articles)
    .where(and(eq(articles.status, "scheduled"), ne(articles.status, "published")));
  const now = Date.now();
  for (const article of due) {
    if (article.scheduledFor && article.scheduledFor.getTime() <= now) {
      await db
        .update(articles)
        .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(articles.id, article.id));
      await logActivity({
        actorId: user.profileId,
        action: "article.published",
        entityType: "article",
        entityId: article.id,
        description: `Published scheduled article “${article.title}”.`,
      });
    }
  }
  revalidatePath("/admin");
  revalidatePath("/blog");
}

export async function getCategoryOptions() {
  return db.select().from(categories).orderBy(categories.sortOrder);
}
