import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articles, courses, lessons, threads, resources } from "@/db/schema";
import { and, or, sql, ilike, eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const searchPattern = `%${query}%`;
    const results = [];

    // Search Articles (if no type filter or type is 'article')
    if (!type || type === "article") {
      const articleResults = await db
        .select({
          id: articles.id,
          title: articles.title,
          description: articles.subtitle,
          category: articles.categorySlug,
          publishedAt: articles.publishedAt,
        })
        .from(articles)
        .where(
          and(
            eq(articles.status, "published"),
            or(
              ilike(articles.title, searchPattern),
              ilike(articles.subtitle, searchPattern),
              ilike(articles.excerpt, searchPattern)
            )
          )
        )
        .orderBy(desc(articles.publishedAt))
        .limit(limit);

      results.push(
        ...articleResults.map((article) => ({
          id: article.id.toString(),
          title: article.title,
          description: article.description || "",
          type: "article",
          url: `/blog/${article.id}`,
          category: article.category || undefined,
          date: article.publishedAt,
        }))
      );
    }

    // Search Courses (if no type filter or type is 'course')
    if (!type || type === "course") {
      const courseResults = await db
        .select({
          id: courses.id,
          title: courses.title,
          description: courses.description,
          levelName: courses.levelName,
        })
        .from(courses)
        .where(
          and(
            eq(courses.isPublished, true),
            or(
              ilike(courses.title, searchPattern),
              ilike(courses.description, searchPattern)
            )
          )
        )
        .limit(limit);

      results.push(
        ...courseResults.map((course) => ({
          id: course.id.toString(),
          title: course.title,
          description: course.description || "",
          type: "course",
          url: `/learn/courses/${course.id}`,
          category: course.levelName || undefined,
        }))
      );
    }

    // Search Lessons (if no type filter or type is 'lesson')
    if (!type || type === "lesson") {
      const lessonResults = await db
        .select({
          id: lessons.id,
          title: lessons.title,
          description: lessons.description,
        })
        .from(lessons)
        .where(
          and(
            eq(lessons.isPublished, true),
            or(
              ilike(lessons.title, searchPattern),
              ilike(lessons.description, searchPattern)
            )
          )
        )
        .limit(limit);

      results.push(
        ...lessonResults.map((lesson) => ({
          id: lesson.id.toString(),
          title: lesson.title,
          description: lesson.description || "",
          type: "lesson",
          url: `/learn/lessons/${lesson.id}`,
        }))
      );
    }

    // Search Discussions (if no type filter or type is 'discussion')
    if (!type || type === "discussion") {
      const discussionResults = await db
        .select({
          id: threads.id,
          title: threads.title,
          excerpt: threads.excerpt,
          groupSlug: threads.groupSlug,
        })
        .from(threads)
        .where(
          and(
            eq(threads.isRemoved, false),
            or(
              ilike(threads.title, searchPattern),
              ilike(threads.excerpt, searchPattern)
            )
          )
        )
        .limit(limit);

      results.push(
        ...discussionResults.map((thread) => ({
          id: thread.id.toString(),
          title: thread.title,
          description: thread.excerpt || "",
          type: "discussion",
          url: `/community/thread/${thread.id}`,
          category: thread.groupSlug || undefined,
        }))
      );
    }

    // Search Resources (if no type filter or type is 'resource')
    if (!type || type === "resource") {
      const resourceResults = await db
        .select({
          id: resources.id,
          title: resources.title,
          description: resources.description,
          resourceType: resources.resourceType,
        })
        .from(resources)
        .where(
          and(
            eq(resources.isPublished, true),
            or(
              ilike(resources.title, searchPattern),
              ilike(resources.description, searchPattern)
            )
          )
        )
        .limit(limit);

      results.push(
        ...resourceResults.map((resource) => ({
          id: resource.id.toString(),
          title: resource.title,
          description: resource.description || "",
          type: "resource",
          url: `/resources/${resource.id}`,
          category: resource.resourceType || undefined,
        }))
      );
    }

    // Sort by relevance (title matches first, then description matches)
    const sortedResults = results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(query.toLowerCase());
      const bTitle = b.title.toLowerCase().includes(query.toLowerCase());
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });

    return NextResponse.json({
      results: sortedResults.slice(0, limit),
      total: sortedResults.length,
      query,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to perform search", results: [], total: 0 },
      { status: 500 }
    );
  }
}
