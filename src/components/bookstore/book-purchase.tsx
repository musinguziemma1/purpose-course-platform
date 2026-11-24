"use client";

import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useStore, type CartBook } from "@/components/bookstore/store-provider";
import { cn } from "@/lib/utils";

export function BookPurchase({ book }: { book: CartBook }) {
  const [quantity, setQuantity] = useState(1);
  const { addBook, toggleWishlist, isWishlisted } = useStore();
  const saved = isWishlisted(book.id);
  return <div className="mt-6"><div className="flex items-center gap-3"><label htmlFor="book-quantity" className="text-xs font-semibold uppercase tracking-[.12em] text-stone-500">Quantity</label><select id="book-quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy">{Array.from({ length: Math.min(book.inventoryCount, 10) }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select><span className={cn("text-xs", book.inventoryCount <= 5 ? "font-semibold text-amber-700" : "text-stone-500")}>{book.inventoryCount > 5 ? "In stock" : `Only ${book.inventoryCount} left`}</span></div><div className="mt-4 flex flex-col gap-3 sm:flex-row"><button type="button" disabled={!book.inventoryCount} onClick={() => addBook(book, quantity)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-ink shadow-sm hover:bg-gold-dark disabled:bg-stone-300"><ShoppingBag className="h-4 w-4" />Add to shopping bag</button><button type="button" onClick={() => toggleWishlist(book.id)} aria-pressed={saved} className="inline-flex items-center justify-center gap-2 rounded-full border border-navy/20 px-5 py-3.5 text-sm font-semibold text-navy hover:bg-cream"><Heart className={cn("h-4 w-4", saved && "fill-red-500 text-red-500")} />{saved ? "Saved" : "Save for later"}</button></div></div>;
}
