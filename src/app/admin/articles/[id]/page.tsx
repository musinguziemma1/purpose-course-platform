import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookMarked, Clock, ExternalLink, History, MessageSquare } from "lucide-react";
import { ArticleForm } from "@/components/admin/article-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { WorkflowPanel } from "@/components/admin/workflow-panel";
import { getArticleForAdmin } from "@/db/queries";
import { canPublishArticles, canReviewArticles, getSessionUser } from "@/lib/auth";
import { formatDateTime, relativeTime, STATUS_META, type ArticleStatusValue } from "@/lib/utils";
import { ConsoleHeader, Panel, keyClass } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

const PIPELINE: ArticleStatusValue[] = ["draft", "submitted", "in_review", "approved", "scheduled", "published"];

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("/admin/articles/[id]");
  const { id } = await params;
  const [user, record] = await Promise.all([getSessionUser(), getArticleForAdmin(id)]);
  if (!record) notFound();

  const canReview = canReviewArticles(user);
  const isOwner = user?.profileId === record.article.authorId;
  const article = record.article;
  const stage = PIPELINE.indexOf(article.status as ArticleStatusValue);

  return (
    <div className="space-y-6">
      <ConsoleHeader
        back={{ href: "/admin/articles", label: "Back to articles" }}
        eyebrow={record.categoryName ?? "Uncategorised"}
        title={article.title}
        meta={
          <>
            <StatusBadge status={article.status} />
            <span className="text-[13px] text-stone-600">by {record.authorName}</span>
            <span className="text-[13px] text-stone-500">updated {relativeTime(article.updatedAt)}</span>
          </>
        }
        actions={
          <>
            {article.status === "published" ? (
              <Link href={`/blog/${article.slug}`} target="_blank" className={keyClass("paper", "sm")}>
                <ExternalLink aria-hidden /> View live
              </Link>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/70 px-3.5 py-2 text-[12.5px] text-stone-700 shadow-[inset_0_1px_2px_rgba(10,26,48,0.12)]">
              <Clock aria-hidden className="h-3.5 w-3.5" /> {article.readingMinutes} min read
            </span>
          </>
        }
      >
        {stage >= 0 ? (
          <ol aria-label="Publishing stage" className="flex flex-wrap items-center gap-1.5">
            {PIPELINE.map((step, index) => {
              const done = index < stage;
              const current = index === stage;
              return (
                <li key={step} aria-current={current ? "step" : undefined} className="flex items-center gap-1.5">
                  <span
                    className={`ui-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      current ? "border-gold/50 bg-gold/20 text-navy" : done ? "border-source/25 bg-source/10 text-source" : "border-navy/10 bg-paper text-stone-500"
                    }`}
                  >
                    <span aria-hidden className={`k-led ${current ? "k-led-gold k-led-pulse" : done ? "k-led-green" : "k-led-off"}`} style={{ width: 8, height: 8 }} />
                    {STATUS_META[step].label}
                  </span>
                  {index < PIPELINE.length - 1 ? <span aria-hidden className="h-px w-3 bg-navy/20" /> : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </ConsoleHeader>

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

          <div className="mt-6 grid gap-5 lg:grid-cols-2 lg:items-start">
            <Panel title="Review history" icon={MessageSquare}>
              <ul className="divide-y divide-navy/8">
                {record.reviews.length === 0 ? (
                  <li className="px-5 py-6 text-[13px] text-stone-600">No review events yet.</li>
                ) : (
                  record.reviews.map((review) => (
                    <li key={review.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold capitalize text-navy">{review.action.replace(/_/g, " ")}</p>
                        <p className="text-[12px] text-stone-500">{formatDateTime(review.createdAt)}</p>
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-stone-600">
                        {review.reviewerName ?? "System"}
                        {review.toStatus ? ` · → ${STATUS_META[review.toStatus as ArticleStatusValue].label}` : ""}
                      </p>
                      {review.comment ? (
                        <p className="mt-2 rounded-xl bg-cream/60 px-3.5 py-2 text-[13px] leading-relaxed text-stone-800 shadow-[inset_0_1px_2px_rgba(10,26,48,0.1)]">{review.comment}</p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </Panel>

            <Panel title="Revisions" icon={History}>
              <ol className="k-ledger">
                {record.revisions.map((revision) => (
                  <li key={revision.id} className="flex gap-3 py-3 pl-[1.45rem] pr-5">
                    <span aria-hidden className="k-rivet mt-1" />
                    <div className="min-w-0 flex-1 pl-6">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-navy">Revision {revision.revisionNumber}</p>
                        <p className="text-[12px] text-stone-500">{formatDateTime(revision.createdAt)}</p>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[12.5px] text-stone-700">{revision.title}</p>
                      <p className="mt-0.5 text-[12px] text-stone-600">{revision.changeNote ?? "No note"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24">
          <WorkflowPanel
            articleId={article.id}
            status={article.status}
            isOwner={isOwner}
            canReview={canReview}
            canPublish={canPublishArticles(user)}
            updatedAt={article.updatedAt}
            scheduledFor={article.scheduledFor}
          />
          <Panel title="Publishing rules" icon={BookMarked} bodyClassName="px-5 py-4 text-[13px] leading-relaxed text-stone-700">
            Draft → Submitted → In review → Approved → Scheduled → Published. Revision requests and rejections return the article with comments to the author. Scheduled pieces publish automatically.
          </Panel>
        </div>
      </div>
    </div>
  );
}
