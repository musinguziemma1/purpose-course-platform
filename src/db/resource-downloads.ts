import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resourceDownloads, resources } from "@/db/schema";
import { resourceFileTarget } from "@/lib/resource-files";

export async function beginResourceDownload(slug: string) {
  if (!slug || slug.length > 160) return null;
  return db.transaction(async (tx) => {
    const [resource] = await tx.select({ id: resources.id, fileUrl: resources.fileUrl }).from(resources).where(eq(resources.slug, slug)).for("update").limit(1);
    const target = resourceFileTarget(resource?.fileUrl ?? null);
    if (!resource || !target) return null;
    await tx.insert(resourceDownloads).values({ resourceId: resource.id });
    await tx.update(resources).set({ downloadCount: sql`${resources.downloadCount} + 1` }).where(eq(resources.id, resource.id));
    // This measures a download request, not receipt/completion or a unique person.
    return target;
  });
}
