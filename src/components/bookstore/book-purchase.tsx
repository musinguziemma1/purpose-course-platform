"use client";

import { useRouter } from "next/navigation";
import { Download, Heart, ShieldCheck, ShoppingCart, Zap } from "lucide-react";
import { useState } from "react";
import { useStore, type CartBook } from "@/components/bookstore/store-provider";
import type { CardVariant } from "@/components/bookstore/book-card";
import { formatUgx } from "@/lib/bookstore-shared";
import { cn } from "@/lib/utils";

type PurchaseBook = Omit<CartBook, "variantId" | "bookId" | "variantLabel" | "deliveryKind" | "priceUgx" | "inventoryCount"> & { id: number; variants: CardVariant[] };

export function BookPurchase({ book, compact = true }: { book: PurchaseBook; compact?: boolean }) {
  const router = useRouter();
  const available = book.variants.filter((item) => item.deliveryKind === "digital" || item.inventoryCount > 0);
  const initial = available.find((item) => item.isDefault) ?? available[0] ?? book.variants[0];
  const [variantId, setVariantId] = useState(initial?.id ?? 0);
  const [quantity, setQuantity] = useState(1);
  const { addBook, toggleWishlist, isWishlisted } = useStore();
  const saved = isWishlisted(book.id);
  const variant = book.variants.find((item) => item.id === variantId) ?? initial;

  if (!variant) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This title has no available formats yet.</p>;

  const physical = variant.deliveryKind === "physical";
  const inStock = !physical || variant.inventoryCount > 0;
  const discount = variant.compareAtPriceUgx && variant.compareAtPriceUgx > variant.priceUgx ? Math.round((1 - variant.priceUgx / variant.compareAtPriceUgx) * 100) : 0;
  const cartBook: CartBook = { variantId: variant.id, bookId: book.id, slug: book.slug, title: book.title, authorName: book.authorName, variantLabel: variant.label, deliveryKind: variant.deliveryKind, priceUgx: variant.priceUgx, inventoryCount: variant.inventoryCount, coverTone: book.coverTone, coverImageUrl: book.coverImageUrl };
  const buyNow = () => { addBook(cartBook, quantity, false); router.push("/bookstore/checkout"); };

  return <div className={compact ? "mt-5" : "mt-6"}>
    <div className={cn("flex flex-wrap items-baseline gap-3", compact && "hidden")}>
      <strong className={cn("font-serif font-semibold text-navy", compact ? "text-2xl" : "text-4xl")}>{formatUgx(variant.priceUgx)}</strong>
      {variant.compareAtPriceUgx ? <span className="text-sm text-stone-400 line-through">{formatUgx(variant.compareAtPriceUgx)}</span> : null}
      {discount ? <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-ink">Save {discount}%</span> : null}
    </div>
    <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-stone-500">Choose your edition</p>
    <div role="radiogroup" aria-label="Choose book edition" className={cn("mt-2 grid gap-2", compact ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
      {book.variants.map((item) => {
        const disabled = item.deliveryKind === "physical" && item.inventoryCount < 1;
        return <button key={item.id} type="button" role="radio" aria-checked={variant.id === item.id} disabled={disabled} onClick={() => { setVariantId(item.id); setQuantity(1); }} className={cn("relative rounded-xl border bg-white p-3 text-left transition", variant.id === item.id ? "border-gold ring-2 ring-gold/25" : "border-navy/15 hover:border-navy/35", disabled && "cursor-not-allowed opacity-45")}>
          <span className={cn("absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border-2", variant.id === item.id ? "border-gold bg-gold" : "border-stone-300")}>{variant.id === item.id ? <span className="h-1.5 w-1.5 rounded-full bg-navy" /> : null}</span>
          <span className="block pr-6 text-xs font-bold text-navy">{item.label}</span>
          <span className="mt-1 block text-sm font-semibold text-navy">{formatUgx(item.priceUgx)}</span>
          <span className="mt-0.5 block text-[10px] text-stone-500">{item.deliveryKind === "digital" ? "Protected account download" : item.inventoryCount ? `${item.inventoryCount} available` : "Out of stock"}</span>
        </button>;
      })}
    </div>
    {variant.deliveryKind === "digital" ? <p className="mt-3 flex items-start gap-2 rounded-xl bg-source/10 px-3 py-2.5 text-xs leading-5 text-source"><Download className="mt-0.5 h-4 w-4 shrink-0" />PDF softcopy unlocks in My PDFs after payment confirmation. Sign-in is required.</p> : <div className="mt-4 flex items-center gap-3"><label htmlFor={`book-quantity-${book.id}`} className="text-xs font-semibold uppercase tracking-[.12em] text-stone-500">Quantity</label><select id={`book-quantity-${book.id}`} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy">{Array.from({ length: Math.min(variant.inventoryCount, 10) }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select><span className={cn("text-xs", variant.inventoryCount <= 5 ? "font-semibold text-amber-700" : "text-stone-500")}>{variant.inventoryCount > 5 ? "In stock" : `Only ${variant.inventoryCount} left`}</span></div>}
    <div className={cn("mt-5 grid gap-3", compact ? "" : "sm:grid-cols-2")}>
      <button type="button" disabled={!inStock} onClick={() => addBook(cartBook, quantity)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-navy/25 bg-white px-5 text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:bg-stone-200"><ShoppingCart className="h-4 w-4" />Add to bag</button>
      {!compact ? <button type="button" disabled={!inStock} onClick={buyNow} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-ink shadow-[0_12px_24px_-12px_rgba(196,148,36,.8)] transition hover:bg-gold-dark hover:text-white disabled:bg-stone-300"><Zap className="h-4 w-4" />Buy now · {formatUgx(variant.priceUgx * quantity)}</button> : null}
    </div>
    {!compact ? <><div className="mt-5 grid grid-cols-3 gap-2 border-t border-navy/10 pt-5 text-center"><span className="flex flex-col items-center gap-1.5 text-[10px] font-medium text-stone-500"><ShieldCheck className="h-5 w-5 text-source" />Secure order</span><span className="flex flex-col items-center gap-1.5 text-[10px] font-medium text-stone-500"><Download className="h-5 w-5 text-source" />Protected PDF</span><button type="button" onClick={() => toggleWishlist(book.id)} aria-pressed={saved} className="flex flex-col items-center gap-1.5 text-[10px] font-medium text-stone-500"><Heart className={cn("h-5 w-5 text-source", saved && "fill-red-500 text-red-500")} />{saved ? "Saved" : "Save title"}</button></div><div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-4 border-t border-navy/10 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_-22px_rgba(7,25,45,.7)] backdrop-blur-lg lg:hidden"><div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-[.1em] text-stone-500">{variant.label}</p><p className="font-serif text-lg font-semibold text-navy">{formatUgx(variant.priceUgx * quantity)}</p></div><button type="button" disabled={!inStock} onClick={buyNow} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-ink disabled:bg-stone-300"><Zap className="h-4 w-4" />Buy now</button></div></> : null}
  </div>;
}
