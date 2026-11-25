import { requireAdminPage } from "@/lib/page-access";
import { ArticleForm } from "@/components/admin/article-form";
import { getCategoryOptions } from "@/app/actions/publishing";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canReviewArticles, getSessionUser } from "@/lib/auth";
import { ConsoleHeader } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "New article" };

export default async function NewArticlePage() {
  await requireAdminPage("/admin/articles/new");
  const user = await getSessionUser();
  const [categories, authors] = await Promise.all([
    getCategoryOptions(),
    db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).where(canReviewArticles(user) ? undefined : eq(profiles.id, user!.profileId)),
  ]);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/articles", label: "Back to articles" }}
        eyebrow="Publishing"
        title="New article"
        description="Drafts stay private until you submit them. Saving creates revision 1 in the history."
      />
      <ArticleForm
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        authors={authors}
        canReview={canReviewArticles(user)}
        currentUserId={user?.profileId ?? ""}
      />
    </div>
  );
}
