import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "submitted",
  "in_review",
  "revision_requested",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "archived",
]);

export const reviewActionEnum = pgEnum("review_action", [
  "submitted",
  "review_started",
  "comment",
  "revision_requested",
  "approved",
  "rejected",
  "scheduled",
  "published",
  "archived",
  "restored",
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "worksheet",
  "guide",
  "template",
  "audio",
  "video",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "waitlist",
  "enrolled",
  "completed",
  "paused",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "review",
  "publish",
  "community",
  "system",
]);

/* ------------------------------------------------------------------ *
 * Identity — roles, users (credentials), profiles
 * ------------------------------------------------------------------ */

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 48 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  level: integer("level").notNull().default(10),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 160 }),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    organizationId: integer("organization_id"),
    headline: varchar("headline", { length: 200 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Africa/Kampala"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_user_id_idx").on(table.userId),
    uniqueIndex("profiles_slug_idx").on(table.slug),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: varchar("token", { length: 96 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId)],
);

/* ------------------------------------------------------------------ *
 * Publishing — categories (five principles), tags, articles, revisions
 * ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  principleQuestion: varchar("principle_question", { length: 160 }),
  description: text("description"),
  accent: varchar("accent", { length: 24 }).notNull().default("navy"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 96 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    title: varchar("title", { length: 240 }).notNull(),
    subtitle: varchar("subtitle", { length: 280 }),
    excerpt: text("excerpt"),
    body: text("body").notNull().default(""),
    status: articleStatusEnum("status").notNull().default("draft"),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id),
    coverImageUrl: text("cover_image_url"),
    coverAlt: varchar("cover_alt", { length: 240 }),
    readingMinutes: integer("reading_minutes").notNull().default(6),
    isFeatured: boolean("is_featured").notNull().default(false),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("articles_status_idx").on(table.status),
    index("articles_published_idx").on(table.publishedAt),
  ],
);

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.tagId] })],
);

export const articleRevisions = pgTable(
  "article_revisions",
  {
    id: serial("id").primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id").references(() => profiles.id, { onDelete: "set null" }),
    title: varchar("title", { length: 240 }).notNull(),
    body: text("body").notNull(),
    revisionNumber: integer("revision_number").notNull().default(1),
    changeNote: varchar("change_note", { length: 280 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("article_revisions_article_idx").on(table.articleId)],
);

export const articleReviews = pgTable(
  "article_reviews",
  {
    id: serial("id").primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => profiles.id, { onDelete: "set null" }),
    action: reviewActionEnum("action").notNull(),
    fromStatus: articleStatusEnum("from_status"),
    toStatus: articleStatusEnum("to_status"),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("article_reviews_article_idx").on(table.articleId)],
);

/* ------------------------------------------------------------------ *
 * Website — pages, settings, navigation, media, resources
 * ------------------------------------------------------------------ */

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 260 }),
  body: text("body").notNull().default(""),
  status: varchar("status", { length: 24 }).notNull().default("published"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 96 }).primaryKey(),
  value: text("value").notNull(),
  label: varchar("label", { length: 160 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const navigation = pgTable("navigation", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 80 }).notNull(),
  href: varchar("href", { length: 160 }).notNull(),
  location: varchar("location", { length: 32 }).notNull().default("header"),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 240 }),
  kind: varchar("kind", { length: 32 }).notNull().default("image"),
  width: integer("width"),
  height: integer("height"),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  type: resourceTypeEnum("type").notNull().default("guide"),
  fileUrl: text("file_url"),
  fileFormat: varchar("file_format", { length: 24 }).notNull().default("PDF"),
  fileSize: varchar("file_size", { length: 24 }).notNull().default("1.2 MB"),
  level: varchar("level", { length: 48 }),
  downloadCount: integer("download_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resourceDownloads = pgTable("resource_downloads", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ *
 * Courses — levels, sessions, enrollments, progress
 * ------------------------------------------------------------------ */

export const courseLevels = pgTable("course_levels", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  levelNumber: integer("level_number").notNull(),
  tagline: varchar("tagline", { length: 200 }).notNull(),
  description: text("description").notNull(),
    weeks: integer("weeks").notNull().default(5),
    accent: varchar("accent", { length: 24 }).notNull().default("navy"),
    passMark: integer("pass_mark").notNull().default(80),
    icon: varchar("icon", { length: 48 }).notNull().default("sprout"),
  imageUrl: text("image_url"),
  outcomes: jsonb("outcomes").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const courseSessions = pgTable(
  "course_sessions",
  {
    id: serial("id").primaryKey(),
    levelId: integer("level_id")
      .notNull()
      .references(() => courseLevels.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 16 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: text("summary").notNull(),
    focusQuestions: jsonb("focus_questions").$type<string[]>().notNull().default([]),
    format: varchar("format", { length: 120 }).notNull().default("Experiential presentation"),
    durationMinutes: integer("duration_minutes").notNull().default(90),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("course_sessions_level_idx").on(table.levelId)],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    levelId: integer("level_id").references(() => courseLevels.id, {
      onDelete: "set null",
    }),
    cohort: varchar("cohort", { length: 80 }),
    status: enrollmentStatusEnum("status").notNull().default("waitlist"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("enrollments_email_level_idx").on(table.email, table.levelId)],
);

export const learningProgress = pgTable(
  "learning_progress",
  {
    id: serial("id").primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => courseSessions.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("learning_progress_unique_idx").on(table.enrollmentId, table.sessionId)],
);

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 140 }).notNull(),
  role: varchar("role", { length: 160 }),
  location: varchar("location", { length: 120 }),
  quote: text("quote").notNull(),
  levelSlug: varchar("level_slug", { length: 96 }),
  isFeatured: boolean("is_featured").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ------------------------------------------------------------------ *
 * Community — discussion groups, threads, posts (phase 3 groundwork)
 * ------------------------------------------------------------------ */

export const discussionGroups = pgTable("discussion_groups", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  accent: varchar("accent", { length: 24 }).notNull().default("navy"),
  isMembersOnly: boolean("is_members_only").notNull().default(false),
});

export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").references(() => discussionGroups.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 240 }).notNull(),
    prompt: text("prompt"),
    authorName: varchar("author_name", { length: 140 }).notNull(),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    communityId: integer("community_id"),
    threadType: varchar("thread_type", { length: 24 }).notNull().default("discussion"),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    isRemoved: boolean("is_removed").notNull().default(false),
    isAnswered: boolean("is_answered").notNull().default(false),
    replyCount: integer("reply_count").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("discussion_threads_activity_idx").on(table.lastActivityAt)],
);

export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    authorName: varchar("author_name", { length: 140 }).notNull(),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    isAnswer: boolean("is_answer").notNull().default(false),
    isRemoved: boolean("is_removed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("discussion_posts_thread_idx").on(table.threadId)],
);

/* ------------------------------------------------------------------ *
 * Engagement — subscribers, notifications, activity logs
 * ------------------------------------------------------------------ */

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 160 }),
  source: varchar("source", { length: 64 }).notNull().default("website"),
  principle: varchar("principle", { length: 64 }),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    recipientId: uuid("recipient_id").references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull().default("system"),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    href: varchar("href", { length: 240 }),
    isRead: boolean("is_read").notNull().default(false),
    channel: varchar("channel", { length: 24 }).notNull().default("in_app"),
    templateKey: varchar("template_key", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    dedupeKey: varchar("dedupe_key", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_recipient_idx").on(table.recipientId, table.isRead)],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    action: varchar("action", { length: 96 }).notNull(),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: varchar("entity_id", { length: 96 }),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activity_logs_created_idx").on(table.createdAt)],
);

/* ------------------------------------------------------------------ *
 * Relations
 * ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  role: one(roles, { fields: [profiles.roleId], references: [roles.id] }),
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, { fields: [articles.categoryId], references: [categories.id] }),
  author: one(profiles, { fields: [articles.authorId], references: [profiles.id] }),
  reviews: many(articleReviews),
  revisions: many(articleRevisions),
  articleTags: many(articleTags),
}));

export const courseLevelsRelations = relations(courseLevels, ({ many }) => ({
  sessions: many(courseSessions),
}));

/* ------------------------------------------------------------------ *
 * Academy engagement — mentorship, reflections, collaborative work
 * ------------------------------------------------------------------ */

export const coachingStatusEnum = pgEnum("coaching_status", [
  "requested",
  "scheduled",
  "completed",
  "cancelled",
]);

export const reflectionVisibilityEnum = pgEnum("reflection_visibility", [
  "private",
  "mentor",
  "cohort",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "submitted",
  "reviewed",
]);

export const coachingSessions = pgTable(
  "coaching_sessions",
  {
    id: serial("id").primaryKey(),
    mentorId: uuid("mentor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => enrollments.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    focus: text("focus"),
    status: coachingStatusEnum("status").notNull().default("requested"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(45),
    mentorNotes: text("mentor_notes"),
    studentReflection: text("student_reflection"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("coaching_sessions_mentor_idx").on(table.mentorId, table.scheduledAt),
    index("coaching_sessions_student_idx").on(table.studentId, table.scheduledAt),
  ],
);

export const reflections = pgTable(
  "reflections",
  {
    id: serial("id").primaryKey(),
    authorProfileId: uuid("author_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => enrollments.id, { onDelete: "set null" }),
    sessionId: integer("session_id").references(() => courseSessions.id, { onDelete: "set null" }),
    prompt: varchar("prompt", { length: 240 }).notNull(),
    body: text("body").notNull(),
    visibility: reflectionVisibilityEnum("visibility").notNull().default("mentor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reflections_author_idx").on(table.authorProfileId, table.createdAt)],
);

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  levelId: integer("level_id").references(() => courseLevels.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => courseSessions.id, { onDelete: "set null" }),
  title: varchar("title", { length: 220 }).notNull(),
  brief: text("brief").notNull(),
  isCollaborative: boolean("is_collaborative").notNull().default(false),
  dueAt: timestamp("due_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: submissionStatusEnum("status").notNull().default("draft"),
    body: text("body").notNull().default(""),
    feedback: text("feedback"),
    reviewedById: uuid("reviewed_by_id").references(() => profiles.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("assignment_submissions_unique_idx").on(table.assignmentId, table.profileId),
    index("assignment_submissions_profile_idx").on(table.profileId),
  ],
);

/* ------------------------------------------------------------------ *
 * Academy curriculum — courses → modules → lessons (structured content)
 * ------------------------------------------------------------------ */

export const publishStatusEnum = pgEnum("publish_status", ["draft", "published", "archived"]);

export const lessonKindEnum = pgEnum("lesson_kind", [
  "video",
  "audio",
  "reading",
  "illustration",
  "download",
  "practice",
  "live",
]);

export const lessonProgressStatusEnum = pgEnum("lesson_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);

export const liveSessionTypeEnum = pgEnum("live_session_type", [
  "class",
  "group_work",
  "discussion",
  "office_hours",
]);

export const liveSessionStatusEnum = pgEnum("live_session_status", [
  "scheduled",
  "live",
  "ended",
  "cancelled",
]);

export const liveMessageKindEnum = pgEnum("live_message_kind", ["chat", "question", "prompt", "system"]);

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    levelId: integer("level_id")
      .notNull()
      .references(() => courseLevels.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: varchar("subtitle", { length: 240 }),
    summary: text("summary").notNull().default(""),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    accent: varchar("accent", { length: 24 }).notNull().default("navy"),
    estimatedHours: integer("estimated_hours").notNull().default(4),
    status: publishStatusEnum("status").notNull().default("published"),
    isSequential: boolean("is_sequential").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("courses_level_idx").on(table.levelId, table.sortOrder)],
);

export const courseModules = pgTable(
  "course_modules",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: text("summary"),
    sessionCode: varchar("session_code", { length: 16 }),
    estimatedMinutes: integer("estimated_minutes").notNull().default(45),
    isPreview: boolean("is_preview").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("course_modules_slug_idx").on(table.courseId, table.slug)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => courseModules.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    kind: lessonKindEnum("kind").notNull().default("reading"),
    summary: text("summary"),
    body: text("body").notNull().default(""),
    videoUrl: text("video_url"),
    audioUrl: text("audio_url"),
    imageUrl: text("image_url"),
    imageAlt: varchar("image_alt", { length: 240 }),
    downloadUrl: text("download_url"),
    downloadLabel: varchar("download_label", { length: 120 }),
    transcript: text("transcript"),
    practicePrompt: text("practice_prompt"),
    durationMinutes: integer("duration_minutes").notNull().default(10),
    isPreview: boolean("is_preview").notNull().default(false),
    status: publishStatusEnum("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("lessons_slug_idx").on(table.moduleId, table.slug)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: serial("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: lessonProgressStatusEnum("status").notNull().default("not_started"),
    secondsWatched: integer("seconds_watched").notNull().default(0),
    note: text("note"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("lesson_progress_unique_idx").on(table.profileId, table.lessonId),
    index("lesson_progress_profile_idx").on(table.profileId),
  ],
);

export const liveSessions = pgTable(
  "live_sessions",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
    moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "set null" }),
    cohortId: integer("cohort_id"),
    hostId: uuid("host_id").references(() => profiles.id, { onDelete: "set null" }),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    type: liveSessionTypeEnum("type").notNull().default("class"),
    status: liveSessionStatusEnum("status").notNull().default("scheduled"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(90),
    meetingUrl: text("meeting_url"),
    roomCode: varchar("room_code", { length: 40 }).unique(),
    agenda: text("agenda"),
    groupSize: integer("group_size"),
    recordingUrl: text("recording_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("live_sessions_starts_idx").on(table.startsAt)],
);

export const liveRsvps = pgTable(
  "live_rsvps",
  {
    id: serial("id").primaryKey(),
    liveSessionId: integer("live_session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 }).notNull().default("going"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("live_rsvps_unique_idx").on(table.liveSessionId, table.profileId)],
);

export const liveMessages = pgTable(
  "live_messages",
  {
    id: serial("id").primaryKey(),
    liveSessionId: integer("live_session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 140 }).notNull(),
    authorRole: varchar("author_role", { length: 32 }).notNull().default("student"),
    kind: liveMessageKindEnum("kind").notNull().default("chat"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("live_messages_session_idx").on(table.liveSessionId, table.createdAt)],
);

/* ------------------------------------------------------------------ *
 * Assessment — auto-graded session quizzes and level exams
 * ------------------------------------------------------------------ */

export const assessmentKindEnum = pgEnum("assessment_kind", ["session", "level"]);

export const assessmentAttemptStatusEnum = pgEnum("assessment_attempt_status", [
  "submitted",
  "void",
]);

export const assessments = pgTable(
  "assessments",
  {
    id: serial("id").primaryKey(),
    kind: assessmentKindEnum("kind").notNull().default("session"),
    levelId: integer("level_id").references(() => courseLevels.id, { onDelete: "cascade" }),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    passMark: integer("pass_mark").notNull().default(80),
    timeLimitMinutes: integer("time_limit_minutes").notNull().default(15),
    maxAttempts: integer("max_attempts").notNull().default(3),
    isRequired: boolean("is_required").notNull().default(true),
    status: publishStatusEnum("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assessments_level_idx").on(table.levelId, table.kind)],
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: serial("id").primaryKey(),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    correctIndex: integer("correct_index").notNull().default(0),
    explanation: text("explanation"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("assessment_questions_assessment_idx").on(table.assessmentId, table.sortOrder)],
);

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: serial("id").primaryKey(),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    correctCount: integer("correct_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    passMark: integer("pass_mark").notNull().default(80),
    status: assessmentAttemptStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("assessment_attempts_profile_idx").on(table.profileId, table.assessmentId),
    index("assessment_attempts_submitted_idx").on(table.submittedAt),
  ],
);

export const assessmentAnswers = pgTable("assessment_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => assessmentQuestions.id, { onDelete: "cascade" }),
  selectedIndex: integer("selected_index").notNull().default(-1),
  isCorrect: boolean("is_correct").notNull().default(false),
});

export type AssessmentQuestionSnapshot = { id: number; prompt: string; options: string[]; correctIndex: number; explanation: string | null };

export const assessmentSessions = pgTable("assessment_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: integer("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).$type<"in_progress" | "submitted" | "expired">().notNull().default("in_progress"),
  questions: jsonb("questions").$type<AssessmentQuestionSnapshot[]>().notNull(),
  passMark: integer("pass_mark").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attemptId: integer("attempt_id").unique().references(() => assessmentAttempts.id, { onDelete: "cascade" }),
  selections: jsonb("selections").$type<{ questionId: number; selectedIndex: number }[]>().notNull().default([]),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
}, (table) => [
  index("assessment_sessions_profile_idx").on(table.profileId, table.assessmentId),
  index("assessment_sessions_assessment_idx").on(table.assessmentId),
  uniqueIndex("assessment_sessions_active_idx").on(table.profileId, table.assessmentId).where(sql`${table.status} = 'in_progress'`),
  check("assessment_sessions_status_check", sql`${table.status} in ('in_progress', 'submitted', 'expired')`),
  check("assessment_sessions_questions_check", sql`jsonb_typeof(${table.questions}) = 'array' and jsonb_array_length(${table.questions}) > 0`),
  check("assessment_sessions_pass_mark_check", sql`${table.passMark} between 0 and 100`),
  check("assessment_sessions_deadline", sql`${table.expiresAt} > ${table.startedAt}`),
  check("assessment_sessions_submitted", sql`${table.status} <> 'submitted' or (${table.attemptId} is not null and ${table.submittedAt} is not null)`),
]);

/* ------------------------------------------------------------------ *
 * Group work — collaborative assignments
 * ------------------------------------------------------------------ */

export const groupSubmissionStatusEnum = pgEnum("group_submission_status", [
  "draft",
  "submitted",
  "reviewed",
]);

export const courseGroups = pgTable(
  "course_groups",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    brief: text("brief"),
    mentorId: uuid("mentor_id").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("course_groups_course_idx").on(table.courseId)],
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => courseGroups.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("group_members_unique_idx").on(table.groupId, table.profileId)],
);

export const groupSubmissions = pgTable(
  "group_submissions",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => courseGroups.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 220 }).notNull(),
    body: text("body").notNull().default(""),
    status: groupSubmissionStatusEnum("status").notNull().default("draft"),
    score: integer("score"),
    feedback: text("feedback"),
    submittedById: uuid("submitted_by_id").references(() => profiles.id, { onDelete: "set null" }),
    reviewedById: uuid("reviewed_by_id").references(() => profiles.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("group_submissions_group_idx").on(table.groupId)],
);

/* ------------------------------------------------------------------ *
 * Certificates — auto-issued on verified completion
 * ------------------------------------------------------------------ */

export const certificateKindEnum = pgEnum("certificate_kind", ["course", "level"]);

export const certificates = pgTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: certificateKindEnum("kind").notNull().default("course"),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
    levelId: integer("level_id").references(() => courseLevels.id, { onDelete: "set null" }),
    title: varchar("title", { length: 240 }).notNull(),
    levelName: varchar("level_name", { length: 120 }),
    score: integer("score"),
    hours: integer("hours"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
      uniqueIndex("certificates_course_unique_idx").on(table.profileId, table.courseId).where(sql`${table.kind} = 'course'`),
      uniqueIndex("certificates_level_unique_idx").on(table.profileId, table.levelId).where(sql`${table.kind} = 'level'`),
  ],
);

/* ------------------------------------------------------------------ *
 * Live conferencing — WebRTC signalling, presence and room controls
 * ------------------------------------------------------------------ */

export const conferenceParticipants = pgTable(
  "conference_participants",
  {
    peerId: varchar("peer_id", { length: 64 }).primaryKey(),
    roomCode: varchar("room_code", { length: 40 }).notNull(),
    liveSessionId: integer("live_session_id").references(() => liveSessions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    displayName: varchar("display_name", { length: 140 }).notNull(),
    role: varchar("role", { length: 24 }).notNull().default("student"),
    mode: varchar("mode", { length: 16 }).notNull().default("mesh"),
    audioEnabled: boolean("audio_enabled").notNull().default(true),
    videoEnabled: boolean("video_enabled").notNull().default(true),
    sharingScreen: boolean("sharing_screen").notNull().default(false),
    handRaised: boolean("hand_raised").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conference_participants_room_idx").on(table.roomCode, table.lastSeenAt),
  ],
);

export const conferenceSignals = pgTable(
  "conference_signals",
  {
    id: serial("id").primaryKey(),
    roomCode: varchar("room_code", { length: 40 }).notNull(),
    fromPeer: varchar("from_peer", { length: 64 }).notNull(),
    toPeer: varchar("to_peer", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    consumed: boolean("consumed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("conference_signals_inbox_idx").on(table.toPeer, table.consumed)],
);



/* ------------------------------------------------------------------ *
 * RBAC — organisations, scoped memberships, permission catalog
 * ------------------------------------------------------------------ */

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  plan: varchar("plan", { length: 32 }).notNull().default("partner"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  country: varchar("country", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roleSlug: varchar("role_slug", { length: 48 }).notNull().default("student"),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("org_memberships_unique_idx").on(table.organizationId, table.profileId)],
);

/* ------------------------------------------------------------------ *
 * Purpose Course assessment engine
 * instrument → dimensions → items → responses → scoring rules → results
 * ------------------------------------------------------------------ */

export const instrumentStatusEnum = pgEnum("instrument_status", ["draft", "published", "archived"]);

export const instruments = pgTable("instruments", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 64 }).notNull().default("discovery"),
  construct: text("construct").notNull(),
  description: text("description"),
  methodology: text("methodology").notNull(),
  limitations: text("limitations").notNull(),
  interpretationGuide: text("interpretation_guide").notNull(),
  dataProtection: text("data_protection").notNull(),
  consentSummary: text("consent_summary").notNull(),
  responseScale: jsonb("response_scale").$type<{ value: number; label: string }[]>().notNull().default([]),
  scoringMethod: varchar("scoring_method", { length: 32 }).notNull().default("mean_banded"),
  version: varchar("version", { length: 16 }).notNull().default("1.0"),
  isProprietary: boolean("is_proprietary").notNull().default(true),
  estimatedMinutes: integer("estimated_minutes").notNull().default(8),
  status: instrumentStatusEnum("status").notNull().default("published"),
  sortOrder: integer("sort_order").notNull().default(0),
  supersededBy: varchar("superseded_by", { length: 96 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const instrumentDimensions = pgTable(
  "instrument_dimensions",
  {
    id: serial("id").primaryKey(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    description: text("description").notNull(),
    lowLabel: varchar("low_label", { length: 80 }).notNull().default("Emerging"),
    highLabel: varchar("high_label", { length: 80 }).notNull().default("Established"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("instrument_dimensions_unique_idx").on(table.instrumentId, table.slug)],
);

export const instrumentItems = pgTable(
  "instrument_items",
  {
    id: serial("id").primaryKey(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    dimensionId: integer("dimension_id")
      .notNull()
      .references(() => instrumentDimensions.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    rationale: text("rationale"),
    reverseScored: boolean("reverse_scored").notNull().default(false),
    weight: integer("weight").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("instrument_items_instrument_idx").on(table.instrumentId, table.sortOrder)],
);

export const instrumentBands = pgTable(
  "instrument_bands",
  {
    id: serial("id").primaryKey(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    dimensionId: integer("dimension_id").references(() => instrumentDimensions.id, { onDelete: "cascade" }),
    minScore: integer("min_score").notNull(),
    maxScore: integer("max_score").notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    interpretation: text("interpretation").notNull(),
    recommendation: text("recommendation").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("instrument_bands_instrument_idx").on(table.instrumentId)],
);

export const instrumentSessions = pgTable(
  "instrument_sessions",
  {
    id: serial("id").primaryKey(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    instrumentVersion: varchar("instrument_version", { length: 16 }).notNull(),
    consentGiven: boolean("consent_given").notNull().default(false),
      sharedWithMentor: boolean("shared_with_mentor").notNull().default(false),
    status: varchar("status", { length: 24 }).notNull().default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("instrument_sessions_profile_idx").on(table.profileId, table.completedAt)],
);

export const instrumentResponses = pgTable(
  "instrument_responses",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => instrumentSessions.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => instrumentItems.id, { onDelete: "cascade" }),
    rawValue: integer("raw_value").notNull(),
    scoredValue: integer("scored_value").notNull(),
  },
  (table) => [uniqueIndex("instrument_responses_unique_idx").on(table.sessionId, table.itemId)],
);

export const instrumentResults = pgTable(
  "instrument_results",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => instrumentSessions.id, { onDelete: "cascade" })
      .unique(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    overallScore: integer("overall_score").notNull(),
    bandLabel: varchar("band_label", { length: 80 }).notNull(),
    summary: text("summary").notNull(),
    dimensions: jsonb("dimensions")
      .$type<
        {
          slug: string;
          name: string;
          score: number;
          bandLabel: string;
          interpretation: string;
          recommendation: string;
          lowLabel: string;
          highLabel: string;
        }[]
      >()
      .notNull()
      .default([]),
    recommendations: jsonb("recommendations").$type<string[]>().notNull().default([]),
    scoringTrace: jsonb("scoring_trace").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("instrument_results_profile_idx").on(table.profileId, table.createdAt)],
);

/* ------------------------------------------------------------------ *
 * Mentorship — assignment, goals, notes, flags
 * ------------------------------------------------------------------ */

export const mentorAssignments = pgTable(
  "mentor_assignments",
  {
    id: serial("id").primaryKey(),
    mentorId: uuid("mentor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    assignedById: uuid("assigned_by_id").references(() => profiles.id, { onDelete: "set null" }),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    focus: varchar("focus", { length: 240 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("mentor_assignments_unique_idx").on(table.mentorId, table.studentId)],
);

export const learnerGoals = pgTable(
  "learner_goals",
  {
    id: serial("id").primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mentorId: uuid("mentor_id").references(() => profiles.id, { onDelete: "set null" }),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    progress: integer("progress").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learner_goals_student_idx").on(table.studentId, table.status)],
);

export const mentoringNotes = pgTable(
  "mentoring_notes",
  {
    id: serial("id").primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mentorId: uuid("mentor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sessionId: integer("session_id").references(() => coachingSessions.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    visibility: varchar("visibility", { length: 24 }).notNull().default("shared"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("mentoring_notes_student_idx").on(table.studentId, table.createdAt)],
);

export const learnerFlags = pgTable(
  "learner_flags",
  {
    id: serial("id").primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mentorId: uuid("mentor_id").references(() => profiles.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    severity: varchar("severity", { length: 24 }).notNull().default("attention"),
    status: varchar("status", { length: 24 }).notNull().default("open"),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("learner_flags_student_idx").on(table.studentId, table.status)],
);

/* ------------------------------------------------------------------ *
 * Purpose Communities — categories, membership, reactions, reports
 * ------------------------------------------------------------------ */

export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("Purpose Discovery"),
  description: text("description").notNull(),
  accent: varchar("accent", { length: 24 }).notNull().default("gold"),
  coverImageUrl: text("cover_image_url"),
  visibility: varchar("visibility", { length: 24 }).notNull().default("public"),
  guidelines: text("guidelines"),
  isArchived: boolean("is_archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityMembers = pgTable(
  "community_members",
  {
    id: serial("id").primaryKey(),
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("community_members_unique_idx").on(table.communityId, table.profileId)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    targetType: varchar("target_type", { length: 24 }).notNull(),
    targetId: integer("target_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 16 }).notNull().default("amen"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reactions_unique_idx").on(table.targetType, table.targetId, table.profileId, table.emoji)],
);

export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  targetType: varchar("target_type", { length: 24 }).notNull(),
  targetId: integer("target_id").notNull(),
  reporterId: uuid("reporter_id").references(() => profiles.id, { onDelete: "set null" }),
  reason: varchar("reason", { length: 80 }).notNull(),
  detail: text("detail"),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  moderatorNote: text("moderator_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

/* ------------------------------------------------------------------ *
 * Cohorts — scheduled learning with facilitators and weeks
 * ------------------------------------------------------------------ */

export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  levelId: integer("level_id").references(() => courseLevels.id, { onDelete: "set null" }),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  capacity: integer("capacity").notNull().default(50),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  cadence: varchar("cadence", { length: 120 }).notNull().default("Weekly live class + group work"),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cohortMembers = pgTable(
  "cohort_members",
  {
    id: serial("id").primaryKey(),
    cohortId: integer("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("learner"),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cohort_members_unique_idx").on(table.cohortId, table.profileId)],
);

export const cohortWeeks = pgTable(
  "cohort_weeks",
  {
    id: serial("id").primaryKey(),
    cohortId: integer("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    theme: varchar("theme", { length: 120 }).notNull(),
    focus: text("focus").notNull(),
    assignmentBrief: text("assignment_brief"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("cohort_weeks_unique_idx").on(table.cohortId, table.weekNumber)],
);

export const sessionAttendance = pgTable(
  "session_attendance",
  {
    id: serial("id").primaryKey(),
    liveSessionId: integer("live_session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 }).notNull().default("present"),
    minutesAttended: integer("minutes_attended").notNull().default(0),
    note: varchar("note", { length: 240 }),
    markedById: uuid("marked_by_id").references(() => profiles.id, { onDelete: "set null" }),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("session_attendance_unique_idx").on(table.liveSessionId, table.profileId)],
);

/* ------------------------------------------------------------------ *
 * Notification service — preferences and channel outbox
 * ------------------------------------------------------------------ */

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 48 }).notNull(),
    inApp: boolean("in_app").notNull().default(true),
    email: boolean("email").notNull().default(true),
    push: boolean("push").notNull().default(false),
    digest: varchar("digest", { length: 24 }).notNull().default("instant"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("notification_preferences_unique_idx").on(table.profileId, table.category)],
);

export const notificationOutbox = pgTable("notification_outbox", {
  id: serial("id").primaryKey(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 24 }).notNull().default("email"),
  templateKey: varchar("template_key", { length: 64 }).notNull(),
  subject: varchar("subject", { length: 240 }).notNull(),
  body: text("body").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: varchar("status", { length: 24 }).notNull().default("queued"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Instrument = typeof instruments.$inferSelect;
export type InstrumentDimension = typeof instrumentDimensions.$inferSelect;
export type InstrumentItem = typeof instrumentItems.$inferSelect;
export type InstrumentResult = typeof instrumentResults.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type Cohort = typeof cohorts.$inferSelect;
export type CohortWeek = typeof cohortWeeks.$inferSelect;
export type LearnerGoal = typeof learnerGoals.$inferSelect;
export type MentoringNote = typeof mentoringNotes.$inferSelect;
export type LearnerFlag = typeof learnerFlags.$inferSelect;
export type Organization = typeof organizations.$inferSelect;



/* ------------------------------------------------------------------ *
 * ENTERPRISE MODULES — identity, learning activities, achievements,
 * scoring rules, community comments, communication, analytics, audit
 * ------------------------------------------------------------------ */

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 96 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  module: varchar("module", { length: 48 }).notNull().default("general"),
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: varchar("permission_key", { length: 96 }).notNull(),
  },
  (table) => [uniqueIndex("role_permissions_unique_idx").on(table.roleId, table.permissionKey)],
);

export const learningActivities = pgTable(
  "learning_activities",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    cohortWeekId: integer("cohort_week_id").references(() => cohortWeeks.id, { onDelete: "set null" }),
    title: varchar("title", { length: 220 }).notNull(),
    kind: varchar("kind", { length: 40 }).notNull().default("practice"),
    instruction: text("instruction").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull().default(15),
    isRequired: boolean("is_required").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("learning_activities_lesson_idx").on(table.lessonId)],
);

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 48 }).notNull().default("award"),
  criteria: text("criteria").notNull(),
  points: integer("points").notNull().default(10),
  category: varchar("category", { length: 48 }).notNull().default("learning"),
});

export const learnerAchievements = pgTable(
  "learner_achievements",
  {
    id: serial("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    evidence: text("evidence"),
  },
  (table) => [uniqueIndex("learner_achievements_unique_idx").on(table.profileId, table.achievementId)],
);

export const scoringRules = pgTable("scoring_rules", {
  id: serial("id").primaryKey(),
  instrumentId: integer("instrument_id").references(() => instruments.id, { onDelete: "cascade" }),
  assessmentId: integer("assessment_id").references(() => assessments.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  ruleType: varchar("rule_type", { length: 48 }).notNull().default("weighted_mean"),
  expression: text("expression").notNull(),
  bandDefinition: jsonb("band_definition").$type<Record<string, unknown>>().notNull().default({}),
  version: varchar("version", { length: 16 }).notNull().default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
});

export const discussionComments = pgTable(
  "discussion_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => discussionPosts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 140 }).notNull(),
    body: text("body").notNull(),
    isRemoved: boolean("is_removed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("discussion_comments_post_idx").on(table.postId)],
);

export const emailEvents = pgTable("email_events", {
  id: serial("id").primaryKey(),
  outboxId: integer("outbox_id").references(() => notificationOutbox.id, { onDelete: "set null" }),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  event: varchar("event", { length: 40 }).notNull().default("queued"),
  provider: varchar("provider", { length: 48 }).notNull().default("internal"),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: uuid("sender_id").references(() => profiles.id, { onDelete: "set null" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 240 }).notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    contextType: varchar("context_type", { length: 40 }),
    contextId: integer("context_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_recipient_idx").on(table.recipientId, table.isRead)],
);

export const platformEvents = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 96 }).notNull(),
    module: varchar("module", { length: 48 }).notNull().default("learning"),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    sessionId: varchar("session_id", { length: 64 }),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("events_name_idx").on(table.name, table.occurredAt)],
);

export const learningEvents = pgTable(
  "learning_events",
  {
    id: serial("id").primaryKey(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 48 }).notNull(),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
    lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    assessmentId: integer("assessment_id").references(() => assessments.id, { onDelete: "set null" }),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    score: integer("score"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learning_events_profile_idx").on(table.profileId, table.occurredAt)],
);

export const engagementSnapshots = pgTable(
  "engagement",
  {
    id: serial("id").primaryKey(),
    snapshotDate: varchar("snapshot_date", { length: 10 }).notNull(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    minutesLearned: integer("minutes_learned").notNull().default(0),
    lessonsCompleted: integer("lessons_completed").notNull().default(0),
    discussions: integer("discussions").notNull().default(0),
    activeFlag: boolean("active_flag").notNull().default(true),
  },
  (table) => [uniqueIndex("engagement_unique_idx").on(table.snapshotDate, table.profileId)],
);

export const analyticsReports = pgTable("reports", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  scope: varchar("scope", { length: 32 }).notNull().default("platform"),
  definition: text("definition").notNull(),
  queryRef: varchar("query_ref", { length: 96 }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const securityEvents = pgTable(
  "security_events",
  {
    id: serial("id").primaryKey(),
    eventType: varchar("event_type", { length: 48 }).notNull(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    severity: varchar("severity", { length: 24 }).notNull().default("info"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("security_events_idx").on(table.eventType, table.createdAt)],
);

export const dataChanges = pgTable(
  "data_changes",
  {
    id: serial("id").primaryKey(),
    tableName: varchar("table_name", { length: 64 }).notNull(),
    recordId: varchar("record_id", { length: 96 }).notNull(),
    changeType: varchar("change_type", { length: 24 }).notNull().default("update"),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    before: jsonb("before").$type<Record<string, unknown>>().notNull().default({}),
    after: jsonb("after").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("data_changes_record_idx").on(table.tableName, table.recordId)],
);

export type PlatformEvent = typeof platformEvents.$inferSelect;
export type LearningEvent = typeof learningEvents.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type LearningActivity = typeof learningActivities.$inferSelect;

export type ConferenceParticipant = typeof conferenceParticipants.$inferSelect;

export type Assessment = typeof assessments.$inferSelect;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type CourseGroup = typeof courseGroups.$inferSelect;
export type GroupSubmission = typeof groupSubmissions.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ArticleStatus = Article["status"];
export type Course = typeof courses.$inferSelect;
export type CourseModule = typeof courseModules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type LiveSession = typeof liveSessions.$inferSelect;
export type LiveMessage = typeof liveMessages.$inferSelect;
export type CoachingSession = typeof coachingSessions.$inferSelect;
export type Reflection = typeof reflections.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type CourseLevel = typeof courseLevels.$inferSelect;
export type CourseSession = typeof courseSessions.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type DiscussionThread = typeof discussionThreads.$inferSelect;
export type DiscussionPost = typeof discussionPosts.$inferSelect;
export type Category = typeof categories.$inferSelect;
