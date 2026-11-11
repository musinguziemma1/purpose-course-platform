import type { MetadataRoute } from "next";
import { getPublishedArchive } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://purposecourse.org";
  const staticRoutes = ["", "/course", "/blog", "/resources", "/community", "/about", "/login"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const articles = await getPublishedArchive();
    return [
      ...staticRoutes,
      ...articles.map((article) => ({
        url: `${base}/blog/${article.slug}`,
        lastModified: article.updatedAt ?? new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
