import { publicOrigin } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { getPublishedArchive } from "@/db/queries";
import { getActiveStoreBooks } from "@/db/bookstore";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicOrigin();
  const staticRoutes = ["", "/course", "/events", "/blog", "/resources", "/bookstore", "/community", "/about", "/contact", "/privacy"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const [articles, books] = await Promise.all([getPublishedArchive(), getActiveStoreBooks()]);
    return [
      ...staticRoutes,
      ...articles.map((article) => ({
        url: `${base}/blog/${article.slug}`,
        lastModified: article.updatedAt ?? new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...books.map((book) => ({
        url: `${base}/bookstore/${book.slug}`,
        lastModified: book.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
