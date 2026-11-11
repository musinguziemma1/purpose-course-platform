import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminArticles } from "@/db/queries";
import { formatDateTime, STATUS_META, type ArticleStatusValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Review queue" };

const QUEUE_ORDER: ArticleStatusValue[] = ["submitted", "in_review", "approved", "revision_requested", "scheduled"];

export default async function ReviewQueuePage() {
  const rows = await getAdminArticles({ status: "all", limit: 200 });
  const queued = rows
    .filter((row) => QUEUE_ORDER.includes(row.status as ArticleStatusValue))
    .sort((a, b) => QUEUE_ORDER.indexOf(a.status as ArticleStatusValue) - QUEUE_ORDER.indexOf(b.status as ArticleStatusValue));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-navy">Review queue</h1>
        <p className="text-[12.5px] text-stone-600">
          Every piece that needs an editorial decision, grouped by stage. Review notes are required for revisions and
          rejections.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {QUEUE_ORDER.map((status) => (
          <div key={status} className="admin-card p-3.5">
            <StatusBadge status={status} />
            <p className="mt-2 font-serif text-2xl text-navy">{queued.filter((row) => row.status === status).length}</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-stone-500">{STATUS_META[status].description}</p>
          </div>
        ))}
      </div>

      {queued.length === 0 ? (
        <div className="admin-card flex flex-col items-center px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-stone-300" />
          <p className="mt-3 font-serif text-xl text-navy">The desk is clear.</p>
          <p className="mt-1 text-[12.5px] text-stone-600">No articles are waiting on review. Check the published archive.</p>
          <Link href="/admin/articles?status=published" className="mt-4 text-[12px] font-semibold text-navy hover:text-gold-dark">
            View published articles →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {QUEUE_ORDER.map((status) => {
            const group = queued.filter((row) => row.status === status);
            if (!group.length) return null;
            return (
              <div key={status} className="admin-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-navy/10 bg-cream/40 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-[11px] text-stone-500">{STATUS_META[status].description}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-navy">{group.length}</span>
                </div>
                <ul className="divide-y divide-navy/8">
                  {group.map((row) => (
                    <li key={row.id}>
                      <Link href={`/admin/articles/${row.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-cream/40">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-[15px] text-navy">{row.title}</p>
                          <p className="text-[11px] text-stone-500">
                            {row.authorName} · {row.categoryName ?? "Uncategorised"} · updated {formatDateTime(row.updatedAt)}
                          </p>
                        </div>
                        {row.scheduledFor ? (
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10.5px] font-medium text-violet-800">
                            due {formatDateTime(row.scheduledFor)}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-navy">
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
