"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { BookCard, type BookCardBook } from "@/components/bookstore/book-card";
import { useStore } from "@/components/bookstore/store-provider";

export function WishlistGrid({ books }: { books: BookCardBook[] }) {
  const { wishlist, ready } = useStore();
  const saved = books.filter((book) => wishlist.includes(book.id));
  if (!ready) return <div className="grid animate-pulse gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[3/4] rounded-2xl bg-cream" />)}</div>;
  if (!saved.length) return <div className="rounded-3xl border border-dashed border-navy/20 bg-white px-6 py-16 text-center"><Heart className="mx-auto h-9 w-9 text-gold-dark" /><h2 className="mt-4 font-serif text-2xl text-navy">No saved books yet</h2><p className="mt-2 text-sm text-stone-500">Tap the heart on any title to build a reading list.</p><Link href="/bookstore" className="mt-5 inline-flex rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white">Explore the collection</Link></div>;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{saved.map((book) => <BookCard key={book.id} book={book} />)}</div>;
}
