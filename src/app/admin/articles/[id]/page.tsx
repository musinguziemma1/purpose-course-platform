import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, History, MessageSquare } from "lucide-react";
import { ArticleForm } from "@/components/admin/article-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { WorkflowPanel } from "@/components/admin/workflow-panel";
import { getArticleForAdmin } from "@/db/queries";
import { canPublishArticles, canReviewArticles, getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime, STATUS_META, type ArticleStatusValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("/admin/articles/[id]");
  const { id } = await params;
  const [user, record] = await Promise.all([getSessionUser(), getArticleForAdmin(id)]);
  if (!record) notFound();

  const canReview = canReviewArticles(user);
  const isOwner = user?.profileId === record.article.authorId;
  const article = record.article;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/articles" className="inline-flex items-center gap-1.5 text-[11.5px] text-stone-600 hover:text-navy">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to articles
          </Link>
          <h1 className="mt-2 max-w-2xl font-serif text-2xl leading-snug text-navy">{article.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <StatusBadge status={article.status} />
            <span className="text-[11px] text-stone-500">{record.categoryName ?? "Uncategorised"}</span>
            <span className="text-[11px] text-stone-500">by {record.authorName}</span>
            <span className="text-[11px] text-stone-400">updated {relativeTime(article.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {article.status === "published" ? (
            <Link
              href={`/blog/${article.slug}`}
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-3.5 text-[11.5px] font-medium text-navy hover:bg-cream"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View live
            </Link>
          ) : null}
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-3.5 text-[11.5px] text-stone-600">
            <Clock className="h-3.5 w-3.5" /> {article.readingMinutes} min read
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_19rem] xl:items-start">
        <div className="min-w-0">
          <ArticleForm
            article={{
              id: article.id,
              title: article.title,
              subtitle: article.subtitle,
              excerpt: article.excerpt,
              body: article.body,
              categoryId: article.categoryId,
              authorId: article.authorId,
              coverImageUrl: article.coverImageUrl,
              coverAlt: article.coverAlt,
              seoTitle: article.seoTitle,
              seoDescription: article.seoDescription,
              isFeatured: article.isFeatured,
              tags: record.tags,
              updatedAt: article.updatedAt,
            }}
            categories={record.categories.map((category) => ({ id: category.id, name: category.name }))}
            authors={record.authors}
            canReview={canReview}
            currentUserId={user?.profileId ?? ""}
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="admin-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-navy/10 px-4 py-3">
                <MessageSquare className="h-3.5 w-3.5 text-gold-dark" />
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Review history</p>
              </div>
              <ul className="divide-y divide-navy/8">
                {record.reviews.length === 0 ? (
                  <li className="px-4 py-6 text-[12px] text-stone-500">No review events yet.</li>
                ) : (
                  record.reviews.map((review) => (
                    <li key={review.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11.5px] font-semibold capitalize text-navy">{review.action.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-stone-400">{formatDateTime(review.createdAt)}</p>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-stone-500">
                        {review.reviewerName ?? "System"}
                        {review.toStatus ? ` · → ${STATUS_META[review.toStatus as ArticleStatusValue].label}` : ""}
                      </p>
                      {review.comment ? (
                        <p className="mt-1.5 rounded-md bg-cream/70 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-stone-700">
                          {review.comment}
                        </p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="admin-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-navy/10 px-4 py-3">
                <History className="h-3.5 w-3.5 text-gold-dark" />
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy">Revisions</p>
              </div>
              <ul className="divide-y divide-navy/8">
                {record.revisions.map((revision) => (
                  <li key={revision.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11.5px] font-semibold text-navy">Revision {revision.revisionNumber}</p>
                      <p className="text-[10px] text-stone-400">{formatDateTime(revision.createdAt)}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-600">{revision.title}</p>
                    <p className="mt-0.5 text-[10.5px] text-stone-500">{revision.changeNote ?? "No note"}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-6">
          <WorkflowPanel
            articleId={article.id}
            status={article.status}
            isOwner={isOwner}
            canReview={canReview}
            canPublish={canPublishArticles(user)}
            updatedAt={article.updatedAt}
            scheduledFor={article.scheduledFor}
          />
          <div className="mt-4 rounded-xl border border-navy/10 bg-cream/50 p-4 text-[11px] leading-relaxed text-stone-600">
            <p className="mb-1 font-semibold text-navy">Publishing rules</p>
            Draft → Submitted → In review → Approved → Scheduled → Published. Revision requests and rejections return
            the article with comments to the author. Scheduled pieces publish automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
