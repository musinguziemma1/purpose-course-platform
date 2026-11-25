import { publicUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { ArticleCard } from "@/components/site/article-card";
import { Reveal } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { accentClasses } from "@/components/site/principle-icon";
import { PublicHero } from "@/components/site/public-hero";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCategoriesWithCounts, getPopularTags, getPublishedArticles, publishDueArticles } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Purpose Journal",
  description:
    "Articles on identity, source, purpose, potential and destiny — practical writing for people serious about living their assignment.",
  alternates: { canonical: publicUrl("/blog") },
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
  const filtered = Boolean(category || params.tag || params.q);
  // The unfiltered first page leads with one large story: 2×2 cells plus eight cards fill the three-column grid evenly.
  const feature = !filtered && page === 1 && result.items.length > 4 ? result.items[0] : null;
  const rest = feature ? result.items.slice(1) : result.items;

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
      <PublicHero
        tone="light"
        image="/images/journal-purpose.jpg"
        eyebrow="The Purpose Journal"
        title={activeCategory ? `${activeCategory.name}: ${activeCategory.principleQuestion}` : "Writing for the road between discovery and impact."}
        description={
          activeCategory?.description ??
          "Essays, field notes and practical guides from the Purpose Course team — organised around the five questions that shape a purposeful life."
        }
      >
        <form action="/blog" role="search" className="glass flex max-w-xl items-center gap-1.5 rounded-full p-1.5 focus-within:ring-2 focus-within:ring-gold/50">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <label htmlFor="journal-search" className="sr-only">Search articles</label>
          <Search aria-hidden className="ml-3 h-4 w-4 shrink-0 text-stone-500" />
          <input
            id="journal-search"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Search the journal…"
            className="h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-navy outline-none placeholder:text-stone-500 sm:text-sm"
          />
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-navy px-5 text-sm font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-navy-700 active:scale-[0.97]"
          >
            Search
          </button>
        </form>
      </PublicHero>

      <section className="py-12 lg:py-14">
        <div className="shell">
          <nav aria-label="Journal principles" className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            <Link
              href={buildHref({ category: undefined, page: undefined })}
              aria-current={!category ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
                !category ? "border-navy bg-navy text-paper" : "border-navy/15 bg-paper text-navy hover:border-navy/40",
              )}
            >
              All writing
              <span className="ml-2 text-[11px] opacity-70">{categories.reduce((sum, item) => sum + Number(item.articleCount), 0)}</span>
            </Link>
            {categories.map((item) => {
              const active = item.slug === category;
              const accent = accentClasses(item.accent);
              return (
                <Link
                  key={item.id}
                  href={buildHref({ category: active ? undefined : item.slug, page: undefined })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
                    active ? cn(accent.bg, "border-transparent text-paper") : "border-navy/15 bg-paper text-navy hover:border-navy/40",
                  )}
                >
                  {item.name}
                  <span className="ml-2 text-[11px] opacity-70">{item.articleCount}</span>
                </Link>
              );
            })}
          </nav>

          {tags.length ? (
            <div className="mt-5 flex flex-wrap items-center gap-1.5 border-y border-navy/10 py-3">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Topics</span>
              {tags.map((tag) => {
                const active = tag.slug === params.tag;
                return (
                  <Link
                    key={tag.id}
                    href={buildHref({ tag: active ? undefined : tag.slug, page: undefined })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3 text-[12px] transition-colors",
                      active ? "bg-gold/20 font-medium text-gold-dark" : "text-stone-600 hover:bg-cream hover:text-navy",
                    )}
                  >
                    #{tag.name}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-600" aria-live="polite">
              <span className="font-medium text-navy">{result.total}</span> article{result.total === 1 ? "" : "s"}
              {activeCategory ? ` in ${activeCategory.name}` : ""}
              {activeTag ? ` tagged #${activeTag.name}` : ""}
              {params.q ? ` matching “${params.q}”` : ""}
            </p>
            {filtered ? (
              <Link href="/blog" className="inline-flex min-h-11 items-center text-[13px] font-medium text-gold-dark hover:underline">
                Clear filters
              </Link>
            ) : null}
          </div>

          {result.items.length === 0 ? (
            <div className="mesh-light mt-10 rounded-3xl border border-navy/10 p-10 text-center">
              <Search aria-hidden className="mx-auto h-8 w-8 text-gold-dark" />
              <p className="mt-4 font-serif text-2xl text-navy">Nothing here yet.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                Try a different principle or search term. New writing is published every week.
              </p>
              <Link href="/blog" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-navy underline decoration-gold decoration-2 underline-offset-4">
                Browse all articles
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {feature ? (
                <Reveal className="sm:col-span-2 lg:row-span-2">
                  <ArticleCard article={feature} variant="feature" className="h-full" />
                </Reveal>
              ) : null}
              {rest.map((article, index) => (
                <Reveal key={article.id} delay={Math.min((index + (feature ? 1 : 0)) * 0.05, 0.3)}>
                  <ArticleCard article={article} className="h-full" />
                </Reveal>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 ? (
                <Link
                  href={buildHref({ page: String(page - 1) })}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-navy/15 px-4 text-sm text-navy transition-colors hover:border-navy/40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </Link>
              ) : null}
              {Array.from({ length: totalPages }).map((_, index) => (
                <Link
                  key={index}
                  href={buildHref({ page: String(index + 1) })}
                  aria-current={index + 1 === page ? "page" : undefined}
                  aria-label={`Page ${index + 1}`}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full text-sm transition-colors",
                    index + 1 === page ? "bg-navy text-paper" : "border border-navy/15 text-navy hover:border-navy/40",
                  )}
                >
                  {index + 1}
                </Link>
              ))}
              {page < totalPages ? (
                <Link
                  href={buildHref({ page: String(page + 1) })}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-navy/15 px-4 text-sm text-navy transition-colors hover:border-navy/40"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </nav>
          ) : null}

          <Reveal className="mt-16">
            <div className="mesh-light relative overflow-hidden rounded-3xl border border-navy/10 p-7 shadow-card sm:p-10">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                <div>
                  <Badge variant="gold">Subscribe</Badge>
                  <h2 className="mt-3 font-serif text-3xl text-navy">Get the next article in your inbox.</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
                    The Purpose Letter arrives every Thursday with one new essay and a question to take into your week.
                  </p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <NewsletterForm source="blog" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
