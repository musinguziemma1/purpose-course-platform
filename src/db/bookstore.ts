import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, notifications, profiles, roles, storeBooks, storeOrderItems, storeOrders, users } from "@/db/schema";
import { currentActor } from "@/db/actor";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  BOOK_FORMATS,
  BOOK_STATUSES,
  COVER_TONES,
  DELIVERY_METHODS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  deliveryFeeUgx,
  type DeliveryMethod,
  type StoreCartLine,
} from "@/lib/bookstore-shared";
import { isUuid, validContactEmail } from "@/lib/contact";

export type StoreBook = typeof storeBooks.$inferSelect;
export type StoreActionState = { ok?: boolean; error?: string; message?: string; orderId?: string; orderNumber?: string; totalUgx?: number };

const activeBook = eq(storeBooks.status, "active");

export async function getStoreCatalogue(filters: { q?: string; category?: string; format?: string; sort?: string } = {}) {
  const q = filters.q?.trim().slice(0, 100);
  const conditions = [
    activeBook,
    q ? or(ilike(storeBooks.title, `%${q}%`), ilike(storeBooks.authorName, `%${q}%`), ilike(storeBooks.shortDescription, `%${q}%`), ilike(storeBooks.category, `%${q}%`)) : undefined,
    filters.category ? eq(storeBooks.category, filters.category.slice(0, 80)) : undefined,
    BOOK_FORMATS.includes(filters.format as typeof BOOK_FORMATS[number]) ? eq(storeBooks.format, filters.format!) : undefined,
  ];
  const order = filters.sort === "price-asc" ? [asc(storeBooks.priceUgx), asc(storeBooks.title)]
    : filters.sort === "price-desc" ? [desc(storeBooks.priceUgx), asc(storeBooks.title)]
      : filters.sort === "newest" ? [desc(storeBooks.isNew), desc(storeBooks.publishedAt), asc(storeBooks.title)]
        : [desc(storeBooks.isFeatured), desc(storeBooks.isNew), asc(storeBooks.title)];
  return db.select().from(storeBooks).where(and(...conditions)).orderBy(...order);
}

export async function getStoreCategories() {
  return db.select({ category: storeBooks.category, count: count() }).from(storeBooks).where(activeBook).groupBy(storeBooks.category).orderBy(asc(storeBooks.category));
}

export async function getStoreBook(slug: string) {
  const [book] = await db.select().from(storeBooks).where(and(activeBook, eq(storeBooks.slug, slug))).limit(1);
  return book ?? null;
}

export async function getRelatedStoreBooks(book: Pick<StoreBook, "id" | "category">) {
  return db.select().from(storeBooks).where(and(activeBook, eq(storeBooks.category, book.category), sql`${storeBooks.id} <> ${book.id}`)).orderBy(desc(storeBooks.isFeatured), asc(storeBooks.title)).limit(4);
}

export async function getActiveStoreBooks() {
  return db.select().from(storeBooks).where(activeBook).orderBy(asc(storeBooks.title));
}

export async function createStoreOrder(input: {
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  deliveryMethod: string;
  addressLine: string;
  city: string;
  notes: string;
  items: StoreCartLine[];
}, viewer: SessionUser | null, rateKey: string): Promise<StoreActionState> {
  const customerName = input.customerName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const addressLine = input.addressLine.trim();
  const city = input.city.trim();
  const notes = input.notes.trim();
  if (!isUuid(input.orderId) || !/^[a-f0-9]{64}$/.test(rateKey)) return { error: "Refresh checkout before placing the order." };
  if (!customerName || customerName.length > 160) return { error: "Enter a customer name of up to 160 characters." };
  if (!validContactEmail(email)) return { error: "Enter a valid email address." };
  if (!/^\+?[0-9][0-9 ()-]{6,30}$/.test(phone)) return { error: "Enter a valid contact phone number." };
  if (!DELIVERY_METHODS.includes(input.deliveryMethod as DeliveryMethod)) return { error: "Choose a valid delivery method." };
  const deliveryMethod = input.deliveryMethod as DeliveryMethod;
  if (deliveryMethod !== "pickup" && (!addressLine || addressLine.length > 300 || !city || city.length > 100)) return { error: "Enter the delivery address and city." };
  if (notes.length > 1000) return { error: "Keep order notes within 1,000 characters." };
  if (!input.items.length || input.items.length > 30) return { error: "Your cart is empty or too large." };
  if (input.items.some((line) => !Number.isInteger(line.bookId) || line.bookId < 1 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 25) || new Set(input.items.map((line) => line.bookId)).size !== input.items.length) return { error: "Your cart contains an invalid item or quantity." };

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.orderId}, 9042))`);
    const [existing] = await tx.select({ id: storeOrders.id, orderNumber: storeOrders.orderNumber, totalUgx: storeOrders.totalUgx, rateKey: storeOrders.rateKey }).from(storeOrders).where(eq(storeOrders.id, input.orderId)).limit(1);
    if (existing) return existing.rateKey === rateKey
      ? { ok: true, orderId: existing.id, orderNumber: existing.orderNumber, totalUgx: existing.totalUgx, message: "This order has already been received." }
      : { error: "This checkout reference has already been used. Refresh and try again." };
    const [recent] = await tx.select({ count: sql<number>`count(*)::int` }).from(storeOrders).where(and(eq(storeOrders.rateKey, rateKey), sql`${storeOrders.placedAt} >= clock_timestamp() - interval '1 hour'`));
    if (recent.count >= 5) return { error: "Too many orders were placed recently. Please try again later or contact the team." };

    const ids = input.items.map((line) => line.bookId);
    const books = await tx.select().from(storeBooks).where(and(activeBook, inArray(storeBooks.id, ids))).for("update");
    if (books.length !== ids.length) return { error: "One or more books are no longer available. Refresh your cart." };
    const byId = new Map(books.map((book) => [book.id, book]));
    for (const line of input.items) {
      const book = byId.get(line.bookId)!;
      if (book.inventoryCount < line.quantity) return { error: `${book.title} has only ${book.inventoryCount} available. Update the quantity and try again.` };
    }
    const subtotalUgx = input.items.reduce((total, line) => total + byId.get(line.bookId)!.priceUgx * line.quantity, 0);
    const deliveryUgx = deliveryFeeUgx(deliveryMethod);
    const orderNumber = `PC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${input.orderId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    await tx.insert(storeOrders).values({
      id: input.orderId,
      orderNumber,
      profileId: viewer && !viewer.isDemo ? viewer.profileId : null,
      customerName,
      email,
      phone,
      deliveryMethod,
      paymentMethod: deliveryMethod === "pickup" ? "pay_on_pickup" : "pay_on_delivery",
      addressLine: deliveryMethod === "pickup" ? null : addressLine,
      city: deliveryMethod === "pickup" ? null : city,
      notes: notes || null,
      subtotalUgx,
      deliveryUgx,
      totalUgx: subtotalUgx + deliveryUgx,
      rateKey,
    });
    await tx.insert(storeOrderItems).values(input.items.map((line) => {
      const book = byId.get(line.bookId)!;
      return { orderId: input.orderId, bookId: book.id, sku: book.sku, title: book.title, authorName: book.authorName, format: book.format, unitPriceUgx: book.priceUgx, quantity: line.quantity, lineTotalUgx: book.priceUgx * line.quantity };
    }));
    for (const line of input.items) {
      await tx.update(storeBooks).set({ inventoryCount: sql`${storeBooks.inventoryCount} - ${line.quantity}`, updatedAt: new Date() }).where(eq(storeBooks.id, line.bookId));
    }
    const recipients = await tx.select({ id: profiles.id }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).innerJoin(roles, eq(profiles.roleId, roles.id)).where(and(eq(users.isActive, true), sql`(${roles.permissions} @> '["org.manage"]'::jsonb or ${roles.slug} in ('super_admin','platform_admin'))`));
    if (recipients.length) await tx.insert(notifications).values(recipients.map((recipient) => ({ recipientId: recipient.id, type: "system" as const, title: `New bookstore order ${orderNumber}`, body: `${customerName} placed an order for ${input.items.reduce((sum, line) => sum + line.quantity, 0)} book(s).`, href: "/admin/store", templateKey: "store.order_placed", dedupeKey: `store-order:${input.orderId}:${recipient.id}` })));
    await tx.insert(activityLogs).values({ actorId: viewer && !viewer.isDemo ? viewer.profileId : null, action: "store.order_placed", entityType: "store_order", entityId: input.orderId, description: `Placed bookstore order ${orderNumber}.` });
    return { ok: true, orderId: input.orderId, orderNumber, totalUgx: subtotalUgx + deliveryUgx, message: deliveryMethod === "pickup" ? "Order received. The team will confirm when it is ready for pickup." : "Order received. The team will confirm delivery by phone or email." };
  });
}

async function authorizedStoreActor(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], viewer: SessionUser | null) {
  const actor = await currentActor(tx, viewer);
  return actor && can(actor, "org.manage") ? actor : null;
}

export async function getStoreAdmin(viewer: SessionUser | null) {
  return db.transaction(async (tx) => {
    if (!(await authorizedStoreActor(tx, viewer))) return null;
    const [books, orders] = await Promise.all([
      tx.select().from(storeBooks).orderBy(asc(storeBooks.status), asc(storeBooks.title)),
      tx.select({ order: storeOrders, itemCount: sql<number>`coalesce(sum(${storeOrderItems.quantity}), 0)::int` }).from(storeOrders).leftJoin(storeOrderItems, eq(storeOrderItems.orderId, storeOrders.id)).groupBy(storeOrders.id).orderBy(desc(storeOrders.placedAt)).limit(100),
    ]);
    return { books, orders };
  });
}

export async function saveStoreBook(input: Record<string, string>, viewer: SessionUser | null): Promise<StoreActionState> {
  const id = Number(input.id || 0);
  const title = input.title?.trim(), slug = input.slug?.trim().toLowerCase(), sku = input.sku?.trim().toUpperCase(), authorName = input.authorName?.trim();
  const status = input.status, format = input.format, coverTone = input.coverTone;
  const priceUgx = Number(input.priceUgx), inventoryCount = Number(input.inventoryCount), pageCount = Number(input.pageCount), compareAt = input.compareAtPriceUgx ? Number(input.compareAtPriceUgx) : null;
  if (!title || title.length > 220 || !authorName || authorName.length > 180) return { error: "Enter a valid title and author." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Z0-9][A-Z0-9-]{2,47}$/.test(sku)) return { error: "Use a lowercase hyphenated slug and an uppercase SKU." };
  if (input.isbn13?.trim() && !/^[0-9]{13}$/.test(input.isbn13.trim())) return { error: "ISBN-13 must contain exactly 13 digits." };
  if (!BOOK_STATUSES.includes(status as typeof BOOK_STATUSES[number]) || !BOOK_FORMATS.includes(format as typeof BOOK_FORMATS[number]) || !COVER_TONES.includes(coverTone as typeof COVER_TONES[number])) return { error: "Choose valid catalogue options." };
  if (![priceUgx, inventoryCount, pageCount].every((value) => Number.isInteger(value) && value >= 0) || (compareAt !== null && (!Number.isInteger(compareAt) || compareAt < priceUgx))) return { error: "Enter valid whole-number prices, pages and stock." };
  const values = {
    title, slug, sku, authorName, status, format, coverTone, priceUgx, compareAtPriceUgx: compareAt, inventoryCount, pageCount,
    subtitle: input.subtitle?.trim() || null,
    shortDescription: input.shortDescription?.trim(), description: input.description?.trim(), category: input.category?.trim(),
    language: input.language?.trim() || "English", coverAlt: input.coverAlt?.trim() || `${title} cover`,
    isbn13: input.isbn13?.trim() || null, isFeatured: input.isFeatured === "on", isNew: input.isNew === "on", updatedAt: new Date(),
    publishedAt: status === "active" ? new Date() : null,
  };
  if (!values.shortDescription || values.shortDescription.length > 500 || !values.description || !values.category) return { error: "Add a category and both book descriptions." };
  return db.transaction(async (tx) => {
    const actor = await authorizedStoreActor(tx, viewer);
    if (!actor) return { error: "Bookstore management permission required." };
    if (id > 0) {
      const [current] = await tx.select({ id: storeBooks.id, updatedAt: storeBooks.updatedAt }).from(storeBooks).where(eq(storeBooks.id, id)).for("update").limit(1);
      if (!current) return { error: "Book not found." };
      const expectedUpdatedAt = new Date(input.updatedAt);
      if (Number.isNaN(expectedUpdatedAt.valueOf()) || current.updatedAt.valueOf() !== expectedUpdatedAt.valueOf()) return { error: "This book or its stock changed in another window. Refresh before saving." };
      const [book] = await tx.update(storeBooks).set(values).where(eq(storeBooks.id, id)).returning({ id: storeBooks.id });
      if (!book) return { error: "Book not found." };
      await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "store.book_updated", entityType: "store_book", entityId: String(id), description: `Updated bookstore title ${title}.` });
    } else {
      const [book] = await tx.insert(storeBooks).values({ ...values, lowStockThreshold: 5 }).returning({ id: storeBooks.id });
      await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "store.book_created", entityType: "store_book", entityId: String(book.id), description: `Created bookstore title ${title}.` });
    }
    return { ok: true, message: "Book catalogue updated." };
  }).catch((error: unknown) => ({ error: error instanceof Error && /unique/i.test(error.message) ? "That slug, SKU or ISBN is already in use." : "The book could not be saved." }));
}

export async function updateStoreOrder(input: { id: string; version: number; status: string; paymentStatus: string }, viewer: SessionUser | null): Promise<StoreActionState> {
  if (!isUuid(input.id) || !Number.isInteger(input.version) || !ORDER_STATUSES.includes(input.status as typeof ORDER_STATUSES[number]) || !PAYMENT_STATUSES.includes(input.paymentStatus as typeof PAYMENT_STATUSES[number])) return { error: "Choose a valid order state." };
  return db.transaction(async (tx) => {
    const actor = await authorizedStoreActor(tx, viewer);
    if (!actor) return { error: "Bookstore management permission required." };
    const [order] = await tx.select().from(storeOrders).where(eq(storeOrders.id, input.id)).for("update").limit(1);
    if (!order) return { error: "Order not found." };
    if (order.version !== input.version) return { error: "This order changed in another window. Refresh before updating it." };
    if (order.status === "cancelled" && input.status !== "cancelled") return { error: "A cancelled order cannot be reopened; place a new order instead." };
    if (input.status === "completed" && input.paymentStatus !== "paid") return { error: "Mark payment as paid before completing the order." };
    if (input.status === "cancelled" && order.status !== "cancelled") {
      const items = await tx.select({ bookId: storeOrderItems.bookId, quantity: storeOrderItems.quantity }).from(storeOrderItems).where(eq(storeOrderItems.orderId, order.id));
      for (const item of items) if (item.bookId) await tx.update(storeBooks).set({ inventoryCount: sql`${storeBooks.inventoryCount} + ${item.quantity}`, updatedAt: new Date() }).where(eq(storeBooks.id, item.bookId));
    }
    await tx.update(storeOrders).set({ status: input.status, paymentStatus: input.paymentStatus, version: order.version + 1, updatedAt: new Date(), completedAt: input.status === "completed" ? new Date() : null, cancelledAt: input.status === "cancelled" ? new Date() : null }).where(eq(storeOrders.id, input.id));
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "store.order_updated", entityType: "store_order", entityId: input.id, description: `Changed ${order.orderNumber} from ${order.status}/${order.paymentStatus} to ${input.status}/${input.paymentStatus}.` });
    return { ok: true, message: "Order updated." };
  });
}
