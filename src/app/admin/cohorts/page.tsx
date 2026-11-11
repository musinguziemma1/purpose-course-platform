import { requireAdminPage } from "@/lib/page-access";
import { redirect } from "next/navigation";

export default async function AdminCohortsPage() {
  await requireAdminPage("/admin/cohorts");
  redirect("/admin/programme");
}
