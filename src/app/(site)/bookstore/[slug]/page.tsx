import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCheck, BookOpen, Check, ChevronRight, Download, FileText, Globe2, Hash, Layers3, PackageCheck, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import { BookCard, type BookCardBook } from "@/components/bookstore/book-card";
import { BookCover } from "@/components/bookstore/book-cover";
import { BookPurchase } from "@/components/bookstore/book-purchase";
import { BookShare } from "@/components/bookstore/book-share";
import { ReviewSection } from "@/components/bookstore/review-section";
import { getApprovedStoreReviews, getRelatedStoreBooks, getStoreBook, type StorefrontBook } from "@/db/bookstore";
import { getSessionUser } from "@/lib/auth";
import { publicUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const cardBook = (book: StorefrontBook): BookCardBook => ({
  id: book.id,
  slug: book.slug,
  title: book.title,
  authorName: book.authorName,
  coverTone: book.coverTone,
  coverImageUrl: book.coverImageUrl,
  subtitle: book.subtitle,
  category: book.category,
  shortDescription: book.shortDescription,
  ratingTenths: book.ratingTenths,
  reviewCount: book.reviewCount,
  isNew: book.isNew,
  variants: book.variants.map(({ id, code, label, deliveryKind, priceUgx, compareAtPriceUgx, inventoryCount, isDefault }) => ({ id, code, label, deliveryKind: deliveryKind as "physical" | "digital", priceUgx, compareAtPriceUgx, inventoryCount, isDefault })),
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const book = await getStoreBook((await params).slug);
  return book ? { title: `${book.title} | Bookstore`, description: book.shortDescription, alternates: { canonical: publicUrl(`/bookstore/${book.slug}`) } } : { title: "Book not found" };
}

export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const book = await getStoreBook((await params).slug);
  if (!book) notFound();
  const [related, reviews, user] = await Promise.all([getRelatedStoreBooks(book), getApprovedStoreReviews(book.id), getSessionUser()]);
  const card = cardBook(book);
  const hasDigital = book.variants.some((variant) => variant.deliveryKind === "digital");

  return <div className="min-h-screen bg-[#f6f7f9] pb-20 lg:pb-0">
    <div className="border-b border-navy/10 bg-white">
      <nav aria-label="Breadcrumb" className="shell flex items-center gap-1.5 overflow-hidden py-4 text-xs text-stone-500">
        <Link href="/" className="hover:text-navy">Home</Link><ChevronRight className="h-3.5 w-3.5" />
        <Link href="/bookstore" className="hover:text-navy">Bookstore</Link><ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-semibold text-navy">{book.title}</span>
      </nav>
    </div>

    <section className="shell py-10 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-12">
        <div className="lg:sticky lg:top-36 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a31] via-[#12345b] to-[#315f86] p-8 shadow-[0_25px_60px_-30px_rgba(7,25,45,.75)] sm:p-12 lg:aspect-[4/5]">
            <div className="absolute inset-0 ink-grid opacity-20" aria-hidden />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/15" aria-hidden />
            <BookCover title={book.title} author={book.authorName} tone={book.coverTone} imageUrl={book.coverImageUrl} size="hero" className="relative mx-auto h-full max-h-[620px] w-auto max-w-full" />
            {book.isNew ? <span className="absolute left-5 top-5 rounded-full bg-gold px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-ink">New release</span> : null}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[{ icon: ShieldCheck, label: "Secure order" }, { icon: PackageCheck, label: "Managed fulfilment" }, { icon: BookCheck, label: "Curated learning" }].map(({ icon: Icon, label }) => <div key={label} className="flex items-center justify-center gap-1.5 rounded-xl border border-navy/10 bg-white px-2 py-3 text-center text-[10px] font-semibold text-stone-500"><Icon className="h-4 w-4 shrink-0 text-gold-dark" />{label}</div>)}
          </div>
        </div>

        <article className="rounded-3xl border border-gold/25 bg-gradient-to-br from-white via-white to-[#fffaf0] p-6 shadow-[0_20px_55px_-32px_rgba(7,25,45,.45)] sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white"><BookOpen className="h-3.5 w-3.5 text-gold" />Purpose book</span><span className="rounded-full border border-navy/10 bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">{book.category}</span></div>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-navy sm:text-5xl">{book.title}</h1>
          {book.subtitle ? <p className="mt-3 font-serif text-xl leading-snug text-stone-500">{book.subtitle}</p> : null}
          <p className="mt-4 text-sm text-stone-500">by <strong className="font-semibold text-navy">{book.authorName}</strong></p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-500">
            <a href="#customer-reviews" className="inline-flex items-center gap-1.5 hover:text-navy"><span className="flex">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-4 w-4 ${book.reviewCount && value <= Math.round(book.ratingTenths / 10) ? "fill-gold text-gold" : "text-stone-300"}`} />)}</span>{book.reviewCount ? <><strong className="text-navy">{(book.ratingTenths / 10).toFixed(1)}</strong><span>({book.reviewCount} reviews)</span></> : <span>No reviews yet</span>}</a>
          </div>
          <p className="mt-6 text-[15px] leading-7 text-stone-600">{book.shortDescription}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[{ icon: Layers3, label: "Editions", value: String(book.variants.length) }, { icon: FileText, label: "Pages", value: String(book.pageCount) }, { icon: Globe2, label: "Language", value: book.language }, { icon: BookOpen, label: "Publisher", value: "Purpose Course" }].map(({ icon: Icon, label, value }) => <div key={label} className="rounded-xl border border-navy/10 bg-paper px-3 py-3"><p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-stone-400"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1 truncate text-sm font-semibold text-navy">{value}</p></div>)}
          </div>
          <BookPurchase book={card} compact={false} />
        </article>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-navy/10 bg-navy/10 shadow-sm sm:grid-cols-4">
        {[{ icon: Sparkles, label: "Purpose-led", value: "Practical insight" }, { icon: Layers3, label: "Your choice", value: `${book.variants.length} editions` }, { icon: hasDigital ? Download : Truck, label: hasDigital ? "Digital access" : "Fulfilment", value: hasDigital ? "Protected library" : "Across Uganda" }, { icon: ShieldCheck, label: "Support", value: "Human assistance" }].map(({ icon: Icon, label, value }) => <div key={label} className="bg-white p-5"><Icon className="h-5 w-5 text-gold-dark" /><p className="mt-3 text-[9px] font-bold uppercase tracking-[.18em] text-stone-400">{label}</p><p className="mt-1 font-serif text-base font-semibold text-navy">{value}</p></div>)}
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-12">
        <div className="space-y-8">
          <article className="rounded-3xl border border-navy/10 bg-white p-6 shadow-sm sm:p-9">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy/8 text-navy"><BookOpen className="h-4 w-4" /></span><p className="text-[10px] font-bold uppercase tracking-[.2em] text-navy">About this book</p></div>
            <h2 className="mt-5 font-serif text-3xl font-semibold text-navy">A meaningful read designed for application</h2>
            <p className="mt-5 whitespace-pre-line text-[15px] leading-8 text-stone-600">{book.description}</p>
          </article>
          <ReviewSection bookId={book.id} bookSlug={book.slug} reviewId={randomUUID()} ratingTenths={book.ratingTenths} reviewCount={book.reviewCount} reviews={reviews} customer={user ? { name: user.fullName, email: user.email } : undefined} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-36">
          <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.17em] text-navy"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy/8"><Check className="h-4 w-4" /></span>What&apos;s included</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-stone-600">{["A professionally structured Purpose Course title", "Practical teaching, reflection and application", `${book.pageCount} pages of focused learning`, hasDigital ? "Optional protected PDF access after payment" : "Quality print editions with managed fulfilment", "Access to human order support"].map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-gold-dark" /><span>{item}</span></li>)}</ul></section>
          <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.17em] text-navy"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/20"><Hash className="h-4 w-4" /></span>Specifications</h2><dl className="mt-5 space-y-3 text-xs">{[["Product family", "Book"], ["Category", book.category], ["Author", book.authorName], ["Formats", book.variants.map((variant) => variant.label).join(", ")], ["Pages", String(book.pageCount)], ["Language", book.language], ["SKU", book.sku], ...(book.isbn13 ? [["ISBN-13", book.isbn13]] : [])].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-navy/8 pb-2.5 last:border-0"><dt className="text-stone-500">{label}</dt><dd className="max-w-[60%] text-right font-semibold text-navy">{value}</dd></div>)}</dl></section>
          <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm"><h2 className="text-xs font-bold uppercase tracking-[.17em] text-navy">Share this title</h2><div className="mt-4"><BookShare /></div></section>
          {related.length ? <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm"><h2 className="text-xs font-bold uppercase tracking-[.17em] text-navy">Related in {book.category}</h2><ul className="mt-5 space-y-4">{related.slice(0, 3).map((item) => <li key={item.id}><Link href={`/bookstore/${item.slug}`} className="group flex items-center gap-3"><BookCover title={item.title} author={item.authorName} tone={item.coverTone} imageUrl={item.coverImageUrl} size="mini" className="h-16 w-12 shrink-0" /><div className="min-w-0"><p className="line-clamp-2 text-sm font-semibold leading-snug text-navy group-hover:text-gold-dark">{item.title}</p><p className="mt-1 text-[10px] text-stone-500">{item.variants.map((variant) => variant.label).join(" · ")}</p></div></Link></li>)}</ul></section> : null}
        </aside>
      </div>

      {related.length ? <section className="mt-16 border-t border-navy/10 pt-14 lg:mt-20"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold-dark">Recommended for you</p><h2 className="mt-2 font-serif text-3xl font-semibold text-navy">More {book.category} picks</h2><p className="mt-2 text-sm text-stone-500">Hand-picked books that continue the same learning journey.</p></div><Link href={`/bookstore?category=${encodeURIComponent(book.category)}`} className="hidden items-center gap-1.5 text-sm font-semibold text-navy hover:text-gold-dark sm:inline-flex">View all <ChevronRight className="h-4 w-4" /></Link></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((item) => <BookCard key={item.id} book={cardBook(item)} compact />)}</div></section> : null}
    </section>
  </div>;
}
