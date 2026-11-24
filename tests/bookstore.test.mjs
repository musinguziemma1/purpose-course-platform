import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const key = randomUUID();
const actors = {};
const orderIds = [];
let bookstore, helpers, client, pool, books;
const rateKey = () => randomBytes(32).toString("hex");
const orderInput = (overrides = {}) => ({ orderId: randomUUID(), customerName: "Bookstore fixture", email: `${key}@example.invalid`, phone: "+256 700 000 000", deliveryMethod: "pickup", addressLine: "", city: "", notes: "Integration fixture", items: [{ bookId: books[0].id, quantity: 1 }], ...overrides });

before(async () => {
  const env = dotenv.parse(readFileSync(".env"));
  const uri = new URL(env.DATABASE_URL);
  assert.ok(uri.hostname === "127.0.0.1" && uri.port === "54329", "Bookstore fixtures require project-local PostgreSQL.");
  Object.assign(process.env, { DATABASE_URL: env.DATABASE_URL, CONTACT_RATE_LIMIT_SECRET: randomBytes(32).toString("hex") });
  bookstore = await import("../src/db/bookstore.ts");
  helpers = await import("../src/lib/bookstore.ts");
  pool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  books = (await client.query("select id,title,inventory_count from store_books where status='active' order by id limit 2")).rows;
  assert.equal(books.length, 2);
  for (const [name, slug] of [["admin", "super_admin"], ["learner", "student"]]) {
    const userId = (await client.query("insert into users(email,password_hash,is_active) values($1,'unused',true) returning id", [`${key}-${name}@example.invalid`])).rows[0].id;
    const role = (await client.query("select * from roles where slug=$1", [slug])).rows[0];
    const profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) values($1,$2,$3,$3) returning id", [userId, role.id, `${key}-${name}`])).rows[0].id;
    actors[name] = { profileId, userId, email: `${key}-${name}@example.invalid`, fullName: name, roleSlug: slug, permissions: role.permissions };
  }
});

test("cart parsing, delivery pricing and trusted rate keys fail closed", () => {
  assert.deepEqual(helpers.parseCartLines(JSON.stringify([{ bookId: 3, quantity: 2 }, { bookId: 3, quantity: 1 }])), [{ bookId: 3, quantity: 3 }]);
  for (const value of ["not-json", "[]", JSON.stringify([{ bookId: 0, quantity: 1 }]), JSON.stringify([{ bookId: 1, quantity: 26 }])]) assert.equal(helpers.parseCartLines(value), null);
  assert.equal(helpers.deliveryFeeUgx("pickup"), 0);
  assert.equal(helpers.deliveryFeeUgx("kampala_delivery"), 10000);
  assert.equal(helpers.deliveryFeeUgx("uganda_delivery"), 15000);
  const original = process.env.VERCEL; process.env.VERCEL = "1";
  try {
    const first = helpers.storeRateKey(new Headers({ "x-forwarded-for": "192.0.2.10" }));
    assert.equal(first.length, 64); assert.ok(!first.includes("192.0.2.10"));
    assert.equal(first, helpers.storeRateKey(new Headers({ "x-forwarded-for": "192.0.2.10" })));
    assert.throws(() => helpers.storeRateKey(new Headers({ "x-forwarded-for": "forged" })), /Trusted client/);
  } finally { if (original === undefined) delete process.env.VERCEL; else process.env.VERCEL = original; }
});

test("invalid checkout input persists no order", async () => {
  for (const overrides of [{ customerName: "" }, { email: "invalid" }, { phone: "123" }, { deliveryMethod: "drone" }, { deliveryMethod: "uganda_delivery", addressLine: "", city: "" }, { orderId: "invalid" }]) {
    const input = orderInput(overrides); const result = await bookstore.createStoreOrder(input, null, rateKey()); assert.ok(result.error);
    if (/^[a-f0-9-]{36}$/i.test(input.orderId)) assert.equal((await client.query("select 1 from store_orders where id=$1", [input.orderId])).rowCount, 0);
  }
});

test("order placement snapshots prices, reserves stock and is idempotent", async () => {
  const input = orderInput({ items: [{ bookId: books[0].id, quantity: 2 }, { bookId: books[1].id, quantity: 1 }] }); orderIds.push(input.orderId);
  const rate = rateKey(); const results = await Promise.all(Array.from({ length: 3 }, () => bookstore.createStoreOrder(input, actors.learner, rate)));
  assert.ok(results.every((result) => result.ok)); assert.equal(new Set(results.map((result) => result.orderNumber)).size, 1);
  const order = (await client.query("select * from store_orders where id=$1", [input.orderId])).rows[0];
  const items = (await client.query("select * from store_order_items where order_id=$1 order by book_id", [input.orderId])).rows;
  assert.equal(items.length, 2); assert.equal(order.total_ugx, order.subtotal_ugx); assert.equal(order.payment_method, "pay_on_pickup"); assert.equal(order.profile_id, actors.learner.profileId);
  assert.equal(items.reduce((sum, item) => sum + item.line_total_ugx, 0), order.subtotal_ugx);
  assert.equal(Number((await client.query("select inventory_count from store_books where id=$1", [books[0].id])).rows[0].inventory_count), books[0].inventory_count - 2);
  assert.equal((await client.query("select * from activity_logs where entity_id=$1 and action='store.order_placed'", [input.orderId])).rowCount, 1);
  assert.ok((await client.query("select * from notifications where dedupe_key like $1", [`store-order:${input.orderId}:%`])).rowCount >= 1);
});

test("row locks prevent concurrent orders from overselling the last copy", async () => {
  await client.query("update store_books set inventory_count=1 where id=$1", [books[1].id]);
  const first = orderInput({ orderId: randomUUID(), items: [{ bookId: books[1].id, quantity: 1 }] });
  const second = orderInput({ orderId: randomUUID(), items: [{ bookId: books[1].id, quantity: 1 }] });
  orderIds.push(first.orderId, second.orderId);
  const results = await Promise.all([bookstore.createStoreOrder(first, null, rateKey()), bookstore.createStoreOrder(second, null, rateKey())]);
  assert.equal(results.filter((result) => result.ok).length, 1); assert.equal(results.filter((result) => result.error).length, 1);
  assert.equal(Number((await client.query("select inventory_count from store_books where id=$1", [books[1].id])).rows[0].inventory_count), 0);
  assert.equal((await client.query("select * from store_orders where id=any($1::uuid[])", [[first.orderId, second.orderId]])).rowCount, 1);
});

test("staff authorization, optimistic updates and cancellation restocking are enforced", async () => {
  assert.equal(await bookstore.getStoreAdmin(null), null); assert.equal(await bookstore.getStoreAdmin(actors.learner), null); assert.ok(await bookstore.getStoreAdmin(actors.admin));
  const id = orderIds[0];
  assert.match((await bookstore.updateStoreOrder({ id, version: 0, status: "cancelled", paymentStatus: "pending" }, actors.learner)).error, /permission/);
  const beforeStock = Number((await client.query("select inventory_count from store_books where id=$1", [books[0].id])).rows[0].inventory_count);
  assert.ok((await bookstore.updateStoreOrder({ id, version: 0, status: "cancelled", paymentStatus: "pending" }, actors.admin)).ok);
  assert.equal(Number((await client.query("select inventory_count from store_books where id=$1", [books[0].id])).rows[0].inventory_count), beforeStock + 2);
  assert.match((await bookstore.updateStoreOrder({ id, version: 0, status: "confirmed", paymentStatus: "pending" }, actors.admin)).error, /another window/);
  assert.match((await bookstore.updateStoreOrder({ id, version: 1, status: "confirmed", paymentStatus: "pending" }, actors.admin)).error, /cannot be reopened/);
});

test("a late audit failure rolls back the order, notifications and stock reservation", async () => {
  const input = orderInput(); orderIds.push(input.orderId); const trigger = `store_fixture_${key.replaceAll("-", "")}`;
  const beforeStock = Number((await client.query("select inventory_count from store_books where id=$1", [books[0].id])).rows[0].inventory_count);
  await client.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin if NEW.entity_id='${input.orderId}' then raise exception 'forced store failure'; end if; return NEW; end $$; create trigger ${trigger} before insert on activity_logs for each row execute function ${trigger}()`);
  try { await assert.rejects(() => bookstore.createStoreOrder(input, null, rateKey()), (error) => /forced store failure/.test(String(error.cause))); }
  finally { await client.query(`drop trigger ${trigger} on activity_logs; drop function ${trigger}()`); }
  assert.equal((await client.query("select * from store_orders where id=$1", [input.orderId])).rowCount, 0);
  assert.equal((await client.query("select * from notifications where dedupe_key like $1", [`store-order:${input.orderId}:%`])).rowCount, 0);
  assert.equal(Number((await client.query("select inventory_count from store_books where id=$1", [books[0].id])).rows[0].inventory_count), beforeStock);
});

test("migration secures every bookstore table from the public Data API roles", () => {
  const sql = readFileSync("supabase/migrations/20261124065745_bookstore_commerce.sql", "utf8");
  for (const table of ["store_books", "store_orders", "store_order_items"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`create policy ${table}_backend_access`, "i"));
  }
  assert.match(sql, /revoke all on table[\s\S]+from public, anon, authenticated/i);
  assert.match(sql, /store_orders_payment_delivery_match_check/i);
});

after(async () => {
  if (client) {
    await client.query("delete from store_orders where id=any($1::uuid[])", [orderIds]);
    await client.query("delete from notifications where dedupe_key like 'store-order:%' and dedupe_key similar to $1", [`store-order:(${orderIds.join("|")}):%`]);
    await client.query("delete from activity_logs where entity_id=any($1::text[])", [orderIds]);
    for (const book of books ?? []) await client.query("update store_books set inventory_count=$2 where id=$1", [book.id, book.inventory_count]);
    await client.query("delete from users where email like $1", [`${key}-%`]);
    await client.end();
  }
  await pool?.end();
});
