import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { BookCard, type BookCardBook } from "@/components/bookstore/book-card";
import { BookCover } from "@/components/bookstore/book-cover";
import { BookPurchase } from "@/components/bookstore/book-purchase";
import { Reveal } from "@/components/motion/reveal";
import { Aurora, rise } from "@/components/site/public-hero";
import { getStoreCatalogue, getStoreCategories, type StorefrontBook } from "@/db/bookstore";
import { formatUgx } from "@/lib/bookstore-shared";
import { publicUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bookstore", description: "Purpose-led books, workbooks and journals for personal growth, leadership and meaningful impact.", alternates: { canonical: publicUrl("/bookstore") } };

const PROMISES = [
  ["01", "Curated, not crowded", "Every book supports purposeful living, stronger leadership or practical personal growth."],
  ["02", "Made for action", "Reflection prompts and applied frameworks turn reading into meaningful next steps."],
  ["03", "Human fulfilment", "Orders are confirmed by our team before pickup or delivery—clear, personal and accountable."],
];

function cardBook(book: StorefrontBook): BookCardBook {
  return { id: book.id, slug: book.slug, title: book.title, authorName: book.authorName, coverTone: book.coverTone, coverImageUrl: book.coverImageUrl, subtitle: book.subtitle, category: book.category, shortDescription: book.shortDescription, ratingTenths: book.ratingTenths, reviewCount: book.reviewCount, isNew: book.isNew, variants: book.variants.map(({ id, code, label, deliveryKind, priceUgx, compareAtPriceUgx, inventoryCount, isDefault }) => ({ id, code, label, deliveryKind: deliveryKind as "physical" | "digital", priceUgx, compareAtPriceUgx, inventoryCount, isDefault })) };
}

export default async function BookstorePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; format?: string; sort?: string }> }) {
  const filters = await searchParams;
  const [books, allBooks, categories] = await Promise.all([getStoreCatalogue(filters), getStoreCatalogue(), getStoreCategories()]);
  const featured = allBooks.find((book) => book.isFeatured && book.variants.length) ?? allBooks[0];
  const isFiltered = Boolean(filters.q || filters.category || filters.format || filters.sort);
  const pill = (active: boolean) =>
    cn(
      "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors",
      active ? "bg-navy text-paper" : "bg-cream text-navy hover:bg-gold/20",
    );

  return (
    <>
      <section className="mesh-dark relative isolate overflow-hidden text-paper">
        <Aurora />
        <div aria-hidden className="absolute inset-0 ink-grid opacity-20" />
        <div className="shell relative z-10 grid grid-cols-1 gap-12 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-center lg:py-20">
          <div>
            <p className="rise glass-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-gold" style={rise(0)}>
              <Sparkles className="h-3.5 w-3.5" />Read with intention
            </p>
            <h1 className="rise display mt-5 max-w-3xl text-[2.6rem] sm:text-6xl" style={rise(1)}>
              Books that help you understand <span className="text-sheen">who you are</span> and what to do next.
            </h1>
            <p className="rise mt-6 max-w-xl text-[16px] leading-relaxed text-paper/75" style={rise(2)}>
              Explore thoughtful books, practical workbooks and guided journals from the Purpose Course faculty. Built for discovery, disciplined growth and lasting contribution.
            </p>
            <form role="search" className="rise mt-8 flex max-w-xl items-center gap-1.5 rounded-full bg-paper p-1.5 shadow-xl focus-within:ring-2 focus-within:ring-gold/60" style={rise(3)}>
              <label htmlFor="store-search" className="sr-only">Search books</label>
              <Search aria-hidden className="ml-3 h-4 w-4 shrink-0 text-stone-500" />
              <input id="store-search" name="q" type="search" defaultValue={filters.q} placeholder="Search by title, author or topic" className="h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-navy outline-none placeholder:text-stone-500 sm:text-sm" />
              <button className="inline-flex h-11 shrink-0 items-center rounded-full bg-gold px-5 text-sm font-bold text-ink transition-[background-color,transform] duration-150 hover:bg-gold-soft active:scale-[0.97]">Search</button>
            </form>
            <ul className="rise mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-paper/70" style={rise(4)}>
              <li className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold" />Secure order records</li>
              <li className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-gold" />Pickup & Uganda delivery</li>
              <li className="inline-flex items-center gap-2"><BookMarked className="h-4 w-4 text-gold" />Curated by educators</li>
            </ul>
          </div>

          {featured ? (
            <div className="rise" style={rise(3)}>
              {/* Side by side where the card is wide (phones in landscape up to tablets, and large screens); stacked in the narrow lg column. */}
              <div className="glass-dark relative mx-auto grid w-full max-w-xl grid-cols-1 items-center gap-7 rounded-[2rem] p-5 sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)] sm:p-7 lg:grid-cols-1 xl:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
                <div aria-hidden className="absolute -left-6 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-gold/25 blur-3xl" />
                <div className="book-tilt relative mx-auto w-44 sm:w-auto lg:w-44 xl:w-auto">
                  <BookCover title={featured.title} author={featured.authorName} tone={featured.coverTone} size="hero" />
                </div>
                <div className="relative">
                  <p className="text-[11px] font-bold uppercase tracking-[.2em] text-gold">Featured read</p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight">{featured.title}</h2>
                  <p className="mt-2 text-[13px] text-paper/65">{featured.authorName}</p>
                  <p className="mt-4 text-sm leading-relaxed text-paper/75 max-sm:hidden">{featured.shortDescription}</p>
                  <p className="mt-4 font-serif text-xl font-semibold text-gold">{formatUgx(featured.priceUgx)}</p>
                  <BookPurchase book={cardBook(featured)} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <nav aria-label="Book categories" className="border-b border-navy/10 bg-paper">
        <div className="shell hide-scrollbar flex gap-2 overflow-x-auto py-4">
          <Link href="/bookstore" aria-current={!filters.category ? "page" : undefined} className={pill(!filters.category)}>
            All books <span className="opacity-60">{allBooks.length}</span>
          </Link>
          {categories.map((item) => (
            <Link
              key={item.category}
              href={`/bookstore?category=${encodeURIComponent(item.category)}`}
              aria-current={filters.category === item.category ? "page" : undefined}
              className={pill(filters.category === item.category)}
            >
              {item.category} <span className="opacity-60">{item.count}</span>
            </Link>
          ))}
        </div>
      </nav>

      <section className="mesh-light py-12 sm:py-16">
        <div className="shell">
          <div className="grid gap-7 lg:grid-cols-[230px_1fr]">
            <aside>
              <div className="glass sticky top-36 rounded-2xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-gold-dark">Refine collection</p>
                <form className="mt-4 space-y-4">
                  <input type="hidden" name="q" value={filters.q ?? ""} />
                  <input type="hidden" name="category" value={filters.category ?? ""} />
                  <label className="block text-[13px] font-semibold text-navy">
                    Format
                    <select name="format" defaultValue={filters.format ?? ""} className="mt-1.5 h-11 w-full rounded-xl border border-navy/15 bg-paper px-3 text-base font-normal sm:text-sm">
                      <option value="">Every format</option>
                      <option value="paperback">Paperback</option>
                      <option value="hardcover">Hardcover</option>
                      <option value="workbook">Workbook</option>
                    </select>
                  </label>
                  <label className="block text-[13px] font-semibold text-navy">
                    Sort by
                    <select name="sort" defaultValue={filters.sort ?? "featured"} className="mt-1.5 h-11 w-full rounded-xl border border-navy/15 bg-paper px-3 text-base font-normal sm:text-sm">
                      <option value="featured">Featured</option>
                      <option value="newest">Newest</option>
                      <option value="price-asc">Price: low to high</option>
                      <option value="price-desc">Price: high to low</option>
                    </select>
                  </label>
                  <button className="h-11 w-full rounded-full bg-navy px-4 text-sm font-semibold text-paper transition-[background-color,transform] duration-150 hover:bg-navy-700 active:scale-[0.97]">Apply filters</button>
                  {isFiltered ? <Link href="/bookstore" className="flex min-h-11 items-center justify-center text-[13px] text-stone-600 underline underline-offset-4">Clear all filters</Link> : null}
                </form>
              </div>
            </aside>
            <div>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">The collection</p>
                  <h2 className="mt-2 font-serif text-3xl text-navy sm:text-4xl">{isFiltered ? "Books matching your search" : "Find your next meaningful read"}</h2>
                </div>
                <p className="text-[13px] text-stone-600" aria-live="polite">{books.length} title{books.length === 1 ? "" : "s"}</p>
              </div>
              {books.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {books.map((book, index) => (
                    <Reveal key={book.id} delay={Math.min(index * 0.05, 0.3)} className="h-full">
                      <BookCard book={cardBook(book)} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-3xl px-6 py-16 text-center">
                  <Search aria-hidden className="mx-auto h-8 w-8 text-gold-dark" />
                  <h3 className="mt-4 font-serif text-2xl text-navy">No books found</h3>
                  <p className="mt-2 text-sm text-stone-600">Try a broader search or clear the filters.</p>
                  <Link href="/bookstore" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold-dark">View the full collection <ArrowRight className="h-4 w-4" /></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-navy/10 bg-cream py-14 lg:py-16">
        <div className="shell grid gap-5 sm:grid-cols-3">
          {PROMISES.map(([number, title, body], index) => (
            <Reveal key={number} delay={index * 0.06} className="h-full">
              <div className="h-full rounded-2xl border border-navy/10 bg-paper p-6 shadow-card">
                <span className="text-sheen font-serif text-4xl font-semibold">{number}</span>
                <h3 className="mt-4 font-serif text-xl text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
