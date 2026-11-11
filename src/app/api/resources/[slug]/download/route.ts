import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { resourceDownloads, resources } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const rows = await db.select().from(resources).where(eq(resources.slug, slug)).limit(1);
  const resource = rows[0];
  if (!resource) {
    return new Response("Resource not found", { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? null;

  await db.insert(resourceDownloads).values({ resourceId: resource.id, email });
  await db
    .update(resources)
    .set({ downloadCount: sql`${resources.downloadCount} + 1` })
    .where(eq(resources.id, resource.id));

  if (resource.fileUrl && resource.fileUrl.startsWith("http")) {
    return Response.redirect(resource.fileUrl, 302);
  }

  const content = `PURPOSE COURSE — ${resource.title.toUpperCase()}
Discover. Clarify. Live. Impact.
================================================================

${resource.description ?? ""}

Format: ${resource.fileFormat}
Level: ${resource.level ?? "All levels"}
Downloaded from purposecourse.org/resources/${resource.slug}

----------------------------------------------------------------
FIVE PURPOSE PRINCIPLES
1. Identity   — Who Am I?
2. Source     — Where Am I From?
3. Purpose    — Why Am I Here?
4. Potential  — What Can I Do?
5. Destiny    — Where Am I Going?

THE PROGRAMME — 15 SESSIONS OVER 15 WEEKS
Foundation (PURP 101-105) · Understanding Purpose
Intermediate (PURP 201-205) · Purpose Discovery and Clarity
Advanced (PURP 301-305) · Influence and Impact

Experiential learning · Key presentations · Case studies
Round tables · Transformational engagements

----------------------------------------------------------------
CONTACT
ssenyondolex@gmail.com
schoolofpurposeandleadership@gmail.com
+256 708 376 997

© ${new Date().getFullYear()} Purpose Course & The School of Purpose and Leadership
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="purpose-course-${resource.slug}.txt"`,
      "Cache-Control": "no-store",
    },
  });
}
