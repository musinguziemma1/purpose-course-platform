import Link from "next/link";
import { notFound } from "next/navigation";
import { Megaphone, PenLine, Pin, StickyNote } from "lucide-react";
import { requireAdminPage } from "@/lib/page-access";
import { AUDIENCE_LABELS, listAnnouncements, type Audience } from "@/db/announcements";
import { AnnouncementEditor, ArchiveAnnouncementButton } from "@/components/admin/announcement-forms";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FeaturePending } from "@/components/ui/feature-pending";
import { ConsoleHeader, Panel, keyClass, staggerStyle } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements" };

const localInput = (date: Date | null) => (date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : null);

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireAdminPage("/admin/announcements");
  const data = await listAnnouncements(user);
  if (!data) notFound();
  const { edit } = await searchParams;
  if (!data.ready)
    return (
      <div className="space-y-6">
        <ConsoleHeader eyebrow="Publishing" title="Announcements" />
        <FeaturePending feature="Announcements" staff />
      </div>
    );
  const editing = data.rows.find((row) => row.announcement.id === Number(edit) && row.announcement.status !== "archived")?.announcement;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Publishing"
        title="Announcements"
        description="Share timely news with everyone, a role group or a single cohort. Published announcements appear on dashboards and arrive as in-app notifications."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr] xl:items-start">
        <Panel
          title={editing ? "Edit announcement" : "New announcement"}
          icon={PenLine}
          riveted
          bodyClassName="px-5 pb-6 pt-4 sm:px-6"
          action={
            editing ? (
              <Link href="/admin/announcements" className={keyClass("paper", "sm")}>
                Write a new one instead
              </Link>
            ) : null
          }
        >
          <AnnouncementEditor
            key={editing ? `${editing.id}-${editing.version}` : "new"}
            cohorts={data.cohorts}
            initial={editing ? { id: editing.id, version: editing.version, title: editing.title, body: editing.body, audience: editing.audience as Audience, cohortId: editing.cohortId, href: editing.href, pinned: editing.pinned, expiresAt: localInput(editing.expiresAt), status: editing.status } : undefined}
          />
        </Panel>

        <Panel title="Noticeboard" icon={StickyNote} description="Every announcement, newest first. Pinned notices carry a pin." bodyClassName="p-3 sm:p-4">
          {data.rows.length === 0 ? (
            <div className="k-cork flex flex-col items-center px-6 py-12 text-center">
              <span className="k-notice inline-flex items-center gap-2 px-4 py-3 text-[14px] text-stone-700">
                <Megaphone aria-hidden className="h-4 w-4 text-gold-dark" /> No announcements yet. Your first one will appear here.
              </span>
            </div>
          ) : (
            <ul className="k-cork k-stagger space-y-5 p-4 pt-6 sm:p-5 sm:pt-7">
              {data.rows.map(({ announcement, author, cohortName }, index) => (
                <li key={announcement.id} style={staggerStyle(index)} className="k-notice px-4 pb-4 pt-5">
                  {announcement.pinned ? <span aria-hidden className="k-pin" /> : null}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-serif text-[17px] leading-snug text-navy">
                        {announcement.pinned ? <Pin aria-label="Pinned" className="h-4 w-4 shrink-0 text-gold-dark" /> : null}
                        {announcement.title}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-stone-600">
                        {announcement.audience === "cohort" ? `Cohort: ${cohortName ?? "removed"}` : AUDIENCE_LABELS[announcement.audience as Audience]}
                        {announcement.publishedAt ? ` · published ${formatDateTime(announcement.publishedAt)}` : ""}
                        {announcement.expiresAt ? ` · hides ${formatDateTime(announcement.expiresAt)}` : ""}
                        {author ? ` · by ${author}` : ""}
                      </p>
                    </div>
                    <Badge variant={announcement.status === "published" ? "success" : announcement.status === "draft" ? "gold" : "muted"}>{announcement.status}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-stone-700">{announcement.body}</p>
                  {announcement.status !== "archived" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link href={`/admin/announcements?edit=${announcement.id}`} className={keyClass("paper", "sm")}>
                        <PenLine aria-hidden /> Edit
                      </Link>
                      <ArchiveAnnouncementButton id={announcement.id} version={announcement.version} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
