import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  cohorts,
  courses,
  courseModules,
  discussionThreads,
  lessons,
  liveSessions,
  profiles,
  resources,
} from "@/db/schema";

export type SearchType = "article" | "course" | "lesson" | "resource" | "discussion" | "person" | "event";

export type SearchHit = {
  type: SearchType;
  id: string;
  title: string;
  snippet: string;
  href: string;
  meta: string;
};

export type SearchGroup = { type: SearchType; label: string; hits: SearchHit[] };

const GROUPS: { type: SearchType; label: string }[] = [
  { type: "article", label: "Articles" },
  { type: "course", label: "Courses" },
  { type: "lesson", label: "Lessons" },
  { type: "resource", label: "Resources" },
  { type: "discussion", label: "Discussions" },
  { type: "person", label: "People" },
  { type: "event", label: "Events" },
];

function clip(value: string | null | undefined, length = 150) {
  if (!value) return "";
  const clean = value.replace(/[#>*`]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

export async function searchPlatform(query: string, options: { types?: SearchType[]; limit?: number } = {}) {
  const term = query.trim();
  if (term.length < 2) return { query: term, groups: GROUPS.map((group) => ({ ...group, hits: [] })), total: 0 };

  const needle = `%${term}%`;
  const limit = options.limit ?? 6;
  const include = (type: SearchType) => !options.types || options.types.length === 0 || options.types.includes(type);

  const [articleRows, courseRows, lessonRows, resourceRows, threadRows, peopleRows, cohortRows, sessionRows] = await Promise.all([
    include("article")
      ? db
          .select({ id: articles.id, slug: articles.slug, title: articles.title, excerpt: articles.excerpt, publishedAt: articles.publishedAt })
          .from(articles)
          .where(and(eq(articles.status, "published"), or(ilike(articles.title, needle), ilike(articles.excerpt, needle), ilike(articles.body, needle))))
          .orderBy(desc(articles.publishedAt))
          .limit(limit)
      : Promise.resolve([]),
    include("course")
      ? db
          .select({ id: courses.id, slug: courses.slug, title: courses.title, summary: courses.summary, status: courses.status })
          .from(courses)
          .where(and(eq(courses.status, "published"), or(ilike(courses.title, needle), ilike(courses.summary, needle))))
          .limit(limit)
      : Promise.resolve([]),
    include("lesson")
      ? db
          .select({
            id: lessons.id,
            title: lessons.title,
            summary: lessons.summary,
            kind: lessons.kind,
            courseSlug: courses.slug,
          })
          .from(lessons)
          .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
          .innerJoin(courses, eq(courseModules.courseId, courses.id))
          .where(and(eq(lessons.status, "published"), or(ilike(lessons.title, needle), ilike(lessons.summary, needle), ilike(lessons.body, needle))))
          .limit(limit)
      : Promise.resolve([]),
    include("resource")
      ? db
          .select({ id: resources.id, slug: resources.slug, title: resources.title, description: resources.description, type: resources.type })
          .from(resources)
          .where(or(ilike(resources.title, needle), ilike(resources.description, needle)))
          .limit(limit)
      : Promise.resolve([]),
    include("discussion")
      ? db
          .select({ id: discussionThreads.id, title: discussionThreads.title, prompt: discussionThreads.prompt, authorName: discussionThreads.authorName })
          .from(discussionThreads)
          .where(and(eq(discussionThreads.isRemoved, false), or(ilike(discussionThreads.title, needle), ilike(discussionThreads.prompt, needle))))
          .limit(limit)
      : Promise.resolve([]),
    include("person")
      ? db
          .select({ id: profiles.id, fullName: profiles.fullName, title: profiles.title, bio: profiles.bio })
          .from(profiles)
          .where(or(ilike(profiles.fullName, needle), ilike(profiles.title, needle), ilike(profiles.bio, needle)))
          .limit(limit)
      : Promise.resolve([]),
    include("event")
      ? db
          .select({ id: cohorts.id, name: cohorts.name, description: cohorts.description, status: cohorts.status })
          .from(cohorts)
          .where(or(ilike(cohorts.name, needle), ilike(cohorts.description, needle)))
          .limit(limit)
      : Promise.resolve([]),
    include("event")
      ? db
          .select({ id: liveSessions.id, title: liveSessions.title, description: liveSessions.description, type: liveSessions.type, startsAt: liveSessions.startsAt })
          .from(liveSessions)
          .where(or(ilike(liveSessions.title, needle), ilike(liveSessions.description, needle)))
          .orderBy(desc(liveSessions.startsAt))
          .limit(limit)
      : Promise.resolve([]),
  ]);

  const hitsByType: Record<SearchType, SearchHit[]> = {
    article: articleRows.map((row) => ({
      type: "article",
      id: String(row.id),
      title: row.title,
      snippet: clip(row.excerpt),
      href: `/blog/${row.slug}`,
      meta: "Purpose Journal",
    })),
    course: courseRows.map((row) => ({
      type: "course",
      id: String(row.id),
      title: row.title,
      snippet: clip(row.summary),
      href: `/learn/courses/${row.slug}`,
      meta: "Academy course",
    })),
    lesson: lessonRows.map((row) => ({
      type: "lesson",
      id: String(row.id),
      title: row.title,
      snippet: clip(row.summary),
      href: `/learn/courses/${row.courseSlug}`,
      meta: `${row.kind} lesson`,
    })),
    resource: resourceRows.map((row) => ({
      type: "resource",
      id: String(row.id),
      title: row.title,
      snippet: clip(row.description),
      href: `/resources`,
      meta: `${row.type} · download`,
    })),
    discussion: threadRows.map((row) => ({
      type: "discussion",
      id: String(row.id),
      title: row.title,
      snippet: clip(row.prompt),
      href: `/community/thread/${row.id}`,
      meta: `Community · ${row.authorName}`,
    })),
    person: peopleRows.map((row) => ({
      type: "person",
      id: row.id,
      title: row.fullName,
      snippet: clip(row.bio),
      href: `/about`,
      meta: row.title ?? "Purpose Course community",
    })),
    event: [
      ...cohortRows.map((row) => ({
        type: "event" as const,
        id: `cohort-${row.id}`,
        title: row.name,
        snippet: clip(row.description),
        href: `/learn/cohort`,
        meta: `Cohort · ${row.status}`,
      })),
      ...sessionRows.map((row) => ({
        type: "event" as const,
        id: `session-${row.id}`,
        title: row.title,
        snippet: clip(row.description),
        href: `/learn/live/${row.id}`,
        meta: `${row.type.replace("_", " ")} · ${row.startsAt.toISOString().slice(0, 10)}`,
      })),
    ],
  };

  const groups: SearchGroup[] = GROUPS.map((group) => ({
    ...group,
    hits: hitsByType[group.type].slice(0, limit),
  })).filter((group) => group.hits.length > 0 || !options.types || options.types.includes(group.type));

  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);
  return { query: term, groups, total };
}

export async function getSearchFacets() {
  const rows = await db.execute(sql`
    select 'article' as type, count(*)::int as value from articles where status = 'published'
    union all select 'course', count(*)::int from courses where status = 'published'
    union all select 'lesson', count(*)::int from lessons where status = 'published'
    union all select 'resource', count(*)::int from resources
    union all select 'discussion', count(*)::int from discussion_threads where is_removed = false
    union all select 'person', count(*)::int from profiles
    union all select 'event', count(*)::int from live_sessions
  `);
  return (rows.rows as { type: SearchType; value: number }[]).map((row) => ({ ...row, value: Number(row.value) }));
}
