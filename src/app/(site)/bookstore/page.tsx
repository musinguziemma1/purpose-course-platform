import "./bookshop.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { BookCardBook } from "@/components/bookstore/book-card";
import { BookCover } from "@/components/bookstore/book-cover";
import { BookPurchase } from "@/components/bookstore/book-purchase";
import { ShelfBook } from "@/components/bookstore/shelf-book";
import { getStoreCatalogue, getStoreCategories, type StorefrontBook } from "@/db/bookstore";
import { formatUgx } from "@/lib/bookstore-shared";
import { publicUrl } from "@/lib/site-url";

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

/** The shop window: the featured book on a display stand behind glass, with its price tag and a display card. */
function ShopWindow({ book }: { book: StorefrontBook }) {
  return (
    <div className="bs-window p-6 sm:p-8">
      <span aria-hidden className="bs-glint" />
      {/* Side by side only while the window is wide (phones in landscape to tablets); in the
          two-column hero it stacks, so the edition chooser keeps a comfortable width. */}
      <div className="relative z-[1] grid items-end gap-7 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)] lg:grid-cols-1">
        <div className="bs-stand mx-auto w-44 sm:w-full lg:w-48">
          <div className="relative">
            <BookCover title={book.title} author={book.authorName} tone={book.coverTone} imageUrl={book.coverImageUrl} />
            <span className="bs-pricetag">{formatUgx(book.priceUgx)}</span>
          </div>
        </div>
        <div className="bs-display-card p-5">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-[#7a5d0d]">
            <Sparkles aria-hidden className="h-3.5 w-3.5" /> Featured read
          </p>
          <h2 className="mt-1.5 font-serif text-[1.5rem] font-semibold leading-tight">{book.title}</h2>
          <p className="mt-1 text-[13px] text-[#5b5446]">{book.authorName}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-[#3f3a30] max-sm:hidden">{book.shortDescription}</p>
          <BookPurchase book={cardBook(book)} />
        </div>
      </div>
    </div>
  );
}

export default async function BookstorePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; format?: string; sort?: string }> }) {
  const filters = await searchParams;
  const [books, allBooks, categories] = await Promise.all([getStoreCatalogue(filters), getStoreCatalogue(), getStoreCategories()]);
  const featured = allBooks.find((book) => book.isFeatured && book.variants.length) ?? allBooks[0];
  const isFiltered = Boolean(filters.q || filters.category || filters.format || filters.sort);

  return (
    <div className="bs-street pb-20">
      {/* The shop front: an awning, a gold-leaf fascia, the pitch and the window. */}
      <section aria-labelledby="bookstore-heading" className="shell">
        <div className="bs-front overflow-hidden">
          <div aria-hidden className="bs-awning" />
          <div className="px-5 pb-10 pt-12 sm:px-10 lg:pb-12">
            <div className="flex justify-center">
              <div className="bs-fascia">
                <span className="text-[12px] font-semibold uppercase tracking-[0.3em] text-[#e6c867]">Books · Workbooks · Journals</span>
                <span className="bs-goldleaf mt-1 font-serif text-[2rem] font-semibold leading-none tracking-tight sm:text-[2.9rem]">Purpose Bookstore</span>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#e6c867]">
                  <Sparkles aria-hidden className="h-3.5 w-3.5" /> Read with intention
                </p>
                <h1 id="bookstore-heading" className="mt-4 max-w-3xl font-serif text-[2.3rem] font-medium leading-[1.06] tracking-tight sm:text-[3.3rem]">
                  Books that help you understand <span className="bs-goldleaf">who you are</span> and what to do next.
                </h1>
                <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-paper/80">
                  Explore thoughtful books, practical workbooks and guided journals from the Purpose Course faculty. Built for discovery, disciplined growth and lasting contribution.
                </p>
                <form role="search" className="bs-search mt-8 max-w-xl">
                  <label htmlFor="store-search" className="sr-only">
                    Search books
                  </label>
                  <Search aria-hidden className="ml-3 h-4 w-4 shrink-0 text-stone-500" />
                  <input
                    id="store-search"
                    name="q"
                    type="search"
                    defaultValue={filters.q}
                    placeholder="Search by title, author or topic"
                    className="h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-navy outline-none placeholder:text-stone-500 sm:text-sm"
                  />
                  <button className="bs-btn bs-btn-brass shrink-0">Search</button>
                </form>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-paper/75">
                  <li className="inline-flex items-center gap-2">
                    <ShieldCheck aria-hidden className="h-4 w-4 text-[#e6c867]" />
                    Secure order records
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <Truck aria-hidden className="h-4 w-4 text-[#e6c867]" />
                    Pickup & Uganda delivery
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <BookMarked aria-hidden className="h-4 w-4 text-[#e6c867]" />
                    Curated by educators
                  </li>
                </ul>
              </div>
              {featured ? <ShopWindow book={featured} /> : null}
            </div>
          </div>
        </div>
      </section>

      {/* Categories as cards in brass label holders along a wooden rail. */}
      <nav aria-label="Book categories" className="bs-labels mt-12">
        <div className="shell hide-scrollbar flex gap-2.5 overflow-x-auto py-4">
          <Link href="/bookstore" aria-current={!filters.category ? "page" : undefined} className="bs-label">
            All books <span className="bs-label-count">{allBooks.length}</span>
          </Link>
          {categories.map((item) => (
            <Link
              key={item.category}
              href={`/bookstore?category=${encodeURIComponent(item.category)}`}
              aria-current={filters.category === item.category ? "page" : undefined}
              className="bs-label"
            >
              {item.category} <span className="bs-label-count">{item.count}</span>
            </Link>
          ))}
        </div>
      </nav>

      <section aria-labelledby="collection-heading" className="py-12 sm:py-16">
        <div className="shell grid gap-8 lg:grid-cols-[250px_1fr]">
          {/* Filters live in a card-catalogue drawer. */}
          <aside>
            <div className="bs-drawer sticky top-36 p-4">
              <div className="flex justify-center">
                <span className="bs-holder">
                  <span>Refine collection</span>
                </span>
              </div>
              <form className="bs-index-card mt-4 space-y-4 px-4 pb-4">
                <p className="flex h-[2.35rem] items-end pb-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-stone-600">Format &amp; order</p>
                <input type="hidden" name="q" value={filters.q ?? ""} />
                <input type="hidden" name="category" value={filters.category ?? ""} />
                <label className="block text-[13px] font-semibold text-navy">
                  Format
                  <select name="format" defaultValue={filters.format ?? ""} className="mt-1.5 h-11 w-full rounded-lg border border-navy/20 bg-paper px-3 text-base font-normal sm:text-sm">
                    <option value="">Every format</option>
                    <option value="paperback">Paperback</option>
                    <option value="hardcover">Hardcover</option>
                    <option value="workbook">Workbook</option>
                  </select>
                </label>
                <label className="block text-[13px] font-semibold text-navy">
                  Sort by
                  <select name="sort" defaultValue={filters.sort ?? "featured"} className="mt-1.5 h-11 w-full rounded-lg border border-navy/20 bg-paper px-3 text-base font-normal sm:text-sm">
                    <option value="featured">Featured</option>
                    <option value="newest">Newest</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                  </select>
                </label>
                <button className="bs-btn w-full">Apply filters</button>
                {isFiltered ? (
                  <Link href="/bookstore" className="flex min-h-11 items-center justify-center text-[13px] text-stone-600 underline underline-offset-4">
                    Clear all filters
                  </Link>
                ) : null}
              </form>
              <span aria-hidden className="bs-pull mt-4" />
            </div>
          </aside>

          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#7a5d0d]">The collection</p>
                <h2 id="collection-heading" className="mt-2 font-serif text-3xl text-navy sm:text-4xl">
                  {isFiltered ? "Books matching your search" : "Find your next meaningful read"}
                </h2>
              </div>
              <p className="text-[14px] text-stone-600" aria-live="polite">
                {books.length} title{books.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="bs-bookcase">
              {books.length ? (
                <div className="bs-shelf-grid sm:grid-cols-2 xl:grid-cols-3">
                  {books.map((book) => (
                    <ShelfBook key={book.id} book={cardBook(book)} />
                  ))}
                </div>
              ) : (
                <div className="bs-talker mx-auto my-6 max-w-md px-6 py-12 text-center">
                  <Search aria-hidden className="mx-auto h-8 w-8 text-[#a5811a]" />
                  <h3 className="mt-4 font-serif text-2xl">No books found</h3>
                  <p className="mt-2 text-[14px] text-[#5b5446]">Try a broader search or clear the filters.</p>
                  <Link href="/bookstore" className="mt-5 inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-navy underline decoration-[#a5811a] decoration-2 underline-offset-4">
                    View the full collection <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The bookseller's promises, pinned to the cork board by the till. */}
      <section aria-labelledby="promises-heading" className="shell">
        <div className="bs-cork px-6 pb-10 pt-8 sm:px-12">
          <h2 id="promises-heading" className="text-center font-serif text-[1.6rem] text-[#2a1a0c] [text-shadow:0_1px_0_rgba(255,230,190,0.6)]">
            From the bookseller
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            {PROMISES.map(([number, title, body], index) => (
              <li key={number} className={index === 1 ? "sm:rotate-[1deg]" : index === 2 ? "sm:-rotate-[0.6deg]" : "sm:-rotate-[1.2deg]"}>
                <div className="bs-pinned h-full p-6 pt-8">
                  <span className="bs-goldleaf font-serif text-4xl font-semibold">{number}</span>
                  <h3 className="mt-3 font-serif text-xl text-navy">{title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-stone-600">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
