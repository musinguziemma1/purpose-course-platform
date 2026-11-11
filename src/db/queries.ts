import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  articleReviews,
  articleRevisions,
  articleTags,
  articles,
  categories,
  courseLevels,
  courseSessions,
  discussionGroups,
  discussionPosts,
  discussionThreads,
  enrollments,
  notifications,
  pages,
  profiles,
  resourceDownloads,
  resources,
  roles,
  siteSettings,
  subscribers,
  tags,
  testimonials,
  users,
} from "@/db/schema";
import type { ArticleStatusValue } from "@/lib/utils";
import { getSessionUser } from "@/lib/auth";
import { groupReadable, threadReadable } from "@/db/community-access";
import { can } from "@/lib/rbac";

/* ------------------------------------------------------------------ *
 * Publishing automation — promotes scheduled articles when due
 * ------------------------------------------------------------------ */

export async function publishDueArticles() {
  const due = await db
    .select({ id: articles.id, title: articles.title, authorId: articles.authorId })
    .from(articles)
    .where(
      and(eq(articles.status, "scheduled"), lte(articles.scheduledFor, new Date())),
    );

  for (const article of due) {
    await db
      .update(articles)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(articles.id, article.id));
    await db.insert(articleReviews).values({
      articleId: article.id,
      action: "published",
      fromStatus: "scheduled",
      toStatus: "published",
      comment: "Published automatically at the scheduled time.",
    });
    await db.insert(activityLogs).values({
      action: "article.published.scheduled",
      entityType: "article",
      entityId: article.id,
      description: `Scheduled article “${article.title}” went live automatically.`,
    });
    await db.insert(notifications).values({
      recipientId: article.authorId,
      type: "publish",
      title: "Your article is live",
      body: `“${article.title}” was published on schedule.`,
      href: `/blog/${(await getArticleSlug(article.id)) ?? ""}`,
    });
  }
  return due.length;
}

async function getArticleSlug(id: string) {
  const rows = await db.select({ slug: articles.slug }).from(articles).where(eq(articles.id, id)).limit(1);
  return rows[0]?.slug;
}

/* ------------------------------------------------------------------ *
 * Public publishing queries
 * ------------------------------------------------------------------ */

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  coverAlt: string | null;
  readingMinutes: number;
  publishedAt: Date | null;
  isFeatured: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  categoryAccent: string | null;
  authorName: string;
  authorTitle: string | null;
  authorAvatarUrl: string | null;
};

const articleCardSelection = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  subtitle: articles.subtitle,
  excerpt: articles.excerpt,
  coverImageUrl: articles.coverImageUrl,
  coverAlt: articles.coverAlt,
  readingMinutes: articles.readingMinutes,
  publishedAt: articles.publishedAt,
  isFeatured: articles.isFeatured,
  categoryName: categories.name,
  categorySlug: categories.slug,
  categoryAccent: categories.accent,
  authorName: profiles.fullName,
  authorTitle: profiles.title,
  authorAvatarUrl: profiles.avatarUrl,
};

export async function getPublishedArticles(options: {
  categorySlug?: string;
  tagSlug?: string;
  query?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { categorySlug, tagSlug, query, limit = 9, offset = 0 } = options;
  const filters = [eq(articles.status, "published")];
  if (categorySlug) filters.push(eq(categories.slug, categorySlug));
  if (query) {
    filters.push(
      or(
        ilike(articles.title, `%${query}%`),
        ilike(articles.excerpt, `%${query}%`),
        ilike(articles.body, `%${query}%`),
      )!,
    );
  }
  if (tagSlug) {
    filters.push(
      sql`exists (select 1 from ${articleTags} inner join ${tags} on ${tags.id} = ${articleTags.tagId} where ${articleTags.articleId} = ${articles.id} and ${tags.slug} = ${tagSlug})`,
    );
  }

  const rows = await db
    .select(articleCardSelection)
    .from(articles)
    .innerJoin(profiles, eq(articles.authorId, profiles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);

  const totals = await db
    .select({ value: count() })
    .from(articles)
    .innerJoin(profiles, eq(articles.authorId, profiles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(...filters));

  return { items: rows as ArticleCard[], total: Number(totals[0]?.value ?? 0) };
}

export async function getFeaturedArticles(limit = 4) {
  const rows = await db
    .select(articleCardSelection)
    .from(articles)
    .innerJoin(profiles, eq(articles.authorId, profiles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.isFeatured), desc(articles.publishedAt))
    .limit(limit);
  return rows as ArticleCard[];
}

export async function getArticleBySlug(slug: string) {
  const rows = await db
    .select({
      ...articleCardSelection,
      body: articles.body,
      seoTitle: articles.seoTitle,
      seoDescription: articles.seoDescription,
      principleQuestion: categories.principleQuestion,
      categoryId: articles.categoryId,
      authorId: articles.authorId,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .innerJoin(profiles, eq(articles.authorId, profiles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);

  const article = rows[0];
  if (!article) return null;

  const [articleTagRows, relatedRows] = await Promise.all([
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, article.id)),
    db
      .select(articleCardSelection)
      .from(articles)
      .innerJoin(profiles, eq(articles.authorId, profiles.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(
        and(
          eq(articles.status, "published"),
          article.categoryId ? eq(articles.categoryId, article.categoryId) : sql`true`,
          sql`${articles.id} <> ${article.id}`,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(3),
  ]);

  return { ...article, tags: articleTagRows, related: relatedRows as ArticleCard[] };
}

export async function getCategoriesWithCounts() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      principleQuestion: categories.principleQuestion,
      description: categories.description,
      accent: categories.accent,
      sortOrder: categories.sortOrder,
      articleCount: sql<number>`count(${articles.id}) filter (where ${articles.status} = 'published')::int`,
    })
    .from(categories)
    .leftJoin(articles, eq(articles.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
}

export async function getPopularTags(limit = 12) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      articleCount: sql<number>`count(${articleTags.articleId})::int`,
    })
    .from(tags)
    .leftJoin(articleTags, eq(articleTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${articleTags.articleId})`))
    .limit(limit);
}

/* ------------------------------------------------------------------ *
 * Course, resources, testimonials
 * ------------------------------------------------------------------ */

export async function getCourseProgram() {
  const [levels, sessions] = await Promise.all([
    db.select().from(courseLevels).orderBy(asc(courseLevels.sortOrder)),
    db.select().from(courseSessions).orderBy(asc(courseSessions.sortOrder)),
  ]);
  return levels.map((level) => ({
    ...level,
    sessions: sessions.filter((session) => session.levelId === level.id),
  }));
}

export async function getResources(limit = 12) {
  return db.select().from(resources).orderBy(desc(resources.isFeatured), asc(resources.id)).limit(limit);
}

export async function getTestimonials(limit = 6) {
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.isFeatured, true))
    .orderBy(asc(testimonials.sortOrder))
    .limit(limit);
}

/* ------------------------------------------------------------------ *
 * Community (live discussions + notifications)
 * ------------------------------------------------------------------ */

export type ThreadSummary = {
  id: number;
  title: string;
  prompt: string | null;
  authorName: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  lastActivityAt: Date;
  groupName: string | null;
  groupAccent: string | null;
  latestPost: { authorName: string; body: string; createdAt: Date } | null;
};

export async function getDiscussionGroups() {
  return db.select().from(discussionGroups).where(groupReadable(await getSessionUser())).orderBy(asc(discussionGroups.id));
}

export async function getThreads(limit = 8): Promise<ThreadSummary[]> {
  const viewer = await getSessionUser();
  const rows = await db
    .select({
      id: discussionThreads.id,
      title: discussionThreads.title,
      prompt: discussionThreads.prompt,
      authorName: discussionThreads.authorName,
      isPinned: discussionThreads.isPinned,
      isLocked: discussionThreads.isLocked,
      replyCount: discussionThreads.replyCount,
      lastActivityAt: discussionThreads.lastActivityAt,
      groupName: discussionGroups.name,
      groupAccent: discussionGroups.accent,
    })
    .from(discussionThreads)
    .leftJoin(discussionGroups, eq(discussionThreads.groupId, discussionGroups.id))
    .where(threadReadable(viewer))
    .orderBy(desc(discussionThreads.isPinned), desc(discussionThreads.lastActivityAt))
    .limit(limit);

  if (rows.length === 0) return [];
  const threadIds = rows.map((row) => row.id);
  const posts = await db
    .select()
    .from(discussionPosts)
    .where(and(inArray(discussionPosts.threadId, threadIds), eq(discussionPosts.isRemoved, false)))
    .orderBy(desc(discussionPosts.createdAt));

  const latestByThread = new Map<number, { authorName: string; body: string; createdAt: Date }>();
  for (const post of posts) {
    if (!latestByThread.has(post.threadId)) {
      latestByThread.set(post.threadId, {
        authorName: post.authorName,
        body: post.body,
        createdAt: post.createdAt,
      });
    }
  }

  return rows.map((row) => ({ ...row, latestPost: latestByThread.get(row.id) ?? null }));
}

export async function getThreadsWithPosts(limit = 6) {
  const threads = await getThreads(limit);
  if (threads.length === 0) return [];
  const posts = await db
    .select()
    .from(discussionPosts)
    .where(and(eq(discussionPosts.isRemoved, false),
      inArray(
        discussionPosts.threadId,
        threads.map((thread) => thread.id),
      ),
    ))
    .orderBy(asc(discussionPosts.createdAt));
  return threads.map((thread) => ({
    ...thread,
    posts: posts.filter((post) => post.threadId === thread.id).slice(-4),
  }));
}

export async function getNotificationsFor(profileId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, profileId))
    .orderBy(desc(notifications.createdAt))
    .limit(12);
}

export async function getUnreadNotificationCount(profileId: string) {
  const rows = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, profileId), eq(notifications.isRead, false)));
  return Number(rows[0]?.value ?? 0);
}

/* ------------------------------------------------------------------ *
 * Admin queries
 * ------------------------------------------------------------------ */

export async function getAdminArticles(options: {
  status?: ArticleStatusValue | "all";
  query?: string;
  authorId?: string;
  limit?: number;
} = {}) {
  const { status = "all", query, authorId, limit = 100 } = options;
  const viewer = await getSessionUser();
  if (!viewer || (!can(viewer, "content.write") && !can(viewer, "content.review"))) return [];
  const filters = [];
  if (!can(viewer, "content.review")) filters.push(eq(articles.authorId, viewer.profileId));
  if (status !== "all") filters.push(eq(articles.status, status));
  if (authorId) filters.push(eq(articles.authorId, authorId));
  if (query) filters.push(ilike(articles.title, `%${query}%`));

  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      status: articles.status,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
      scheduledFor: articles.scheduledFor,
      readingMinutes: articles.readingMinutes,
      isFeatured: articles.isFeatured,
      authorId: articles.authorId,
      authorName: profiles.fullName,
      categoryName: categories.name,
      categoryAccent: categories.accent,
    })
    .from(articles)
    .innerJoin(profiles, eq(articles.authorId, profiles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(articles.updatedAt))
    .limit(limit);
}

export async function getArticleForAdmin(id: string) {
  const viewer = await getSessionUser();
  if (!viewer || (!can(viewer, "content.write") && !can(viewer, "content.review"))) return null;
  const rows = await db
    .select({
      article: articles,
      categoryName: categories.name,
      authorName: profiles.fullName,
      authorTitle: profiles.title,
      authorId: profiles.id,
    })
    .from(articles)
    .innerJoin(profiles, eq(articles.authorId, profiles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.id, id), can(viewer, "content.review") ? undefined : eq(articles.authorId, viewer.profileId)))
    .limit(1);
  if (!rows[0]) return null;

  const [reviews, revisions, tagRows, categoryList, authorList] = await Promise.all([
    db
      .select({
        id: articleReviews.id,
        action: articleReviews.action,
        fromStatus: articleReviews.fromStatus,
        toStatus: articleReviews.toStatus,
        comment: articleReviews.comment,
        createdAt: articleReviews.createdAt,
        reviewerName: profiles.fullName,
      })
      .from(articleReviews)
      .leftJoin(profiles, eq(articleReviews.reviewerId, profiles.id))
      .where(eq(articleReviews.articleId, id))
      .orderBy(desc(articleReviews.createdAt)),
    db
      .select()
      .from(articleRevisions)
      .where(eq(articleRevisions.articleId, id))
      .orderBy(desc(articleRevisions.revisionNumber)),
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, id)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db
      .select({ id: profiles.id, fullName: profiles.fullName, roleId: profiles.roleId })
      .from(profiles)
      .where(can(viewer, "content.review") ? undefined : eq(profiles.id, viewer.profileId))
      .orderBy(asc(profiles.fullName)),
  ]);

  return {
    ...rows[0],
    reviews,
    revisions,
    tags: tagRows,
    categories: categoryList,
    authors: authorList,
  };
}

export async function getDashboardStats() {
  const [statusRows, subscriberTotal, resourceDownloadsTotal, enrollmentTotal, reviewQueue, recentActivity] =
    await Promise.all([
      db.select({ status: articles.status, value: count() }).from(articles).groupBy(articles.status),
      db.select({ value: count() }).from(subscribers),
      db.select({ value: count() }).from(resourceDownloads),
      db.select({ value: count() }).from(enrollments),
      db
        .select({
          id: articles.id,
          title: articles.title,
          status: articles.status,
          updatedAt: articles.updatedAt,
          authorName: profiles.fullName,
        })
        .from(articles)
        .innerJoin(profiles, eq(articles.authorId, profiles.id))
        .where(inArray(articles.status, ["submitted", "in_review", "approved", "scheduled"]))
        .orderBy(asc(articles.updatedAt))
        .limit(6),
      db
        .select({
          id: activityLogs.id,
          action: activityLogs.action,
          description: activityLogs.description,
          createdAt: activityLogs.createdAt,
          actorName: profiles.fullName,
          actorRole: roles.name,
        })
        .from(activityLogs)
        .leftJoin(profiles, eq(activityLogs.actorId, profiles.id))
        .leftJoin(roles, eq(profiles.roleId, roles.id))
        .orderBy(desc(activityLogs.createdAt))
        .limit(8),
    ]);

  const statusMap = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.value)]));
  return {
    statusMap,
    totalArticles: statusRows.reduce((sum, row) => sum + Number(row.value), 0),
    subscribers: Number(subscriberTotal[0]?.value ?? 0),
    downloads: Number(resourceDownloadsTotal[0]?.value ?? 0),
    enrollments: Number(enrollmentTotal[0]?.value ?? 0),
    reviewQueue,
    recentActivity,
  };
}

export async function getSubscribers(limit = 200) {
  return db.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(limit);
}

export async function getEnrollments(limit = 100) {
  return db
    .select({
      id: enrollments.id,
      email: enrollments.email,
      fullName: enrollments.fullName,
      status: enrollments.status,
      cohort: enrollments.cohort,
      createdAt: enrollments.createdAt,
      levelName: courseLevels.name,
    })
    .from(enrollments)
    .leftJoin(courseLevels, eq(enrollments.levelId, courseLevels.id))
    .orderBy(desc(enrollments.createdAt))
    .limit(limit);
}

export async function getActivityLogs(limit = 60) {
  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      description: activityLogs.description,
      createdAt: activityLogs.createdAt,
      actorName: profiles.fullName,
      actorRole: roles.name,
    })
    .from(activityLogs)
    .leftJoin(profiles, eq(activityLogs.actorId, profiles.id))
    .leftJoin(roles, eq(profiles.roleId, roles.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

export async function getSiteSettings() {
  const rows = await db.select().from(siteSettings);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getSitePage(slug: string) {
  const rows = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getTeam() {
  return db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      title: profiles.title,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      roleName: roles.name,
      roleSlug: roles.slug,
    })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .innerJoin(users, eq(profiles.userId, users.id))
    .orderBy(desc(roles.level));
}

export async function getUpcomingSessions(limit = 10) {
  return db.select().from(courseSessions).orderBy(asc(courseSessions.sortOrder)).limit(limit);
}

export async function getResourceBySlug(slug: string) {
  const rows = await db.select().from(resources).where(eq(resources.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getPublishedArchive() {
  return db
    .select({ slug: articles.slug, updatedAt: articles.updatedAt })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt));
}

export async function getNewsletterPrincipleCounts() {
  return db
    .select({ principle: subscribers.principle, value: count() })
    .from(subscribers)
    .groupBy(subscribers.principle);
}

