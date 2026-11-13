import { publicUrl } from "@/lib/site-url";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { CoverImage } from "@/components/site/cover-image";
import { editorialImage } from "@/lib/media";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Mail, Share2 } from "lucide-react";
import { ArticleCard } from "@/components/site/article-card";
import { ReadingProgress } from "@/components/site/reading-progress";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { accentClasses } from "@/components/site/principle-icon";
import { renderRichText } from "@/lib/markdown";
import { initials, cn } from "@/lib/utils";
import { getArticleBySlug, publishDueArticles } from "@/db/queries";
import { serializeStructuredData } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);
  if (!article) return { title: "Article not found" };
  return {
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt ?? undefined,
    alternates: { canonical: publicUrl(`/blog/${article.slug}`) },
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
      authors: [article.authorName],
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  await publishDueArticles().catch(() => 0);
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const accent = accentClasses(article.categoryAccent);
  const shareUrl = publicUrl(`/blog/${article.slug}`);
  const shareText = encodeURIComponent(article.title);

  return (
    <article>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
            __html: serializeStructuredData({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.excerpt ?? article.seoDescription,
            image: article.coverImageUrl ?? undefined,
            datePublished: article.publishedAt?.toISOString(),
            dateModified: article.updatedAt?.toISOString(),
            author: { "@type": "Person", name: article.authorName },
            publisher: { "@type": "Organization", name: "Purpose Course" },
            mainEntityOfPage: shareUrl,
            articleSection: article.categoryName ?? undefined,
            keywords: article.tags.map((tag) => tag.name).join(", "),
          }),
        }}
      />
      <ReadingProgress />
      <header className="relative isolate overflow-hidden border-b border-navy/10 bg-cream/50">
        <HeroBackdrop src={article.coverImageUrl || editorialImage(article.categorySlug)} />
        <div className="shell relative py-10 lg:py-14">
          <Link href="/blog" className="inline-flex items-center gap-2 text-[12px] font-medium text-stone-600 hover:text-navy">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the journal
          </Link>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {article.categoryName ? (
                  <Link
                    href={`/blog?category=${article.categorySlug}`}
                    className={cn("rounded-full px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-paper", accent.bg)}
                  >
                    {article.categoryName} · {article.principleQuestion ?? ""}
                  </Link>
                ) : null}
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-stone-500">
                  <Clock className="h-3 w-3" /> {article.readingMinutes} min read
                </span>
              </div>

              <h1 className="display mt-5 text-[2.4rem] leading-[1.06] text-navy sm:text-5xl">{article.title}</h1>
              {article.subtitle ? (
                <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-stone-600">{article.subtitle}</p>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy font-serif text-sm text-paper">
                    {initials(article.authorName)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-navy">{article.authorName}</p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-stone-500">{article.authorTitle}</p>
                  </div>
                </div>
                <span className="hidden h-8 w-px bg-navy/15 sm:block" />
                <p className="text-[12px] text-stone-500">
                  Published{" "}
                  {article.publishedAt
                    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(article.publishedAt)
                    : "recently"}
                </p>
              </div>
            </div>

              <div className="relative h-64 overflow-hidden rounded-2xl border border-navy/10 shadow-editorial sm:h-80">
                <CoverImage src={article.coverImageUrl || editorialImage(article.categorySlug)} alt={article.coverImageUrl ? (article.coverAlt ?? article.title) : ""} eager sizes="(min-width: 1024px) 40vw, 100vw" />
              </div>
          </div>
        </div>
      </header>

      <div className="shell grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-16">
        <div>
          <div className="prose-editorial max-w-[42rem]">{renderRichText(article.body)}</div>

          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-navy/10 pt-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Share</span>
            {[
              { href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, label: "X / Twitter" },
              { href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, label: "Facebook" },
              { href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, label: "LinkedIn" },
              { href: `mailto:?subject=${shareText}&body=${shareUrl}`, label: "Email" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 px-3 text-[11.5px] text-navy/75 transition-colors hover:border-gold hover:text-gold-dark"
              >
                {item.label === "Email" ? <Mail className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {item.label}
              </a>
            ))}
          </div>

          {article.tags.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog?tag=${tag.slug}`}
                  className="rounded-full border border-navy/12 px-3 py-1 text-[11.5px] text-stone-600 transition-colors hover:border-navy/30 hover:text-navy"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-12 rounded-2xl border border-navy/10 bg-cream/60 p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-base text-paper">
                {initials(article.authorName)}
              </span>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">Written by</p>
                <p className="mt-1 font-serif text-xl text-navy">{article.authorName}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
                  {article.authorTitle} at Purpose Course. Writing on purpose, work and the quiet disciplines that
                  sustain a public assignment.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-navy/10 bg-paper p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">In this series</p>
            <div className="mt-3">
              {article.related.length ? (
                article.related.map((related) => <ArticleCard key={related.id} article={related} variant="minimal" />)
              ) : (
                <p className="text-sm text-stone-600">More writing is on the way.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-navy p-5 text-paper">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">The Purpose Letter</p>
            <p className="mt-2 font-serif text-lg leading-snug">One thoughtful letter every Thursday.</p>
            <div className="mt-4">
              <NewsletterForm variant="dark" source={`article:${article.slug}`} />
            </div>
          </div>
        </aside>
      </div>

      <section className="border-t border-navy/10 bg-cream/50 py-14">
        <div className="shell">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-serif text-2xl text-navy">Keep reading</h2>
            <Link href="/blog" className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy hover:text-gold-dark">
              All articles →
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {article.related.map((related) => (
              <ArticleCard key={`bottom-${related.id}`} article={related} />
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
