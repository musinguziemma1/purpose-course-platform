import type { Metadata } from "next";
import { WishlistGrid } from "@/components/bookstore/wishlist-grid";
import { getActiveStoreBooks } from "@/db/bookstore";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved books | Bookstore", robots: { index: false, follow: true } };
export default async function WishlistPage() { const books = await getActiveStoreBooks(); const cards = books.map((book) => ({ id: book.id, slug: book.slug, title: book.title, authorName: book.authorName, format: book.format, priceUgx: book.priceUgx, inventoryCount: book.inventoryCount, coverTone: book.coverTone, subtitle: book.subtitle, category: book.category, shortDescription: book.shortDescription, compareAtPriceUgx: book.compareAtPriceUgx, ratingTenths: book.ratingTenths, reviewCount: book.reviewCount, isNew: book.isNew })); return <section className="min-h-[60vh] bg-paper py-12 sm:py-16"><div className="shell"><p className="eyebrow">Your reading list</p><h1 className="mt-3 font-serif text-4xl text-navy">Saved books</h1><p className="mb-8 mt-3 max-w-2xl text-sm text-stone-600">A private list saved on this device. Add any title to your bag when you are ready.</p><WishlistGrid books={cards} /></div></section>; }
