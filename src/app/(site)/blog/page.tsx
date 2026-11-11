import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Filter, Search } from "lucide-react";
import { ArticleCard } from "@/components/site/article-card";
import { Reveal } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { accentClasses } from "@/components/site/principle-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCategoriesWithCounts, getPopularTags, getPublishedArticles, publishDueArticles } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Purpose Journal",
  description:
    "Articles on identity, source, purpose, potential and destiny — practical writing for people serious about living their assignment.",
  alternates: { canonical: "https://purposecourse.org/blog" },
};

const PAGE_SIZE = 9;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; q?: string; page?: string }>;
}) {
  await publishDueArticles().catch(() => 0);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const category = params.category;

  const [categories, tags, result] = await Promise.all([
    getCategoriesWithCounts(),
    getPopularTags(10),
    getPublishedArticles({
      categorySlug: category,
      tagSlug: params.tag,
      query: params.q?.trim(),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeCategory = categories.find((item) => item.slug === category);
  const activeTag = tags.find((item) => item.slug === params.tag);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { category, tag: params.tag, q: params.q, ...overrides };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const qs = query.toString();
    return qs ? `/blog?${qs}` : "/blog";
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy/10 bg-cream/60">
        <div className="absolute inset-0 paper-texture opacity-50" aria-hidden />
        <div className="shell relative py-14 lg:py-20">
          <p className="eyebrow">The Purpose Journal</p>
          <h1 className="display mt-4 max-w-3xl text-4xl text-navy sm:text-5xl lg:text-[3.6rem]">
            {activeCategory ? `${activeCategory.name}: ${activeCategory.principleQuestion}` : "Writing for the road between discovery and impact."}
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-stone-600">
            {activeCategory?.description ??
              "Essays, field notes and practical guides from the Purpose Course team — organised around the five questions that shape a purposeful life."}
          </p>

          <form action="/blog" className="mt-8 flex max-w-xl items-center gap-2">
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Search the journal…"
                className="h-11 w-full rounded-full border border-navy/15 bg-paper pl-10 pr-4 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                aria-label="Search articles"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-medium text-paper hover:bg-navy-700"
            >
              <Filter className="h-4 w-4" /> Filter
            </button>
          </form>
        </div>
      </section>

      <section className="py-12">
        <div className="shell">
          <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto pb-2">
            <Link
              href={buildHref({ category: undefined, page: undefined })}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors",
                !category ? "border-navy bg-navy text-paper" : "border-navy/15 bg-paper text-navy hover:border-navy/40",
              )}
            >
              All writing
              <span className="ml-2 text-[10px] opacity-60">{categories.reduce((sum, item) => sum + Number(item.articleCount), 0)}</span>
            </Link>
            {categories.map((item) => {
              const active = item.slug === category;
              const accent = accentClasses(item.accent);
              return (
                <Link
                  key={item.id}
                  href={buildHref({ category: active ? undefined : item.slug, page: undefined })}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors",
                    active ? cn(accent.bg, "border-transparent text-paper") : "border-navy/15 bg-paper text-navy hover:border-navy/40",
                  )}
                >
                  {item.name}
                  <span className="ml-2 text-[10px] opacity-60">{item.articleCount}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-y border-navy/10 py-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-500">Topics</span>
            {tags.map((tag) => {
              const active = tag.slug === params.tag;
              return (
                <Link
                  key={tag.id}
                  href={buildHref({ tag: active ? undefined : tag.slug, page: undefined })}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
                    active ? "bg-gold/20 font-medium text-gold-dark" : "text-stone-600 hover:bg-cream hover:text-navy",
                  )}
                >
                  #{tag.name}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-600">
              <span className="font-medium text-navy">{result.total}</span> article{result.total === 1 ? "" : "s"}
              {activeCategory ? ` in ${activeCategory.name}` : ""}
              {activeTag ? ` tagged #${activeTag.name}` : ""}
              {params.q ? ` matching “${params.q}”` : ""}
            </p>
            {(category || params.tag || params.q) && (
              <Link href="/blog" className="text-[12px] font-medium text-gold-dark hover:underline">
                Clear filters
              </Link>
            )}
          </div>

          {result.items.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-navy/10 bg-cream/50 p-10 text-center">
              <p className="font-serif text-2xl text-navy">Nothing here yet.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                Try a different principle or search term. New writing is published every week.
              </p>
              <Link href="/blog" className="mt-5 inline-flex text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4">
                Browse all articles
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((article, index) => (
                <Reveal key={article.id} delay={Math.min(index * 0.05, 0.3)}>
                  <ArticleCard article={article} className="h-full" />
                </Reveal>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 ? (
                <Link
                  href={buildHref({ page: String(page - 1) })}
                  className="rounded-full border border-navy/15 px-4 py-2 text-sm text-navy hover:border-navy/40"
                >
                  Previous
                </Link>
              ) : null}
              {Array.from({ length: totalPages }).map((_, index) => (
                <Link
                  key={index}
                  href={buildHref({ page: String(index + 1) })}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm",
                    index + 1 === page ? "bg-navy text-paper" : "border border-navy/15 text-navy hover:border-navy/40",
                  )}
                >
                  {index + 1}
                </Link>
              ))}
              {page < totalPages ? (
                <Link
                  href={buildHref({ page: String(page + 1) })}
                  className="inline-flex items-center gap-1 rounded-full border border-navy/15 px-4 py-2 text-sm text-navy hover:border-navy/40"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </nav>
          ) : null}

          <div className="mt-16 grid gap-6 rounded-2xl border border-navy/10 bg-cream/60 p-7 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="gold">Subscribe</Badge>
              <h2 className="mt-3 font-serif text-2xl text-navy">Get the next article in your inbox.</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                The Purpose Letter arrives every Thursday with one new essay and a question to take into your week.
              </p>
            </div>
            <NewsletterForm source="blog" />
          </div>
        </div>
      </section>
    </>
  );
}
