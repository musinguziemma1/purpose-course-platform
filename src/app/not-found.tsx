import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream/60 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-gold">
        <Compass className="h-6 w-6" />
      </span>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">404 · Off the path</p>
      <h1 className="mt-3 max-w-lg font-serif text-4xl leading-tight text-navy">
        This page is not part of the map.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
        The link may have moved, or the article could be scheduled for a later date. Try the journal, the programme or
        the community.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-sm font-medium text-paper hover:bg-navy-700">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
        <Link href="/blog" className="inline-flex h-10 items-center rounded-full border border-navy/20 px-5 text-sm font-medium text-navy hover:bg-white">
          Purpose Journal
        </Link>
        <Link href="/course" className="inline-flex h-10 items-center rounded-full border border-navy/20 px-5 text-sm font-medium text-navy hover:bg-white">
          The programme
        </Link>
      </div>
    </div>
  );
}
