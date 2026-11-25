import { PackageCheck, ShoppingBag, TriangleAlert } from "lucide-react";
import { AdminStore } from "@/components/bookstore/admin-store";
import { getStoreAdmin } from "@/db/bookstore";
import { requireAdminPage } from "@/lib/page-access";
import { ConsoleHeader, MetricTile } from "@/components/admin/console/surfaces";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookstore operations" };

export default async function AdminStorePage() {
  const user = await requireAdminPage("/admin/store");
  const data = await getStoreAdmin(user);
  if (!data) return null;
  const open = data.orders.filter(({ order }) => !["completed", "cancelled"].includes(order.status)).length;
  const low = data.books.filter(
    (book) =>
      book.status === "active" &&
      book.variants.some((variant) => variant.isActive && variant.deliveryKind === "physical" && variant.inventoryCount <= book.lowStockThreshold),
  ).length;
  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="Commerce operations"
        title="Bookstore"
        description="Manage titles, stock, payment confirmation and fulfilment without leaving the platform."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile label="Total orders" value={data.orders.length} icon={ShoppingBag} />
        <MetricTile label="Open fulfilments" value={open} icon={PackageCheck} tone="gold" led={open ? { tone: "amber", pulse: true } : { tone: "green" }} />
        <MetricTile label="Low-stock titles" value={low} icon={TriangleAlert} tone={low ? "rose" : "source"} led={low ? { tone: "red", pulse: true } : { tone: "green" }} />
      </div>
      <AdminStore books={data.books} orders={data.orders} reviews={data.reviews} />
    </div>
  );
}
