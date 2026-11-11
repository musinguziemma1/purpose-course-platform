import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminArticles } from "@/db/queries";
import { cn, formatDate, STATUS_META, ARTICLE_STATUSES, type ArticleStatusValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Articles" };

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status ?? "all") as ArticleStatusValue | "all";

  const [rows, allRows] = await Promise.all([
    getAdminArticles({ status, query: params.q?.trim(), limit: 200 }),
    getAdminArticles({ status: "all", limit: 500 }),
  ]);

  const counts = new Map<string, number>();
  allRows.forEach((row) => counts.set(row.status, (counts.get(row.status) ?? 0) + 1));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Articles</h1>
          <p className="text-[12.5px] text-stone-600">
            {allRows.length} total · every status change is recorded in the review history.
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-4 text-[12.5px] font-semibold text-paper hover:bg-navy-700"
        >
          <Plus className="h-4 w-4" /> New article
        </Link>
      </div>

      <div className="admin-card p-3">
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <Link
            href="/admin/articles"
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium",
              status === "all" ? "bg-navy text-paper" : "text-stone-600 hover:bg-cream",
            )}
          >
            All ({allRows.length})
          </Link>
          {ARTICLE_STATUSES.map((value) => (
            <Link
              key={value}
              href={`/admin/articles?status=${value}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium",
                status === value ? "bg-navy text-paper" : "text-stone-600 hover:bg-cream",
              )}
            >
              {STATUS_META[value].label} ({counts.get(value) ?? 0})
            </Link>
          ))}
        </div>
        <form action="/admin/articles" className="mt-3 flex gap-2 border-t border-navy/8 pt-3">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search titles…"
              className="h-9 w-full rounded-lg border border-navy/15 bg-white pl-9 pr-3 text-[12.5px] outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
            />
          </div>
          <button type="submit" className="h-9 rounded-lg border border-navy/15 px-3 text-[11.5px] font-medium text-navy hover:bg-cream">
            Search
          </button>
        </form>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="hidden grid-cols-[1fr_110px_130px_130px_110px] gap-3 border-b border-navy/10 bg-cream/50 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500 lg:grid">
          <span>Article</span>
          <span>Status</span>
          <span>Category</span>
          <span>Author</span>
          <span className="text-right">Updated</span>
        </div>
        <ul className="divide-y divide-navy/8">
          {rows.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-stone-500">No articles match this filter.</li>
          ) : (
            rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/articles/${row.id}`}
                  className="grid gap-2 px-5 py-3.5 transition-colors hover:bg-cream/40 lg:grid-cols-[1fr_110px_130px_130px_110px] lg:items-center lg:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-[15px] text-navy">{row.title}</p>
                    <p className="text-[10.5px] text-stone-400">
                      {row.isFeatured ? "Featured · " : ""}
                      {row.readingMinutes} min read
                      {row.scheduledFor ? ` · due ${formatDate(row.scheduledFor, "short")}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={row.status} className="w-fit" />
                  <span className="text-[11.5px] text-stone-600">{row.categoryName ?? "Uncategorised"}</span>
                  <span className="text-[11.5px] text-stone-600">{row.authorName}</span>
                  <span className="text-[10.5px] text-stone-400 lg:text-right">{formatDate(row.updatedAt, "short")}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
