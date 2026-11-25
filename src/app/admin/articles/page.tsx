import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { FileText, Plus, Search, Star } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminArticles } from "@/db/queries";
import { formatDate, STATUS_META, ARTICLE_STATUSES, type ArticleStatusValue } from "@/lib/utils";
import { ConsoleEmpty, ConsoleHeader, SegmentedNav, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Articles" };

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminPage("/admin/articles");
  const params = await searchParams;
  const status = (params.status ?? "all") as ArticleStatusValue | "all";

  const [rows, allRows] = await Promise.all([
    getAdminArticles({ status, query: params.q?.trim(), limit: 200 }),
    getAdminArticles({ status: "all", limit: 500 }),
  ]);

  const counts = new Map<string, number>();
  allRows.forEach((row) => counts.set(row.status, (counts.get(row.status) ?? 0) + 1));

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Publishing"
        title="Articles"
        description={`${allRows.length} total · every status change is recorded in the review history.`}
        actions={
          <Link href="/admin/articles/new" className={keyClass("navy")}>
            <Plus aria-hidden /> New article
          </Link>
        }
      />

      <div className="admin-card space-y-3 p-3 sm:p-4">
        <SegmentedNav
          label="Filter by status"
          items={[
            { href: "/admin/articles", label: "All", count: allRows.length, current: status === "all" },
            ...ARTICLE_STATUSES.map((value) => ({
              href: `/admin/articles?status=${value}`,
              label: STATUS_META[value].label,
              count: counts.get(value) ?? 0,
              current: status === value,
            })),
          ]}
        />
        <form action="/admin/articles" role="search" className="flex gap-2">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input
              name="q"
              aria-label="Search article titles"
              defaultValue={params.q}
              placeholder="Search titles…"
              className="h-10 w-full rounded-full border pl-10 pr-4 text-[16px] text-ink outline-none sm:text-[14px]"
            />
          </div>
          <button type="submit" className={keyClass("paper")}>
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <ConsoleEmpty icon={FileText} title="No articles match this filter." description="Try another status or clear the search." />
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="k-strip hidden grid-cols-[1fr_120px_140px_140px_100px] gap-3 px-5 py-3 lg:grid">
            {["Article", "Status", "Category", "Author", "Updated"].map((heading, index) => (
              <span key={heading} className={index === 4 ? "k-panel-title text-right" : "k-panel-title"}>
                {heading}
              </span>
            ))}
          </div>
          <ul className="k-stagger divide-y divide-navy/8">
            {rows.map((row, index) => (
              <li key={row.id} style={staggerStyle(index)}>
                <Link
                  href={`/admin/articles/${row.id}`}
                  className="grid gap-2 px-5 py-3.5 transition-colors hover:bg-cream/60 lg:grid-cols-[1fr_120px_140px_140px_100px] lg:items-center lg:gap-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-serif text-[16px] text-navy">
                      {row.isFeatured ? <Star aria-label="Featured" className="h-3.5 w-3.5 shrink-0 fill-gold text-gold-dark" /> : null}
                      <span className="truncate">{row.title}</span>
                    </p>
                    <p className="text-[12px] text-stone-600">
                      {row.readingMinutes} min read
                      {row.scheduledFor ? ` · due ${formatDate(row.scheduledFor, "short")}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={row.status} className="w-fit" />
                  <span className="text-[13px] text-stone-600">{row.categoryName ?? "Uncategorised"}</span>
                  <span className="text-[13px] text-stone-600">{row.authorName}</span>
                  <span className="numeric text-[12.5px] text-stone-600 lg:text-right">{formatDate(row.updatedAt, "short")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
