"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createStoreOrder, saveStoreBook, updateStoreOrder, type StoreActionState } from "@/db/bookstore";
import { getSessionUser } from "@/lib/auth";
import { storeRateKey } from "@/lib/bookstore";
import { parseCartLines } from "@/lib/bookstore-shared";

export async function placeStoreOrder(_previous: StoreActionState, form: FormData): Promise<StoreActionState> {
  const items = parseCartLines(String(form.get("items") ?? ""));
  if (!items) return { error: "Your cart could not be read. Refresh checkout and try again." };
  try {
    const result = await createStoreOrder({
      orderId: String(form.get("orderId") ?? ""),
      customerName: String(form.get("customerName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      deliveryMethod: String(form.get("deliveryMethod") ?? ""),
      addressLine: String(form.get("addressLine") ?? ""),
      city: String(form.get("city") ?? ""),
      notes: String(form.get("notes") ?? ""),
      items,
    }, await getSessionUser(), storeRateKey(await headers()));
    if (result.ok) {
      revalidatePath("/bookstore");
      revalidatePath("/admin/store");
    }
    return result;
  } catch {
    return { error: "The order could not be placed. Your cart is still safe; please try again." };
  }
}

export async function saveStoreBookAction(_previous: StoreActionState, form: FormData): Promise<StoreActionState> {
  const result = await saveStoreBook(Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)])), await getSessionUser());
  if (result.ok) { revalidatePath("/bookstore"); revalidatePath("/admin/store"); }
  return result;
}

export async function updateStoreOrderAction(_previous: StoreActionState, form: FormData): Promise<StoreActionState> {
  const result = await updateStoreOrder({ id: String(form.get("id") ?? ""), version: Number(form.get("version")), status: String(form.get("status") ?? ""), paymentStatus: String(form.get("paymentStatus") ?? "") }, await getSessionUser());
  if (result.ok) revalidatePath("/admin/store");
  return result;
}
