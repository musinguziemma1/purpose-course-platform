import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, mediaAssets, notifications, profiles, roles, storeBooks, storeBookVariants, storeOrderItems, storeOrders, storeReviews, users } from "@/db/schema";
import { currentActor } from "@/db/actor";
import type { SessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { BOOK_STATUSES, COVER_TONES, DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_STATUSES, STORE_VARIANT_CODES, deliveryFeeUgx, type DeliveryMethod, type StoreCartLine, type StoreVariantCode } from "@/lib/bookstore-shared";
import { isUuid, validContactEmail } from "@/lib/contact";

export type StoreBook = typeof storeBooks.$inferSelect;
export type StoreVariant = typeof storeBookVariants.$inferSelect;
export type StorefrontBook = StoreBook & { variants: StoreVariant[] };
export type StoreActionState = { ok?: boolean; error?: string; message?: string; orderId?: string; orderNumber?: string; totalUgx?: number };
export type StoreReviewState = StoreActionState & { verified?: boolean };

const activeBook = eq(storeBooks.status, "active");
const variantConfig: Record<StoreVariantCode, { label: string; deliveryKind: "physical" | "digital"; sortOrder: number }> = {
  digital_pdf: { label: "PDF softcopy", deliveryKind: "digital", sortOrder: 10 },
  paperback: { label: "Paperback", deliveryKind: "physical", sortOrder: 20 },
  hardcover: { label: "Hardcover", deliveryKind: "physical", sortOrder: 30 },
};

async function attachVariants<T extends StoreBook>(books: T[], activeOnly = true): Promise<(T & { variants: StoreVariant[] })[]> {
  if (!books.length) return [];
  const variants = await db.select().from(storeBookVariants).where(and(inArray(storeBookVariants.bookId, books.map((book) => book.id)), activeOnly ? eq(storeBookVariants.isActive, true) : undefined)).orderBy(asc(storeBookVariants.sortOrder), asc(storeBookVariants.id));
  const byBook = new Map<number, StoreVariant[]>();
  for (const variant of variants) byBook.set(variant.bookId, [...(byBook.get(variant.bookId) ?? []), variant]);
  return books.map((book) => ({ ...book, variants: byBook.get(book.id) ?? [] }));
}

export async function getStoreCatalogue(filters: { q?: string; category?: string; format?: string; sort?: string } = {}) {
  const q = filters.q?.trim().slice(0, 100);
  const requestedFormat = filters.format === "workbook" ? "digital_pdf" : filters.format;
  const format = STORE_VARIANT_CODES.includes(requestedFormat as StoreVariantCode) ? requestedFormat as StoreVariantCode : null;
  const conditions = [activeBook, q ? or(ilike(storeBooks.title, `%${q}%`), ilike(storeBooks.authorName, `%${q}%`), ilike(storeBooks.shortDescription, `%${q}%`), ilike(storeBooks.category, `%${q}%`)) : undefined, filters.category ? eq(storeBooks.category, filters.category.slice(0, 80)) : undefined, format ? sql`exists(select 1 from ${storeBookVariants} v where v.book_id = ${storeBooks.id} and v.is_active and v.code = ${format})` : undefined];
  const order = filters.sort === "price-asc" ? [asc(storeBooks.priceUgx), asc(storeBooks.title)] : filters.sort === "price-desc" ? [desc(storeBooks.priceUgx), asc(storeBooks.title)] : filters.sort === "newest" ? [desc(storeBooks.isNew), desc(storeBooks.publishedAt), asc(storeBooks.title)] : [desc(storeBooks.isFeatured), desc(storeBooks.isNew), asc(storeBooks.title)];
  return attachVariants(await db.select().from(storeBooks).where(and(...conditions)).orderBy(...order));
}

export async function getStoreCategories() { return db.select({ category: storeBooks.category, count: count() }).from(storeBooks).where(activeBook).groupBy(storeBooks.category).orderBy(asc(storeBooks.category)); }

export async function getStoreBook(slug: string) {
  const [book] = await db.select().from(storeBooks).where(and(activeBook, eq(storeBooks.slug, slug))).limit(1);
  return book ? (await attachVariants([book]))[0] : null;
}

export async function getRelatedStoreBooks(book: Pick<StoreBook, "id" | "category">) {
  return attachVariants(await db.select().from(storeBooks).where(and(activeBook, eq(storeBooks.category, book.category), sql`${storeBooks.id} <> ${book.id}`)).orderBy(desc(storeBooks.isFeatured), asc(storeBooks.title)).limit(4));
}

export async function getActiveStoreBooks() { return attachVariants(await db.select().from(storeBooks).where(activeBook).orderBy(asc(storeBooks.title))); }

export async function getApprovedStoreReviews(bookId: number) {
  return db.select({ id: storeReviews.id, reviewerName: storeReviews.reviewerName, rating: storeReviews.rating, title: storeReviews.title, body: storeReviews.body, verified: storeReviews.isVerifiedPurchase, submittedAt: storeReviews.submittedAt }).from(storeReviews).where(and(eq(storeReviews.bookId, bookId), eq(storeReviews.status, "approved"))).orderBy(desc(storeReviews.isVerifiedPurchase), desc(storeReviews.submittedAt)).limit(100);
}

export async function submitStoreReview(input: { id: string; bookId: number; reviewerName: string; email: string; rating: number; title: string; body: string }, viewer: SessionUser | null, rateKey: string): Promise<StoreReviewState> {
  const reviewerName = input.reviewerName.trim(), email = input.email.trim().toLowerCase(), title = input.title.trim(), body = input.body.trim().replaceAll("\r\n", "\n");
  if (!isUuid(input.id) || !/^[a-f0-9]{64}$/.test(rateKey) || !Number.isInteger(input.bookId) || input.bookId < 1) return { error: "Refresh the page before submitting your review." };
  if (!reviewerName || reviewerName.length > 160) return { error: "Enter your name using up to 160 characters." };
  if (email && !validContactEmail(email)) return { error: "Enter a valid email address or leave it blank." };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { error: "Choose a rating from one to five stars." };
  if (title.length > 180) return { error: "Keep the review title within 180 characters." };
  if (body.length < 20 || body.length > 3000) return { error: "Write a review of 20 to 3,000 characters." };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.id}, 9043))`);
    const [existing] = await tx.select({ rateKey: storeReviews.rateKey, verified: storeReviews.isVerifiedPurchase }).from(storeReviews).where(eq(storeReviews.id, input.id)).limit(1);
    if (existing) return existing.rateKey === rateKey ? { ok: true, verified: existing.verified, message: "This review has already been received and is awaiting moderation." } : { error: "This review reference has already been used. Refresh and try again." };
    const [book] = await tx.select({ id: storeBooks.id, title: storeBooks.title }).from(storeBooks).where(and(eq(storeBooks.id, input.bookId), activeBook)).limit(1);
    if (!book) return { error: "This book is not available for review." };
    const actor = viewer ? await currentActor(tx, viewer) : null;
    const reviewEmail = actor?.email.toLowerCase() ?? (email || null);
    if (actor) {
      const [previous] = await tx.select({ id: storeReviews.id }).from(storeReviews).where(and(eq(storeReviews.bookId, book.id), eq(storeReviews.profileId, actor.profileId))).limit(1);
      if (previous) return { error: "You have already reviewed this book." };
    }
    const [recent] = await tx.select({ count: sql<number>`count(*)::int` }).from(storeReviews).where(and(eq(storeReviews.rateKey, rateKey), sql`${storeReviews.submittedAt} >= clock_timestamp() - interval '1 hour'`));
    if (recent.count >= 3) return { error: "Too many reviews were submitted recently. Please try again later." };
    const [purchased] = actor ? await tx.select({ itemId: storeOrderItems.id }).from(storeOrderItems).innerJoin(storeOrders, eq(storeOrderItems.orderId, storeOrders.id)).where(and(eq(storeOrderItems.bookId, book.id), eq(storeOrders.profileId, actor.profileId), eq(storeOrders.status, "completed"), eq(storeOrders.paymentStatus, "paid"))).orderBy(desc(storeOrders.placedAt)).limit(1) : [];
    await tx.insert(storeReviews).values({ id: input.id, bookId: book.id, profileId: actor?.profileId ?? null, orderItemId: purchased?.itemId ?? null, reviewerName, reviewerEmail: reviewEmail, rating: input.rating, title: title || null, body, isVerifiedPurchase: Boolean(purchased), rateKey });
    const recipients = await tx.select({ id: profiles.id }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).innerJoin(roles, eq(profiles.roleId, roles.id)).where(and(eq(users.isActive, true), sql`(${roles.permissions} @> '["org.manage"]'::jsonb or ${roles.slug} in ('super_admin','platform_admin'))`));
    if (recipients.length) await tx.insert(notifications).values(recipients.map((recipient) => ({ recipientId: recipient.id, type: "system" as const, title: "Book review awaiting moderation", body: `${book.title} received a ${input.rating}-star review.`, href: "/admin/store#reviews", templateKey: "store.review_submitted", dedupeKey: `store-review:${input.id}:${recipient.id}` })));
    await tx.insert(activityLogs).values({ actorId: actor?.profileId ?? null, action: "store.review_submitted", entityType: "store_review", entityId: input.id, description: `Submitted a review for ${book.title}.` });
    return { ok: true, verified: Boolean(purchased), message: purchased ? "Your verified-purchase review was received and will appear after moderation." : "Your review was received and will appear after moderation." };
  }).catch((error: unknown) => ({ error: error instanceof Error && /unique/i.test(error.message) ? "This purchase or account has already reviewed the book." : "The review could not be submitted. Please try again." }));
}

export async function createStoreOrder(input: { orderId: string; customerName: string; email: string; phone: string; deliveryMethod: string; addressLine: string; city: string; notes: string; items: StoreCartLine[] }, viewer: SessionUser | null, rateKey: string): Promise<StoreActionState> {
  const customerName = input.customerName.trim(), email = input.email.trim().toLowerCase(), phone = input.phone.trim(), addressLine = input.addressLine.trim(), city = input.city.trim(), notes = input.notes.trim();
  if (!isUuid(input.orderId) || !/^[a-f0-9]{64}$/.test(rateKey)) return { error: "Refresh checkout before placing the order." };
  if (!customerName || customerName.length > 160) return { error: "Enter a customer name of up to 160 characters." };
  if (!validContactEmail(email)) return { error: "Enter a valid email address." };
  if (!/^\+?[0-9][0-9 ()-]{6,30}$/.test(phone)) return { error: "Enter a valid contact phone number." };
  if (!DELIVERY_METHODS.includes(input.deliveryMethod as DeliveryMethod)) return { error: "Choose a valid delivery method." };
  const deliveryMethod = input.deliveryMethod as DeliveryMethod;
  if (!["pickup", "digital_delivery"].includes(deliveryMethod) && (!addressLine || addressLine.length > 300 || !city || city.length > 100)) return { error: "Enter the delivery address and city." };
  if (notes.length > 1000) return { error: "Keep order notes within 1,000 characters." };
  if (!input.items.length || input.items.length > 30) return { error: "Your cart is empty or too large." };
  if (input.items.some((line) => !Number.isInteger(line.variantId) || line.variantId < 1 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 25) || new Set(input.items.map((line) => line.variantId)).size !== input.items.length) return { error: "Your cart contains an invalid item or quantity." };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.orderId}, 9042))`);
    const [existing] = await tx.select({ id: storeOrders.id, orderNumber: storeOrders.orderNumber, totalUgx: storeOrders.totalUgx, rateKey: storeOrders.rateKey }).from(storeOrders).where(eq(storeOrders.id, input.orderId)).limit(1);
    if (existing) return existing.rateKey === rateKey ? { ok: true, orderId: existing.id, orderNumber: existing.orderNumber, totalUgx: existing.totalUgx, message: "This order has already been received." } : { error: "This checkout reference has already been used. Refresh and try again." };
    const [recent] = await tx.select({ count: sql<number>`count(*)::int` }).from(storeOrders).where(and(eq(storeOrders.rateKey, rateKey), sql`${storeOrders.placedAt} >= clock_timestamp() - interval '1 hour'`));
    if (recent.count >= 5) return { error: "Too many orders were placed recently. Please try again later or contact the team." };
    const ids = input.items.map((line) => line.variantId);
    const variants = await tx.select({ variant: storeBookVariants, book: storeBooks }).from(storeBookVariants).innerJoin(storeBooks, eq(storeBookVariants.bookId, storeBooks.id)).where(and(inArray(storeBookVariants.id, ids), eq(storeBookVariants.isActive, true), activeBook)).for("update");
    if (variants.length !== ids.length) return { error: "One or more book formats are no longer available. Refresh your cart." };
    const byId = new Map(variants.map((row) => [row.variant.id, row]));
    const hasPhysical = variants.some((row) => row.variant.deliveryKind === "physical"), hasDigital = variants.some((row) => row.variant.deliveryKind === "digital");
    if (hasDigital && (!viewer || viewer.isDemo)) return { error: "Sign in to purchase downloadable books so they can be added securely to your library." };
    if (hasPhysical && deliveryMethod === "digital_delivery") return { error: "Choose pickup or delivery for the physical books in your bag." };
    if (!hasPhysical && deliveryMethod !== "digital_delivery") return { error: "Choose digital delivery for a PDF-only order." };
    for (const line of input.items) {
      const row = byId.get(line.variantId)!;
      if (row.variant.deliveryKind === "digital" && !row.variant.downloadMediaId) return { error: `${row.book.title} is not yet ready for secure download.` };
      if (row.variant.deliveryKind === "digital" && line.quantity !== 1) return { error: "Downloadable books can only be purchased once per order." };
      if (row.variant.deliveryKind === "physical" && row.variant.inventoryCount < line.quantity) return { error: `${row.book.title} (${row.variant.label}) has only ${row.variant.inventoryCount} available.` };
    }
    const subtotalUgx = input.items.reduce((total, line) => total + byId.get(line.variantId)!.variant.priceUgx * line.quantity, 0), deliveryUgx = deliveryFeeUgx(deliveryMethod);
    const orderNumber = `PC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${input.orderId.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    await tx.insert(storeOrders).values({ id: input.orderId, orderNumber, profileId: viewer && !viewer.isDemo ? viewer.profileId : null, customerName, email, phone, deliveryMethod, paymentMethod: deliveryMethod === "pickup" ? "pay_on_pickup" : deliveryMethod === "digital_delivery" ? "manual_confirmation" : "pay_on_delivery", addressLine: ["pickup", "digital_delivery"].includes(deliveryMethod) ? null : addressLine, city: ["pickup", "digital_delivery"].includes(deliveryMethod) ? null : city, notes: notes || null, subtotalUgx, deliveryUgx, totalUgx: subtotalUgx + deliveryUgx, rateKey });
    await tx.insert(storeOrderItems).values(input.items.map((line) => { const row = byId.get(line.variantId)!; return { orderId: input.orderId, bookId: row.book.id, variantId: row.variant.id, variantLabel: row.variant.label, deliveryKind: row.variant.deliveryKind, sku: row.book.sku, title: row.book.title, authorName: row.book.authorName, format: row.variant.code, unitPriceUgx: row.variant.priceUgx, quantity: line.quantity, lineTotalUgx: row.variant.priceUgx * line.quantity }; }));
    for (const line of input.items) {
      const row = byId.get(line.variantId)!;
      if (row.variant.deliveryKind === "physical") {
        await tx.update(storeBookVariants).set({ inventoryCount: sql`${storeBookVariants.inventoryCount} - ${line.quantity}`, updatedAt: new Date() }).where(eq(storeBookVariants.id, row.variant.id));
        await tx.update(storeBooks).set({ inventoryCount: sql`greatest(0, ${storeBooks.inventoryCount} - ${line.quantity})`, updatedAt: new Date() }).where(eq(storeBooks.id, row.book.id));
      }
    }
    const recipients = await tx.select({ id: profiles.id }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).innerJoin(roles, eq(profiles.roleId, roles.id)).where(and(eq(users.isActive, true), sql`(${roles.permissions} @> '["org.manage"]'::jsonb or ${roles.slug} in ('super_admin','platform_admin'))`));
    if (recipients.length) await tx.insert(notifications).values(recipients.map((recipient) => ({ recipientId: recipient.id, type: "system" as const, title: `New bookstore order ${orderNumber}`, body: `${customerName} placed an order for ${input.items.reduce((sum, line) => sum + line.quantity, 0)} book(s).`, href: "/admin/store", templateKey: "store.order_placed", dedupeKey: `store-order:${input.orderId}:${recipient.id}` })));
    await tx.insert(activityLogs).values({ actorId: viewer && !viewer.isDemo ? viewer.profileId : null, action: "store.order_placed", entityType: "store_order", entityId: input.orderId, description: `Placed bookstore order ${orderNumber}.` });
    const message = deliveryMethod === "digital_delivery" ? "Order received. After payment is confirmed, the PDF will unlock in your bookstore library." : deliveryMethod === "pickup" ? "Order received. The team will confirm when it is ready for pickup." : "Order received. The team will confirm delivery by phone or email.";
    return { ok: true, orderId: input.orderId, orderNumber, totalUgx: subtotalUgx + deliveryUgx, message };
  });
}

async function authorizedStoreActor(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], viewer: SessionUser | null) { const actor = await currentActor(tx, viewer); return actor && can(actor, "org.manage") ? actor : null; }

export async function getStoreAdmin(viewer: SessionUser | null) {
  return db.transaction(async (tx) => {
    if (!(await authorizedStoreActor(tx, viewer))) return null;
    const [books, variants, orders, reviews] = await Promise.all([
      tx.select().from(storeBooks).orderBy(asc(storeBooks.status), asc(storeBooks.title)),
      tx.select().from(storeBookVariants).orderBy(asc(storeBookVariants.bookId), asc(storeBookVariants.sortOrder)),
      tx.select({ order: storeOrders, itemCount: sql<number>`coalesce(sum(${storeOrderItems.quantity}), 0)::int` }).from(storeOrders).leftJoin(storeOrderItems, eq(storeOrderItems.orderId, storeOrders.id)).groupBy(storeOrders.id).orderBy(desc(storeOrders.placedAt)).limit(100),
      tx.select({ review: storeReviews, bookTitle: storeBooks.title }).from(storeReviews).innerJoin(storeBooks, eq(storeReviews.bookId, storeBooks.id)).orderBy(asc(storeReviews.status), desc(storeReviews.submittedAt)).limit(100),
    ]);
    const byBook = new Map<number, StoreVariant[]>(); for (const variant of variants) byBook.set(variant.bookId, [...(byBook.get(variant.bookId) ?? []), variant]);
    return { books: books.map((book) => ({ ...book, variants: byBook.get(book.id) ?? [] })), orders, reviews };
  });
}

function parseVariantInputs(input: Record<string, string>) {
  const variants = STORE_VARIANT_CODES.map((code) => { const priceUgx = Number(input[`variant.${code}.priceUgx`]), compareAtPriceUgx = input[`variant.${code}.compareAtPriceUgx`] ? Number(input[`variant.${code}.compareAtPriceUgx`]) : null, inventoryCount = code === "digital_pdf" ? 0 : Number(input[`variant.${code}.inventoryCount`]); return { code, ...variantConfig[code], priceUgx, compareAtPriceUgx, inventoryCount, downloadMediaId: code === "digital_pdf" ? input[`variant.${code}.downloadMediaId`]?.trim() || null : null, isActive: input[`variant.${code}.isActive`] === "on" }; });
  if (variants.some((variant) => !Number.isInteger(variant.priceUgx) || variant.priceUgx < 0 || !Number.isInteger(variant.inventoryCount) || variant.inventoryCount < 0 || (variant.compareAtPriceUgx !== null && (!Number.isInteger(variant.compareAtPriceUgx) || variant.compareAtPriceUgx < variant.priceUgx)))) return null;
  if (!variants.some((variant) => variant.isActive)) return null;
  const digital = variants.find((variant) => variant.code === "digital_pdf")!; if (digital.isActive && (!digital.downloadMediaId || !isUuid(digital.downloadMediaId))) return null;
  return variants;
}

export async function saveStoreBook(input: Record<string, string>, viewer: SessionUser | null): Promise<StoreActionState> {
  const id = Number(input.id || 0), title = input.title?.trim(), slug = input.slug?.trim().toLowerCase(), sku = input.sku?.trim().toUpperCase(), authorName = input.authorName?.trim(), status = input.status, coverTone = input.coverTone, pageCount = Number(input.pageCount), coverMediaId = input.coverMediaId?.trim() || null, variants = parseVariantInputs(input);
  if (!title || title.length > 220 || !authorName || authorName.length > 180) return { error: "Enter a valid title and author." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Z0-9][A-Z0-9-]{2,47}$/.test(sku)) return { error: "Use a lowercase hyphenated slug and an uppercase SKU." };
  if (input.isbn13?.trim() && !/^[0-9]{13}$/.test(input.isbn13.trim())) return { error: "ISBN-13 must contain exactly 13 digits." };
  if (!BOOK_STATUSES.includes(status as typeof BOOK_STATUSES[number]) || !COVER_TONES.includes(coverTone as typeof COVER_TONES[number])) return { error: "Choose valid catalogue options." };
  if (!Number.isInteger(pageCount) || pageCount < 0 || !variants) return { error: "Activate at least one format and enter valid whole-number prices and stock." };
  if (coverMediaId && !isUuid(coverMediaId)) return { error: "Choose a valid cover image from the media library." };
  const activeVariants = variants.filter((variant) => variant.isActive), defaultVariant = activeVariants.find((variant) => variant.deliveryKind === "physical") ?? activeVariants[0];
  const values = { title, slug, sku, authorName, status, format: defaultVariant.code === "digital_pdf" ? "workbook" : defaultVariant.code, coverTone, priceUgx: Math.min(...activeVariants.map((variant) => variant.priceUgx)), compareAtPriceUgx: defaultVariant.compareAtPriceUgx, inventoryCount: activeVariants.filter((variant) => variant.deliveryKind === "physical").reduce((sum, variant) => sum + variant.inventoryCount, 0), pageCount, subtitle: input.subtitle?.trim() || null, shortDescription: input.shortDescription?.trim(), description: input.description?.trim(), category: input.category?.trim(), language: input.language?.trim() || "English", coverAlt: input.coverAlt?.trim() || `${title} cover`, isbn13: input.isbn13?.trim() || null, isFeatured: input.isFeatured === "on", isNew: input.isNew === "on", updatedAt: new Date(), publishedAt: status === "active" ? new Date() : null };
  if (!values.shortDescription || values.shortDescription.length > 500 || !values.description || !values.category) return { error: "Add a category and both book descriptions." };
  return db.transaction(async (tx) => {
    const actor = await authorizedStoreActor(tx, viewer); if (!actor) return { error: "Bookstore management permission required." };
    let coverUrl: string | null = null;
    if (coverMediaId) { const [cover] = await tx.select({ url: mediaAssets.url }).from(mediaAssets).where(and(eq(mediaAssets.id, coverMediaId), eq(mediaAssets.kind, "image"), eq(mediaAssets.purpose, "library"), eq(mediaAssets.state, "ready"))).limit(1); if (!cover) return { error: "Choose a ready image from the shared media library." }; coverUrl = cover.url; }
    const digital = variants.find((variant) => variant.code === "digital_pdf")!;
    if (digital.downloadMediaId) { const [document] = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.id, digital.downloadMediaId), eq(mediaAssets.kind, "document"), eq(mediaAssets.mimeType, "application/pdf"), eq(mediaAssets.purpose, "library"), eq(mediaAssets.state, "ready"))).limit(1); if (!document) return { error: "Choose a ready PDF from the shared media library." }; }
    let bookId = id;
    if (id > 0) {
      const [current] = await tx.select({ id: storeBooks.id, updatedAt: storeBooks.updatedAt }).from(storeBooks).where(eq(storeBooks.id, id)).for("update").limit(1); if (!current) return { error: "Book not found." };
      const expectedUpdatedAt = new Date(input.updatedAt); if (Number.isNaN(expectedUpdatedAt.valueOf()) || current.updatedAt.valueOf() !== expectedUpdatedAt.valueOf()) return { error: "This book or its stock changed in another window. Refresh before saving." };
      await tx.update(storeBooks).set({ ...values, coverMediaId, coverImageUrl: coverUrl }).where(eq(storeBooks.id, id));
    } else { const [book] = await tx.insert(storeBooks).values({ ...values, coverMediaId, coverImageUrl: coverUrl, lowStockThreshold: 5 }).returning({ id: storeBooks.id }); bookId = book.id; }
    for (const variant of variants) await tx.insert(storeBookVariants).values({ bookId, ...variant, isDefault: variant.code === defaultVariant.code }).onConflictDoUpdate({ target: [storeBookVariants.bookId, storeBookVariants.code], set: { label: variant.label, deliveryKind: variant.deliveryKind, priceUgx: variant.priceUgx, compareAtPriceUgx: variant.compareAtPriceUgx, inventoryCount: variant.inventoryCount, downloadMediaId: variant.downloadMediaId, isActive: variant.isActive, isDefault: variant.code === defaultVariant.code, sortOrder: variant.sortOrder, updatedAt: new Date() } });
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: id > 0 ? "store.book_updated" : "store.book_created", entityType: "store_book", entityId: String(bookId), description: `${id > 0 ? "Updated" : "Created"} bookstore title ${title}.` });
    return { ok: true, message: "Book, cover and format options updated." };
  }).catch((error: unknown) => ({ error: error instanceof Error && /unique/i.test(error.message) ? "That slug, SKU or ISBN is already in use." : "The book could not be saved." }));
}

async function recalculateBookRating(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], bookId: number) { const [stats] = await tx.select({ count: sql<number>`count(*)::int`, ratingTenths: sql<number>`coalesce(round(avg(${storeReviews.rating}) * 10), 0)::int` }).from(storeReviews).where(and(eq(storeReviews.bookId, bookId), eq(storeReviews.status, "approved"))); await tx.update(storeBooks).set({ reviewCount: stats.count, ratingTenths: stats.ratingTenths, updatedAt: new Date() }).where(eq(storeBooks.id, bookId)); }

export async function moderateStoreReview(input: { id: string; version: number; status: string }, viewer: SessionUser | null): Promise<StoreActionState> {
  if (!isUuid(input.id) || !Number.isInteger(input.version) || !["approved", "rejected"].includes(input.status)) return { error: "Choose a valid review decision." };
  return db.transaction(async (tx) => {
    const actor = await authorizedStoreActor(tx, viewer); if (!actor) return { error: "Bookstore management permission required." };
    const [review] = await tx.select().from(storeReviews).where(eq(storeReviews.id, input.id)).for("update").limit(1); if (!review) return { error: "Review not found." }; if (review.version !== input.version) return { error: "This review changed in another window. Refresh before updating it." };
    await tx.update(storeReviews).set({ status: input.status, moderatedAt: new Date(), moderatedById: actor.profileId, version: review.version + 1 }).where(eq(storeReviews.id, review.id)); await recalculateBookRating(tx, review.bookId);
    if (review.profileId) await tx.insert(notifications).values({ recipientId: review.profileId, type: "system", title: input.status === "approved" ? "Your book review is published" : "Your book review was moderated", body: input.status === "approved" ? "Thank you. Your review is now visible in the bookstore." : "Your review did not meet the bookstore publishing guidelines.", href: "/bookstore", templateKey: "store.review_moderated", dedupeKey: `store-review-moderated:${review.id}:${input.status}` });
    await tx.insert(activityLogs).values({ actorId: actor.profileId, action: `store.review_${input.status}`, entityType: "store_review", entityId: review.id, description: `${input.status === "approved" ? "Approved" : "Rejected"} a bookstore review.` }); return { ok: true, message: `Review ${input.status}.` };
  });
}

export async function updateStoreOrder(input: { id: string; version: number; status: string; paymentStatus: string }, viewer: SessionUser | null): Promise<StoreActionState> {
  if (!isUuid(input.id) || !Number.isInteger(input.version) || !ORDER_STATUSES.includes(input.status as typeof ORDER_STATUSES[number]) || !PAYMENT_STATUSES.includes(input.paymentStatus as typeof PAYMENT_STATUSES[number])) return { error: "Choose a valid order state." };
  return db.transaction(async (tx) => {
    const actor = await authorizedStoreActor(tx, viewer); if (!actor) return { error: "Bookstore management permission required." };
    const [order] = await tx.select().from(storeOrders).where(eq(storeOrders.id, input.id)).for("update").limit(1); if (!order) return { error: "Order not found." }; if (order.version !== input.version) return { error: "This order changed in another window. Refresh before updating it." }; if (order.status === "cancelled" && input.status !== "cancelled") return { error: "A cancelled order cannot be reopened; place a new order instead." }; if (input.status === "completed" && input.paymentStatus !== "paid") return { error: "Mark payment as paid before completing the order." };
    if (input.status === "cancelled" && order.status !== "cancelled") {
      const items = await tx.select({ bookId: storeOrderItems.bookId, variantId: storeOrderItems.variantId, deliveryKind: storeOrderItems.deliveryKind, quantity: storeOrderItems.quantity }).from(storeOrderItems).where(eq(storeOrderItems.orderId, order.id));
      for (const item of items) if (item.deliveryKind === "physical") { if (item.variantId) await tx.update(storeBookVariants).set({ inventoryCount: sql`${storeBookVariants.inventoryCount} + ${item.quantity}`, updatedAt: new Date() }).where(eq(storeBookVariants.id, item.variantId)); if (item.bookId) await tx.update(storeBooks).set({ inventoryCount: sql`${storeBooks.inventoryCount} + ${item.quantity}`, updatedAt: new Date() }).where(eq(storeBooks.id, item.bookId)); }
    }
    await tx.update(storeOrders).set({ status: input.status, paymentStatus: input.paymentStatus, version: order.version + 1, updatedAt: new Date(), completedAt: input.status === "completed" ? new Date() : null, cancelledAt: input.status === "cancelled" ? new Date() : null }).where(eq(storeOrders.id, input.id)); await tx.insert(activityLogs).values({ actorId: actor.profileId, action: "store.order_updated", entityType: "store_order", entityId: input.id, description: `Changed ${order.orderNumber} from ${order.status}/${order.paymentStatus} to ${input.status}/${input.paymentStatus}.` }); return { ok: true, message: input.status === "completed" && order.deliveryMethod === "digital_delivery" ? "Order completed. The PDF is now unlocked in the customer's bookstore library." : "Order updated." };
  });
}

export async function getStoreDigitalLibrary(viewer: SessionUser | null) {
  if (!viewer || viewer.isDemo) return null;
  return db.transaction(async (tx) => { const actor = await currentActor(tx, viewer); if (!actor) return null; return tx.select({ orderItemId: storeOrderItems.id, orderNumber: storeOrders.orderNumber, title: storeOrderItems.title, authorName: storeOrderItems.authorName, variantLabel: storeOrderItems.variantLabel, mediaId: mediaAssets.id, fileName: mediaAssets.fileName, purchasedAt: storeOrders.placedAt }).from(storeOrderItems).innerJoin(storeOrders, eq(storeOrderItems.orderId, storeOrders.id)).innerJoin(storeBookVariants, eq(storeOrderItems.variantId, storeBookVariants.id)).innerJoin(mediaAssets, eq(storeBookVariants.downloadMediaId, mediaAssets.id)).where(and(eq(storeOrders.profileId, actor.profileId), eq(storeOrders.status, "completed"), eq(storeOrders.paymentStatus, "paid"), eq(storeOrderItems.deliveryKind, "digital"), eq(mediaAssets.state, "ready"))).orderBy(desc(storeOrders.placedAt)); });
}
