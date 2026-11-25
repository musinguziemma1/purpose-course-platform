"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { BookCover } from "@/components/bookstore/book-cover";
import type { BookCardBook, CardVariant } from "@/components/bookstore/book-card";
import { useStore, type CartBook } from "@/components/bookstore/store-provider";
import { formatUgx } from "@/lib/bookstore-shared";
import { cn } from "@/lib/utils";

function cartBook(book: BookCardBook, variant: CardVariant): CartBook {
  return {
    variantId: variant.id,
    bookId: book.id,
    slug: book.slug,
    title: book.title,
    authorName: book.authorName,
    variantLabel: variant.label,
    deliveryKind: variant.deliveryKind,
    priceUgx: variant.priceUgx,
    inventoryCount: variant.inventoryCount,
    coverTone: book.coverTone,
    coverImageUrl: book.coverImageUrl,
  };
}

/**
 * One book standing on the bookcase (app/(site)/bookstore/bookshop.css): the
 * cover on its shelf, a plank that joins its neighbours, and a shelf-talker card
 * with the price and the add-to-bag button. Same data and store actions as
 * BookCard, which the wishlist and the book page keep using.
 */
export function ShelfBook({ book }: { book: BookCardBook }) {
  const { addBook, toggleWishlist, isWishlisted } = useStore();
  const saved = isWishlisted(book.id);
  const available = book.variants.filter((variant) => variant.deliveryKind === "digital" || variant.inventoryCount > 0);
  const chosen = available.find((variant) => variant.isDefault) ?? available[0] ?? book.variants[0];
  const minimum = Math.min(...book.variants.map((variant) => variant.priceUgx));
  const maximumCompare = Math.max(0, ...book.variants.map((variant) => variant.compareAtPriceUgx ?? 0));
  const discount = maximumCompare > minimum ? Math.round((1 - minimum / maximumCompare) * 100) : 0;

  return (
    <article className="bs-slot flex flex-col">
      <div className="bs-niche">
        {discount ? <span className="bs-flag bs-flag-sale">Save {discount}%</span> : book.isNew ? <span className="bs-flag">New</span> : null}
        <button
          type="button"
          onClick={() => toggleWishlist(book.id)}
          aria-label={saved ? `Remove ${book.title} from saved books` : `Save ${book.title}`}
          aria-pressed={saved}
          className="bs-heart"
        >
          <Heart aria-hidden className={cn("h-4 w-4", saved && "fill-[#b42318] text-[#b42318]")} />
        </button>
        <Link href={`/bookstore/${book.slug}`} aria-label={`View ${book.title}`} className="bs-book">
          <span className="bs-book-body">
            <BookCover title={book.title} author={book.authorName} tone={book.coverTone} imageUrl={book.coverImageUrl} />
          </span>
        </Link>
      </div>
      <div aria-hidden className="bs-plank" />
      <div className="bs-talker flex flex-1 flex-col p-4 pt-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7a5d0d]">{book.category}</p>
        <h3 className="mt-1 font-serif text-[1.2rem] font-semibold leading-snug">
          <Link href={`/bookstore/${book.slug}`} className="line-clamp-2 hover:text-[#7a5d0d]">
            {book.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-[13px] text-[#5b5446]">by {book.authorName}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#5b5446]">
          <Star aria-hidden className={cn("h-4 w-4", book.reviewCount ? "fill-[#c9a227] text-[#a5811a]" : "text-stone-300")} />
          {book.reviewCount ? (
            <>
              <span className="font-semibold text-[#1a1d24]">{(book.ratingTenths / 10).toFixed(1)}</span>
              <span>
                ({book.reviewCount} review{book.reviewCount === 1 ? "" : "s"})
              </span>
            </>
          ) : (
            <span>Not yet reviewed</span>
          )}
        </p>
        <ul aria-label="Formats" className="mt-3 flex flex-wrap gap-1.5">
          {book.variants.map((variant) => (
            <li key={variant.id} className="bs-format">
              {variant.label}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-4">
        <div className="flex items-end justify-between gap-3 border-t border-dashed border-[rgba(26,29,36,0.18)] pt-3">
          <div>
            <p className="text-[12px] text-[#5b5446]">From</p>
            <p className="font-serif text-[1.2rem] font-semibold">{formatUgx(minimum)}</p>
          </div>
          {chosen ? (
            <button type="button" onClick={() => addBook(cartBook(book, chosen))} className="bs-btn">
              <ShoppingBag aria-hidden className="h-4 w-4" /> Add<span className="sr-only"> {book.title} to bag</span>
            </button>
          ) : (
            <Link href={`/bookstore/${book.slug}`} className="bs-btn">
              View formats
            </Link>
          )}
        </div>
        </div>
      </div>
    </article>
  );
}
