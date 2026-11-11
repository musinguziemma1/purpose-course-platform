import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArticleForm } from "@/components/admin/article-form";
import { getCategoryOptions } from "@/app/actions/publishing";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canReviewArticles, getSessionUser } from "@/lib/auth";

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
    <div className="space-y-5">
      <div>
        <Link href="/admin/articles" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to articles
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-navy">New article</h1>
        <p className="text-[12.5px] text-stone-600">
          Drafts stay private until you submit them. Saving creates revision 1 in the history.
        </p>
      </div>
      <ArticleForm
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        authors={authors}
        canReview={canReviewArticles(user)}
        currentUserId={user?.profileId ?? ""}
      />
    </div>
  );
}
