import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canUseMediaLibrary } from "@/lib/media-files";
import { MediaLibrary } from "@/components/media/media-library";
import { ConsoleHeader } from "@/components/admin/console/surfaces";

export const metadata = { title: "Media library" };
export const dynamic = "force-dynamic";

/* Same access rules as the shared StaffMediaPage (the mentor desk keeps that one), with the console header. */
export default async function AdminMediaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canUseMediaLibrary(user)) notFound();
  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Shared resources"
        title="Media library"
        description="Upload once, reuse across courses, articles and assignments. Staff can browse and reuse this library. Students receive only the files published or assigned to them."
      />
      <MediaLibrary />
    </div>
  );
}
