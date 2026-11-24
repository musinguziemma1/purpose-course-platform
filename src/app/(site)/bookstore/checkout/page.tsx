import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CheckoutForm } from "@/components/bookstore/checkout-form";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Checkout | Bookstore", robots: { index: false, follow: false } };
export default async function StoreCheckoutPage() { const user = await getSessionUser(); return <section className="min-h-[70vh] bg-cream/60 py-10 sm:py-14"><div className="shell"><Link href="/bookstore" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-navy"><ChevronLeft className="h-4 w-4" />Continue shopping</Link><div className="mb-7 mt-5"><p className="eyebrow">Simple, accountable fulfilment</p><h1 className="mt-2 font-serif text-3xl text-navy sm:text-4xl">Checkout</h1></div><CheckoutForm orderId={randomUUID()} signedIn={Boolean(user && !user.isDemo)} customer={user ? { fullName: user.fullName, email: user.email, phone: user.phone } : null} /></div></section>; }
