import Link from "next/link";
import { notFound } from "next/navigation";
import { Pin } from "lucide-react";
import { requireAdminPage } from "@/lib/page-access";
import { AUDIENCE_LABELS, listAnnouncements, type Audience } from "@/db/announcements";
import { AnnouncementEditor, ArchiveAnnouncementButton } from "@/components/admin/announcement-forms";
import { PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FeaturePending } from "@/components/ui/feature-pending";

export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements" };

const localInput = (date: Date | null) => (date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : null);

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireAdminPage("/admin/announcements");
  const data = await listAnnouncements(user);
  if (!data) notFound();
  const { edit } = await searchParams;
  if (!data.ready) return <div className="space-y-6"><PageHeader eyebrow="Publishing" title="Announcements" /><FeaturePending feature="Announcements" staff /></div>;
  const editing = data.rows.find((row) => row.announcement.id === Number(edit) && row.announcement.status !== "archived")?.announcement;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publishing"
        title="Announcements"
        description="Share timely news with everyone, a role group or a single cohort. Published announcements appear on dashboards and arrive as in-app notifications."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr] xl:items-start">
        <section aria-labelledby="editor-heading" className="admin-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="editor-heading" className="font-serif text-xl text-navy">{editing ? "Edit announcement" : "New announcement"}</h2>
            {editing ? <Link href="/admin/announcements" className="text-[14px] font-medium text-navy underline underline-offset-4">Write a new one instead</Link> : null}
          </div>
          <div className="mt-4">
            <AnnouncementEditor
              key={editing ? `${editing.id}-${editing.version}` : "new"}
              cohorts={data.cohorts}
              initial={editing ? { id: editing.id, version: editing.version, title: editing.title, body: editing.body, audience: editing.audience as Audience, cohortId: editing.cohortId, href: editing.href, pinned: editing.pinned, expiresAt: localInput(editing.expiresAt), status: editing.status } : undefined}
            />
          </div>
        </section>

        <section aria-labelledby="list-heading" className="admin-card overflow-hidden">
          <h2 id="list-heading" className="border-b border-navy/10 px-5 py-4 font-serif text-xl text-navy">All announcements</h2>
          {data.rows.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-stone-600">No announcements yet. Your first one will appear here.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {data.rows.map(({ announcement, author, cohortName }) => (
                <li key={announcement.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-navy">
                        {announcement.pinned ? <Pin aria-label="Pinned" className="h-4 w-4 text-gold-dark" /> : null}
                        {announcement.title}
                      </p>
                      <p className="mt-0.5 text-[13px] text-stone-600">
                        {announcement.audience === "cohort" ? `Cohort: ${cohortName ?? "removed"}` : AUDIENCE_LABELS[announcement.audience as Audience]}
                        {announcement.publishedAt ? ` · published ${formatDateTime(announcement.publishedAt)}` : ""}
                        {announcement.expiresAt ? ` · hides ${formatDateTime(announcement.expiresAt)}` : ""}
                        {author ? ` · by ${author}` : ""}
                      </p>
                    </div>
                    <Badge variant={announcement.status === "published" ? "success" : announcement.status === "draft" ? "gold" : "muted"}>{announcement.status}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-line text-[14px] text-stone-700">{announcement.body}</p>
                  {announcement.status !== "archived" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link href={`/admin/announcements?edit=${announcement.id}`} className="inline-flex min-h-10 items-center rounded-full border border-navy/20 px-3 text-[13px] font-medium text-navy hover:bg-cream">Edit</Link>
                      <ArchiveAnnouncementButton id={announcement.id} version={announcement.version} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
