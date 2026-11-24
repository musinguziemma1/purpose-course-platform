"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { BookCover } from "@/components/bookstore/book-cover";
import { useStore, type CartBook } from "@/components/bookstore/store-provider";
import { formatUgx } from "@/lib/bookstore-shared";
import { cn } from "@/lib/utils";

export type BookCardBook = CartBook & { subtitle: string | null; category: string; shortDescription: string; compareAtPriceUgx: number | null; ratingTenths: number; reviewCount: number; isNew: boolean };

export function BookCard({ book, compact = false }: { book: BookCardBook; compact?: boolean }) {
  const { addBook, toggleWishlist, isWishlisted } = useStore();
  const saved = isWishlisted(book.id);
  return (
    <article className={cn("group flex h-full flex-col rounded-2xl border border-navy/10 bg-white p-3 shadow-[0_16px_50px_-38px_rgba(7,25,45,.5)] transition hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_22px_50px_-30px_rgba(7,25,45,.55)]", compact ? "sm:p-3" : "sm:p-4")}>
      <div className="relative overflow-hidden rounded-xl bg-cream p-5 sm:p-6"><Link href={`/bookstore/${book.slug}`} aria-label={`View ${book.title}`}><BookCover title={book.title} author={book.authorName} tone={book.coverTone} /></Link><button type="button" onClick={() => toggleWishlist(book.id)} aria-label={saved ? `Remove ${book.title} from saved books` : `Save ${book.title}`} aria-pressed={saved} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-navy shadow-sm transition hover:scale-105"><Heart className={cn("h-4 w-4", saved && "fill-red-500 text-red-500")} /></button>{book.isNew ? <span className="absolute left-3 top-3 rounded-full bg-source px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-white">New</span> : null}</div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-gold-dark">{book.category}</p><Link href={`/bookstore/${book.slug}`} className="mt-1 font-serif text-xl font-semibold leading-tight text-navy hover:text-gold-dark">{book.title}</Link><p className="mt-1 text-xs text-stone-500">by {book.authorName}</p>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500"><Star className="h-3.5 w-3.5 fill-gold text-gold" /><span className="font-semibold text-navy">{(book.ratingTenths / 10).toFixed(1)}</span><span>({book.reviewCount})</span><span>·</span><span className="capitalize">{book.format}</span></div>
        {!compact ? <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-600">{book.shortDescription}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4"><div><p className="font-serif text-lg font-semibold text-navy">{formatUgx(book.priceUgx)}</p>{book.compareAtPriceUgx ? <p className="text-[11px] text-stone-400 line-through">{formatUgx(book.compareAtPriceUgx)}</p> : null}</div><button type="button" onClick={() => addBook(book)} disabled={book.inventoryCount < 1} className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-4 text-xs font-bold text-white transition hover:bg-source disabled:cursor-not-allowed disabled:bg-stone-300"><ShoppingBag className="h-4 w-4" />{book.inventoryCount ? "Add" : "Sold out"}</button></div>
      </div>
    </article>
  );
}
