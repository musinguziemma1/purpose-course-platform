import { requireAdminPage } from "@/lib/page-access";
import Link from "next/link";
import { ArrowRight, CalendarClock, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminArticles } from "@/db/queries";
import { formatDateTime, STATUS_META, type ArticleStatusValue } from "@/lib/utils";
import { Lcd, Led, Odometer, type LedTone } from "@/components/admin/console/instruments";
import { ConsoleEmpty, ConsoleHeader, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";

export const metadata = { title: "Review queue" };

const QUEUE_ORDER: ArticleStatusValue[] = ["submitted", "in_review", "approved", "revision_requested", "scheduled"];
const STAGE_LED: Record<string, LedTone> = {
  submitted: "amber",
  in_review: "gold",
  approved: "green",
  revision_requested: "red",
  scheduled: "blue",
};

export default async function ReviewQueuePage() {
  await requireAdminPage("/admin/reviews");
  const rows = await getAdminArticles({ status: "all", limit: 200 });
  const queued = rows
    .filter((row) => QUEUE_ORDER.includes(row.status as ArticleStatusValue))
    .sort((a, b) => QUEUE_ORDER.indexOf(a.status as ArticleStatusValue) - QUEUE_ORDER.indexOf(b.status as ArticleStatusValue));

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Editorial desk"
        title="Review queue"
        description="Every piece that needs an editorial decision, grouped by stage. Review notes are required for revisions and rejections."
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Queue by stage">
        {QUEUE_ORDER.map((status) => {
          const count = queued.filter((row) => row.status === status).length;
          return (
            <li key={status} className="admin-card k-tray px-4 pb-6 pt-4">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={status} />
                <Led tone={count ? STAGE_LED[status] : "off"} pulse={count > 0 && status === "submitted"} />
              </div>
              <p className="mt-3 text-[2rem] text-navy">
                <Odometer value={count} />
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-stone-600">{STATUS_META[status].description}</p>
            </li>
          );
        })}
      </ul>

      {queued.length === 0 ? (
        <ConsoleEmpty
          icon={Inbox}
          title="The desk is clear."
          description="No articles are waiting on review. Check the published archive."
          action={
            <Link href="/admin/articles?status=published" className={keyClass("paper", "sm")}>
              View published articles <ArrowRight aria-hidden />
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {QUEUE_ORDER.map((status) => {
            const group = queued.filter((row) => row.status === status);
            if (!group.length) return null;
            return (
              <Panel
                key={status}
                title={STATUS_META[status].label}
                description={STATUS_META[status].description}
                action={
                  <Lcd>
                    <Odometer value={group.length} />
                  </Lcd>
                }
              >
                <ul className="k-stagger divide-y divide-navy/8">
                  {group.map((row, index) => (
                    <li key={row.id} style={staggerStyle(index)}>
                      <Link href={`/admin/articles/${row.id}`} className="group flex flex-wrap items-center gap-x-3.5 gap-y-2 px-5 py-3.5 transition-colors hover:bg-cream/60">
                        <Led tone={STAGE_LED[status]} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-[16px] text-navy">{row.title}</p>
                          <p className="text-[12.5px] text-stone-600">
                            {row.authorName} · {row.categoryName ?? "Uncategorised"} · updated {formatDateTime(row.updatedAt)}
                          </p>
                        </div>
                        {row.scheduledFor ? (
                          <span className="ui-badge inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[12px] font-medium text-violet-800">
                            <CalendarClock aria-hidden className="h-3.5 w-3.5" /> due {formatDateTime(row.scheduledFor)}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-navy">
                          Open <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
