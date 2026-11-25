import "./journal.css";
import { publicUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { Clipping, LeadStory, PurposeLetter } from "@/components/blog/journal";
import { getCategoriesWithCounts, getPopularTags, getPublishedArticles, publishDueArticles } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Purpose Journal",
  description:
    "Articles on identity, source, purpose, potential and destiny — practical writing for people serious about living their assignment.",
  alternates: { canonical: publicUrl("/blog") },
};

const PAGE_SIZE = 9;

/* Each principle's colour marks its index tab. */
const ACCENT_HEX: Record<string, string> = {
  navy: "#122a4d",
  green: "#2f6b40",
  gold: "#b98a1f",
  purple: "#5a3a8a",
  teal: "#155e63",
  stone: "#44403c",
};

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
  // The unfiltered first page leads with one story on the front page; the rest are clippings on the desk.
  const feature = !filtered && page === 1 && result.items.length > 4 ? result.items[0] : null;
  const rest = feature ? result.items.slice(1) : result.items;
  const allCount = categories.reduce((sum, item) => sum + Number(item.articleCount), 0);
  // The masthead's dateline: this page renders per request, so it always shows today's date.
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

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
    <div className="jr-desk pb-20">
      <div className="shell pt-8 sm:pt-12">
        {/* The principle sections are index tabs standing on the paper's top edge. */}
        <nav aria-label="Journal principles" className="jr-tabs">
          <Link href={buildHref({ category: undefined, page: undefined })} aria-current={!category ? "page" : undefined} className="jr-tab">
            All writing <span className="jr-tab-count">{allCount}</span>
          </Link>
          {categories.map((item) => {
            const active = item.slug === category;
            return (
              <Link
                key={item.id}
                href={buildHref({ category: active ? undefined : item.slug, page: undefined })}
                aria-current={active ? "page" : undefined}
                className="jr-tab"
                style={{ "--jr-tab": ACCENT_HEX[item.accent ?? "navy"] ?? ACCENT_HEX.navy } as CSSProperties}
              >
                {item.name} <span className="jr-tab-count">{item.articleCount}</span>
              </Link>
            );
          })}
        </nav>

        <div className="jr-sheet px-5 pb-10 pt-6 sm:px-10 sm:pt-8">
          <header>
            <div className="jr-dateline jr-masthead-rise">
              <span>{today}</span>
              <span>
                {allCount} article{allCount === 1 ? "" : "s"} · {categories.length} sections
              </span>
              <span>New writing every week</span>
            </div>
            <h1 className="jr-title jr-masthead-rise mt-6" style={{ "--jr-d": "60ms" } as CSSProperties}>
              The Purpose{" "}
              <svg aria-hidden viewBox="0 0 32 32" className="jr-title-ornament inline-block h-[0.55em] w-[0.55em] align-middle" fill="currentColor">
                <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" />
              </svg>{" "}
              Journal
            </h1>
            <div aria-hidden className="jr-rule mt-5" />
            <p className="jr-motto jr-masthead-rise mt-3" style={{ "--jr-d": "140ms" } as CSSProperties}>
              Writing for the road between discovery and impact — organised around the five questions that shape a purposeful life.
            </p>
            <form action="/blog" role="search" className="jr-classified jr-masthead-rise mx-auto mt-6 max-w-xl" style={{ "--jr-d": "200ms" } as CSSProperties}>
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <label htmlFor="journal-search" className="sr-only">
                Search articles
              </label>
              <Search aria-hidden className="ml-2 h-4 w-4 shrink-0 text-[#5b5446]" />
              <input
                id="journal-search"
                name="q"
                type="search"
                defaultValue={params.q}
                placeholder="Search the journal…"
                className="h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-[#1a1d24] outline-none placeholder:text-[#7a7262] sm:text-sm"
              />
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center bg-[#1a1d24] px-5 text-sm font-semibold uppercase tracking-[0.12em] text-[#f6f1e3] transition-transform duration-150 active:translate-y-px"
              >
                Search
              </button>
            </form>
          </header>

          {activeCategory ? (
            <section aria-labelledby="section-heading" className="mt-9 border-t-2 border-[#1a1d24] pt-6 text-center">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#5b5446]">Section</p>
              <h2 id="section-heading" className="mt-2 font-serif text-[1.9rem] leading-tight text-[#1a1d24] sm:text-[2.3rem]">
                {activeCategory.name}: {activeCategory.principleQuestion}
              </h2>
              {activeCategory.description ? (
                <p className="mx-auto mt-2 max-w-2xl font-serif text-[1.05rem] italic leading-relaxed text-[#3f3a30]">{activeCategory.description}</p>
              ) : null}
            </section>
          ) : null}

          {tags.length ? (
            <div className="mt-7 flex flex-wrap items-center gap-x-1 gap-y-1 border-y border-[rgba(26,29,36,0.3)] py-2">
              <span className="mr-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#5b5446]">In this edition</span>
              {tags.map((tag) => {
                const active = tag.slug === params.tag;
                return (
                  <Link
                    key={tag.id}
                    href={buildHref({ tag: active ? undefined : tag.slug, page: undefined })}
                    aria-current={active ? "page" : undefined}
                    className="jr-topic"
                  >
                    #{tag.name}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-[#3f3a30]" aria-live="polite">
              <span className="font-semibold text-[#1a1d24]">{result.total}</span> article{result.total === 1 ? "" : "s"}
              {activeCategory ? ` in ${activeCategory.name}` : ""}
              {activeTag ? ` tagged #${activeTag.name}` : ""}
              {params.q ? ` matching “${params.q}”` : ""}
            </p>
            {filtered ? (
              <Link href="/blog" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-[#122a4d] underline decoration-[#a5811a] decoration-2 underline-offset-4">
                Clear filters
              </Link>
            ) : null}
          </div>

          {feature ? (
            <div className="mt-6 border-t-2 border-[#1a1d24] pt-8">
              <LeadStory article={feature} />
            </div>
          ) : null}

          {result.items.length === 0 ? (
            <div className="mt-8 border-y-2 border-[#1a1d24] py-12 text-center">
              <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#9b2c35]">Stop press</p>
              <p className="mt-3 font-serif text-[2rem] text-[#1a1d24]">Nothing here yet.</p>
              <p className="mx-auto mt-2 max-w-md text-[15px] text-[#3f3a30]">Try a different principle or search term. New writing is published every week.</p>
              <Link href="/blog" className="mt-5 inline-flex min-h-11 items-center text-[15px] font-semibold text-[#122a4d] underline decoration-[#a5811a] decoration-2 underline-offset-4">
                Browse all articles
              </Link>
            </div>
          ) : null}
        </div>

        {rest.length ? (
          <section aria-labelledby="clippings-heading" className="mt-16">
            <div className="flex items-center gap-4">
              <h2 id="clippings-heading" className="font-serif text-[1.6rem] text-[#1a1d24]">
                {feature ? "More from the journal" : "Articles"}
              </h2>
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[rgba(26,29,36,0.35)] to-transparent" />
            </div>
            <ul className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <Clipping key={article.id} article={article} />
              ))}
            </ul>
          </section>
        ) : null}

        {totalPages > 1 ? (
          <nav className="jr-folio mt-14 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 ? (
              <Link href={buildHref({ page: String(page - 1) })}>
                <ArrowLeft aria-hidden className="h-4 w-4" /> Previous
              </Link>
            ) : null}
            {Array.from({ length: totalPages }).map((_, index) => (
              <Link
                key={index}
                href={buildHref({ page: String(index + 1) })}
                aria-current={index + 1 === page ? "page" : undefined}
                aria-label={`Page ${index + 1}`}
              >
                {index + 1}
              </Link>
            ))}
            {page < totalPages ? (
              <Link href={buildHref({ page: String(page + 1) })}>
                Next <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : null}
          </nav>
        ) : null}

        <div className="mt-20">
          <PurposeLetter />
        </div>
      </div>
    </div>
  );
}
