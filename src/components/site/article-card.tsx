import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import type { ArticleCard as ArticleCardType } from "@/db/queries";
import { cn, formatDate } from "@/lib/utils";
import { accentClasses } from "@/components/site/principle-icon";
import { CoverImage } from "@/components/site/cover-image";
import { editorialImage } from "@/lib/media";

export function ArticleCard({
  article,
  variant = "default",
  className,
}: {
  article: ArticleCardType;
  variant?: "default" | "compact" | "feature" | "minimal";
  className?: string;
}) {
  const accent = accentClasses(article.categoryAccent);
  const cover = article.coverImageUrl || editorialImage(article.categorySlug);
  const coverAlt = article.coverImageUrl ? (article.coverAlt ?? "") : "";

  if (variant === "feature") {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className={cn(
          "group relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-2xl bg-navy text-paper lift",
          className,
        )}
      >
          <CoverImage
            src={cover}
            alt={coverAlt}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-[900ms] group-hover:scale-[1.04]"
          />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-navy/10" />
        <div className="relative z-10 p-7">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <span className="rounded-full bg-gold px-2.5 py-1 text-ink">Featured</span>
            {article.categoryName ? (
              <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-paper/85">
                {article.categoryName}
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 font-serif text-3xl leading-tight text-paper sm:text-[2.35rem]">{article.title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/70">{article.excerpt}</p>
          <div className="mt-5 flex items-center gap-3 text-xs text-paper/60">
            <span>{article.authorName}</span>
            <span className="h-1 w-1 rounded-full bg-gold" />
            <span>{formatDate(article.publishedAt, "short")}</span>
            <span className="h-1 w-1 rounded-full bg-gold" />
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {article.readingMinutes} min
            </span>
          </div>
        </div>
        <span className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-paper transition-colors group-hover:bg-gold group-hover:text-ink">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </Link>
    );
  }

  if (variant === "minimal") {
    return (
      <Link
        href={`/blog/${article.slug}`}
        className={cn("group flex items-start justify-between gap-6 border-b border-navy/10 py-5", className)}
      >
        <div>
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", accent.fg)}>
            {article.categoryName ?? "Purpose"}
          </p>
          <h3 className="mt-1.5 font-serif text-lg leading-snug text-navy transition-colors group-hover:text-gold-dark">
            {article.title}
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            {formatDate(article.publishedAt, "short")} · {article.readingMinutes} min read
          </p>
        </div>
        <ArrowUpRight className="mt-2 h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold-dark" />
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={`/blog/${article.slug}`} className={cn("group flex gap-4", className)}>
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-cream">
            <CoverImage
              src={cover}
              alt={coverAlt}
              sizes="96px"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        <div>
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", accent.fg)}>
            {article.categoryName ?? "Purpose"}
          </p>
          <h3 className="mt-1 font-serif text-base leading-snug text-navy group-hover:text-gold-dark">
            {article.title}
          </h3>
          <p className="mt-1 text-[11px] text-stone-500">
            {formatDate(article.publishedAt, "short")} · {article.readingMinutes} min
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${article.slug}`}
      className={cn(
        "group interactive flex h-full flex-col overflow-hidden rounded-xl border border-navy/10 bg-paper",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-cream">
          <CoverImage
            src={cover}
            alt={coverAlt}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
          />
        {article.categoryName ? (
          <span className="absolute left-4 top-4 rounded-full bg-paper/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy shadow-sm">
            {article.categoryName}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl leading-snug text-navy transition-colors group-hover:text-gold-dark">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-stone-600">{article.excerpt}</p>
        <div className="mt-4 flex items-center justify-between border-t border-navy/8 pt-3 text-[11px] text-stone-500">
          <span>{article.authorName}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {article.readingMinutes} min
          </span>
        </div>
      </div>
    </Link>
  );
}
