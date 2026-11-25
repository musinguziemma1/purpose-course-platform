import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { ArticleCard } from "@/db/queries";
import { CoverImage } from "@/components/site/cover-image";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { accentClasses } from "@/components/site/principle-icon";
import { editorialImage } from "@/lib/media";
import { cn, formatDate } from "@/lib/utils";

/*
 * The Purpose Journal's printed pieces (materials in app/(site)/blog/journal.css):
 * the front-page lead, newspaper clippings and the envelope for the Purpose Letter.
 */

function cover(article: ArticleCard) {
  return {
    src: article.coverImageUrl || editorialImage(article.categorySlug),
    alt: article.coverImageUrl ? (article.coverAlt ?? "") : "",
  };
}

function Kicker({ article, lead = false }: { article: ArticleCard; lead?: boolean }) {
  const accent = accentClasses(article.categoryAccent);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#3f3a30]">
      <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", accent.bg)} />
      {lead ? "Lead story · " : ""}
      {article.categoryName ?? "Journal"}
      {article.readingMinutes ? (
        <span className="inline-flex items-center gap-1 font-semibold normal-case tracking-normal text-[#5b5446]">
          · <Clock aria-hidden className="h-3.5 w-3.5" /> {article.readingMinutes} min read
        </span>
      ) : null}
    </span>
  );
}

/** The front-page lead: a printed photograph and the story set in columns. */
export function LeadStory({ article }: { article: ArticleCard }) {
  const image = cover(article);
  return (
    <article className="group grid gap-7 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      <Link href={`/blog/${article.slug}`} className="jr-print relative block aspect-[4/3] w-full" tabIndex={-1} aria-hidden>
        <CoverImage src={image.src} alt={image.alt} sizes="(min-width: 1024px) 55vw, 100vw" eager />
      </Link>
      <div className="min-w-0">
        <Kicker article={article} lead />
        <h2 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.05] tracking-tight text-[#1a1d24] sm:text-[2.6rem]">
          <Link href={`/blog/${article.slug}`} className="jr-headline-link">
            {article.title}
          </Link>
        </h2>
        {article.subtitle ? <p className="mt-3 font-serif text-[1.15rem] italic leading-snug text-[#3f3a30]">{article.subtitle}</p> : null}
        <p className="mt-4 border-y border-[rgba(26,29,36,0.25)] py-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#3f3a30]">
          By {article.authorName ?? "The Purpose Course team"} · {formatDate(article.publishedAt)}
        </p>
        {article.excerpt ? <p className="jr-columns jr-dropcap mt-4 text-[15px] leading-[1.7] text-[#2c2a24] sm:columns-2">{article.excerpt}</p> : null}
        <Link
          href={`/blog/${article.slug}`}
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-[#122a4d] underline decoration-[#a5811a] decoration-2 underline-offset-4"
        >
          Continue reading <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

/** A clipping cut from the paper and taped to the desk. */
export function Clipping({ article }: { article: ArticleCard }) {
  const image = cover(article);
  return (
    <li className="jr-clip-wrap">
      <Link href={`/blog/${article.slug}`} className="jr-clip group">
        <span aria-hidden className="jr-clip-paper" />
        <span aria-hidden className="jr-tape" />
        <span className="jr-print relative mx-4 mt-5 block aspect-[16/9]">
          <CoverImage src={image.src} alt={image.alt} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
        </span>
        <span className="flex flex-1 flex-col px-5 pb-8 pt-4">
          <Kicker article={article} />
          <h3 className="mt-2 font-serif text-[1.35rem] font-semibold leading-snug text-[#1a1d24]">
            <span className="jr-headline-link">{article.title}</span>
          </h3>
          {article.excerpt ? <span className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-[#3f3a30]">{article.excerpt}</span> : null}
          <span className="mt-auto pt-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5b5446]">
            {article.authorName ?? "Purpose Course"} · {formatDate(article.publishedAt, "short")}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** The Purpose Letter: a kraft envelope, a stamp, a postmark and the sign-up letter rising out of it. */
export function PurposeLetter() {
  return (
    <section aria-labelledby="purpose-letter" className="jr-envelope mx-auto max-w-4xl">
      <div className="pointer-events-none absolute right-5 top-4 z-10 hidden items-start gap-3 sm:flex">
        <span className="jr-postmark relative mt-5">
          Thursday
          <br />
          post
        </span>
        <span className="jr-stamp" aria-hidden>
          <span className="jr-stamp-face">
            <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
              <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" />
            </svg>
            <span className="font-serif text-[11px] leading-tight">Purpose Letter</span>
          </span>
        </span>
      </div>
      <div className="jr-letter">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="sm:pr-28 lg:pr-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#7a5d0d]">Subscribe</p>
            <h2 id="purpose-letter" className="mt-2 font-serif text-[2rem] leading-tight text-[#1a1d24]">
              Get the next article in your inbox.
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#3f3a30]">
              The Purpose Letter arrives every Thursday with one new essay and a question to take into your week.
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(26,29,36,0.15)] bg-[#fffdf8] p-5 shadow-[inset_0_1px_3px_rgba(10,26,48,0.08)]">
            <NewsletterForm source="blog" />
          </div>
        </div>
      </div>
    </section>
  );
}
