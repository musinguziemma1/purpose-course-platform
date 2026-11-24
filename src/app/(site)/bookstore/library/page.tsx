import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Library, LockKeyhole } from "lucide-react";
import { getStoreDigitalLibrary } from "@/db/bookstore";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My PDFs | Bookstore", robots: { index: false, follow: false } };
export default async function DigitalLibraryPage() {
  const user = await getSessionUser(); if (!user || user.isDemo) redirect("/login?next=/bookstore/library");
  const books = await getStoreDigitalLibrary(user);
  return <section className="min-h-[65vh] bg-paper py-12 sm:py-16"><div className="shell"><p className="eyebrow">Private digital library</p><h1 className="mt-3 font-serif text-4xl text-navy">My downloadable books</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">PDF softcopies appear here after payment is marked paid and the order is completed. Downloads use short-lived protected access.</p>{books?.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <article key={book.orderItemId} className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm"><Library className="h-7 w-7 text-gold-dark" /><h2 className="mt-4 font-serif text-xl font-semibold text-navy">{book.title}</h2><p className="mt-1 text-xs text-stone-500">{book.authorName} · {book.variantLabel}</p><p className="mt-4 text-[11px] text-stone-400">Order {book.orderNumber} · {new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(book.purchasedAt)}</p><a href={`/api/media/${book.mediaId}?download=1`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-xs font-bold text-white"><Download className="h-4 w-4" />Download PDF</a></article>)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-navy/20 bg-white px-6 py-16 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-gold-dark" /><h2 className="mt-4 font-serif text-2xl text-navy">No unlocked PDFs yet</h2><p className="mt-2 text-sm text-stone-500">Completed digital orders will appear here.</p><Link href="/bookstore" className="mt-5 inline-flex rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white">Browse books</Link></div>}</div></section>;
}
