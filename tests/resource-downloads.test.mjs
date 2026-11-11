import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

const key = randomUUID(), ids = [];
let client, downloads, files, handler, pool;
async function fixture(url) {
  const slug = key + "-" + ids.length;
  const item = (await client.query("insert into resources(slug,title,file_url,download_count) values($1,'Resource verification',$2,0) returning *", [slug, url])).rows[0];
  ids.push(item.id); return item;
}
before(async () => {
  const env = dotenv.parse(readFileSync(".env")), uri = new URL(env.DATABASE_URL);
  assert.ok(uri.hostname === "127.0.0.1" && uri.port === "54329", "Resource fixtures require project-local PostgreSQL.");
  process.env.DATABASE_URL = env.DATABASE_URL;
  downloads = await import("../src/db/resource-downloads.ts"); files = await import("../src/lib/resource-files.ts"); handler = await import("../src/app/api/resources/[slug]/download/route.ts"); pool = (await import("../src/db/index.ts")).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
});

test("resource targets reject unsafe or unshipped local files and accept the shipped PDFs", () => {
  for (const entry of Object.values(files.STARTER_RESOURCES)) assert.equal(files.resourceFileTarget(entry.url), entry.url);
  for (const value of [null, "", "javascript:alert(1)", "http://example.invalid/file.pdf", "//example.invalid/file.pdf", "/resources/../../.env", "/api/resources/loop/download", "/resources/missing.pdf", "https://user:password@example.invalid/file.pdf", "https://example.invalid/file.pdf\n"]) assert.equal(files.resourceFileTarget(value), null);
  assert.equal(files.resourceFileTarget("https://example.invalid/storage/resource.pdf"), "https://example.invalid/storage/resource.pdf");
});

test("missing and invalid resources return unavailable without fabricating files or increasing metrics", async () => {
  assert.equal(await downloads.beginResourceDownload(key + "-missing"), null);
  for (const target of [null, "/resources/missing.pdf", "javascript:alert(1)"]) {
    const item = await fixture(target);
    const response = await handler.GET(new Request("https://purpose.example.invalid/api/resources/fixture/download"), { params: Promise.resolve({ slug: item.slug }) });
    assert.equal(response.status, 404); assert.match(await response.text(), /not available/);
    assert.equal((await client.query("select * from resource_downloads where resource_id=$1", [item.id])).rowCount, 0);
    assert.equal((await client.query("select download_count from resources where id=$1", [item.id])).rows[0].download_count, 0);
  }
});

test("concurrent valid requests atomically record matching counters and omit email query data", async () => {
  const item = await fixture("/resources/gifting-audit-worksheet.pdf");
  await Promise.all(Array.from({ length: 5 }, () => downloads.beginResourceDownload(item.slug)));
  const response = await handler.GET(new Request("https://purpose.example.invalid/api/resources/fixture/download?email=private@example.invalid"), { params: Promise.resolve({ slug: item.slug }) });
  assert.equal(response.status, 302); assert.equal(response.headers.get("location"), "/resources/gifting-audit-worksheet.pdf"); assert.equal(response.headers.get("cache-control"), "no-store");
  const events = (await client.query("select * from resource_downloads where resource_id=$1", [item.id])).rows;
  assert.equal(events.length, 6); assert.ok(events.every((event) => event.email === null));
  assert.equal((await client.query("select download_count from resources where id=$1", [item.id])).rows[0].download_count, 6);
});

test("late counter failure rolls back the download request", async () => {
  const item = await fixture("/resources/five-principles-overview.pdf"), trigger = "resource_fixture_" + key.replaceAll("-", "");
  await client.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin if NEW.id = ${item.id} then raise exception 'forced resource failure'; end if; return NEW; end $$; create trigger ${trigger} before update on resources for each row execute function ${trigger}()`);
  try { await assert.rejects(() => downloads.beginResourceDownload(item.slug), (error) => /forced resource failure/.test(String(error.cause))); }
  finally { await client.query(`drop trigger ${trigger} on resources; drop function ${trigger}()`); }
  assert.equal((await client.query("select * from resource_downloads where resource_id=$1", [item.id])).rowCount, 0);
});

test("the starter migration preserves a previously uploaded file and its metrics", async () => {
  await client.query("begin");
  try {
    await client.query("update resources set file_url='https://example.invalid/approved-overview.pdf',download_count=17 where slug='five-principles-overview'");
    await client.query(readFileSync("supabase/migrations/20261111210602_connect_starter_resources.sql", "utf8"));
    const item = (await client.query("select file_url,download_count from resources where slug='five-principles-overview'")).rows[0];
    assert.equal(item.file_url, "https://example.invalid/approved-overview.pdf"); assert.equal(item.download_count, 17);
  } finally { await client.query("rollback"); }
});

after(async () => { if (client) { await client.query("delete from resources where id=any($1::integer[])", [ids]); await client.end(); } await pool?.end(); });
