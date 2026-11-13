import { StaffAssignmentsPage } from "@/components/academy/staff-assignments-page";
import { requireAdminPage } from "@/lib/page-access";
export const metadata = { title: "Assignments" };
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireAdminPage("/admin/assignments");
  return <StaffAssignmentsPage />;
}
