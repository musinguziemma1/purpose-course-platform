export const BOOK_FORMATS = ["paperback", "hardcover", "workbook"] as const;
export const BOOK_STATUSES = ["draft", "active", "archived"] as const;
export const COVER_TONES = ["navy", "source", "potential", "destiny", "gold", "terracotta"] as const;
export const DELIVERY_METHODS = ["pickup", "kampala_delivery", "uganda_delivery", "digital_delivery"] as const;
export const STORE_VARIANT_CODES = ["digital_pdf", "paperback", "hardcover"] as const;
export const ORDER_STATUSES = ["placed", "confirmed", "packing", "dispatched", "ready_for_pickup", "completed", "cancelled"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "refunded"] as const;

export type DeliveryMethod = typeof DELIVERY_METHODS[number];
export type StoreVariantCode = typeof STORE_VARIANT_CODES[number];
export type StoreCartLine = { variantId: number; quantity: number };

export const deliveryFeeUgx = (method: DeliveryMethod) => method === "pickup" || method === "digital_delivery" ? 0 : method === "kampala_delivery" ? 10000 : 15000;
export const formatUgx = (amount: number) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(amount);

export function parseCartLines(value: string): StoreCartLine[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 30) return null;
    const compact = new Map<number, number>();
    for (const line of parsed) {
      if (!line || typeof line !== "object") return null;
      const variantId = Number((line as Record<string, unknown>).variantId);
      const quantity = Number((line as Record<string, unknown>).quantity);
      if (!Number.isInteger(variantId) || variantId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 25) return null;
      compact.set(variantId, (compact.get(variantId) ?? 0) + quantity);
    }
    const lines = [...compact].map(([variantId, quantity]) => ({ variantId, quantity }));
    return lines.every((line) => line.quantity <= 25) ? lines : null;
  } catch {
    return null;
  }
}
