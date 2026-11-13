import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canUseMediaLibrary } from "@/lib/media-files";
import { MediaLibrary } from "@/components/media/media-library";
export async function StaffMediaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canUseMediaLibrary(user)) notFound();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
          Shared resources
        </p>
        <h1 className="mt-2 font-serif text-3xl text-navy">Media library</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Upload once, reuse across courses, articles and assignments. Staff can
          browse and reuse this library. Students receive only the files
          published or assigned to them.
        </p>
      </div>
      <MediaLibrary />
    </div>
  );
}
