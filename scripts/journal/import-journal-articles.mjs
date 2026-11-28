#!/usr/bin/env node
/**
 * Load converted journal articles (scripts/journal/convert-spurl-journal.mjs) into the
 * articles table. Idempotent by slug, all-or-nothing in one transaction.
 *
 *   node scripts/journal/import-journal-articles.mjs --author "<full name>" --mode <mode> [options]
 *
 *   --mode publish     live now; Journal 01 is dated newest so the series opens the Journal
 *   --mode schedule    one article every --every days (default 7) from --start (default now),
 *                      in series order; due articles go live on the next Journal visit
 *   --mode review      submitted to the editorial review queue
 *   --mode draft       saved as drafts
 *   --author "<name>"  editorial profile credited as author (author, editor, admin, super_admin)
 *   --create-author    create that author profile if missing: an inactive account that cannot sign in
 *   --file <path>      articles JSON (default scripts/journal/spurl-journal-articles.json)
 *   --dry-run          report what would change, write nothing
 *   --hosted           required when DATABASE_URL is not a local database
 *
 * Articles whose slug already exists keep their status and dates; their content, category,
 * cover, tags and SEO fields are refreshed and a revision is recorded.
 */
import "../load-env.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { databaseConfig } from "../database-config.mjs";

const args = process.argv.slice(2);
const option = (name, fallback = undefined) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const mode = option("mode");
const authorName = option("author");
const file = resolve(option("file", "scripts/journal/spurl-journal-articles.json"));
const everyDays = Number(option("every", "7"));
const start = option("start") ? new Date(option("start")) : new Date();
const dryRun = has("dry-run");

if (!["publish", "schedule", "review", "draft"].includes(mode ?? "") || !authorName) {
  console.error('Usage: node scripts/journal/import-journal-articles.mjs --author "<full name>" --mode publish|schedule|review|draft [--create-author] [--dry-run] [--hosted]');
  process.exit(1);
}
if (Number.isNaN(start.getTime()) || !(everyDays > 0)) {
  console.error("--start must be a date and --every a positive number of days.");
  process.exit(1);
}

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL is missing.");
const host = new URL(connection).hostname;
const local = ["127.0.0.1", "localhost"].includes(host);
if (!local && !has("hosted")) {
  console.error(`DATABASE_URL points at ${host}. Add --hosted to write to that database.`);
  process.exit(1);
}

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const { series = "Journal", articles } = JSON.parse(readFileSync(file, "utf8"));
const ordered = [...articles].sort((a, b) => a.number - b.number);

const client = new pg.Client(databaseConfig(process.env));
await client.connect();
const summary = { created: [], updated: [], tagsCreated: 0, authorCreated: false };
try {
  await client.query("begin");

  /* Author */
  let [author] = (
    await client.query(
      `select p.id, p.full_name from profiles p join roles r on r.id = p.role_id
        where lower(p.full_name) = lower($1) and r.slug in ('author', 'editor', 'admin', 'super_admin')`,
      [authorName],
    )
  ).rows;
  if (!author && has("create-author")) {
    const slug = slugify(authorName);
    const [role] = (await client.query("select id from roles where slug = 'author'")).rows;
    if (!role) throw new Error("The author role does not exist.");
    const [user] = (
      await client.query(
        "insert into users (email, password_hash, is_active) values ($1, $2, false) returning id",
        [`${slug}@authors.invalid`, `disabled:${randomBytes(24).toString("hex")}`],
      )
    ).rows;
    [author] = (
      await client.query(
        "insert into profiles (user_id, role_id, full_name, slug, title) values ($1, $2, $3, $4, 'Editorial team') returning id, full_name",
        [user.id, role.id, authorName, slug],
      )
    ).rows;
    summary.authorCreated = true;
  }
  if (!author) throw new Error(`No editorial profile named "${authorName}". Use --create-author to create a non-login author profile.`);

  /* Categories and tags */
  const categories = new Map((await client.query("select id, slug from categories")).rows.map((row) => [row.slug, row.id]));
  const tagIds = new Map();
  for (const name of new Set(ordered.flatMap((article) => article.tags))) {
    const slug = slugify(name);
    let [tag] = (await client.query("select id from tags where slug = $1 or lower(name) = lower($2) order by (slug = $1) desc limit 1", [slug, name])).rows;
    if (!tag) {
      [tag] = (await client.query("insert into tags (slug, name) values ($1, $2) returning id", [slug, name])).rows;
      summary.tagsCreated += 1;
    }
    tagIds.set(name, tag.id);
  }

  /* Articles */
  const now = new Date();
  for (const article of ordered) {
    const categoryId = categories.get(article.categorySlug);
    if (!categoryId) throw new Error(`${article.slug}: unknown category "${article.categorySlug}".`);
    const fields = [
      article.title,
      article.excerpt,
      article.body,
      categoryId,
      article.coverImageUrl,
      article.coverAlt,
      article.readingMinutes,
      article.seoTitle,
      article.seoDescription,
    ];
    const [existing] = (await client.query("select id from articles where slug = $1", [article.slug])).rows;
    let id;
    let status = null;
    if (existing) {
      id = existing.id;
      await client.query(
        `update articles set title = $2, excerpt = $3, body = $4, category_id = $5, cover_image_url = $6, cover_alt = $7,
           reading_minutes = $8, seo_title = $9, seo_description = $10, updated_at = now() where id = $1`,
        [id, ...fields],
      );
      summary.updated.push(article.slug);
    } else {
      const position = article.number - ordered[0].number;
      status = { publish: "published", schedule: "scheduled", review: "submitted", draft: "draft" }[mode];
      const publishedAt = mode === "publish" ? new Date(now.getTime() - position * 60_000) : null;
      const scheduledFor = mode === "schedule" ? new Date(start.getTime() + position * everyDays * 86_400_000) : null;
      [{ id }] = (
        await client.query(
          `insert into articles (slug, title, excerpt, body, category_id, cover_image_url, cover_alt, reading_minutes,
             seo_title, seo_description, author_id, status, published_at, scheduled_for)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning id`,
          [article.slug, ...fields, author.id, status, publishedAt, scheduledFor],
        )
      ).rows;
      const action = { publish: "published", schedule: "scheduled", review: "submitted" }[mode];
      if (action) {
        await client.query(
          "insert into article_reviews (article_id, action, from_status, to_status, comment) values ($1, $2, null, $3, $4)",
          [id, action, status, `Imported from ${series} ${String(article.number).padStart(2, "0")} (${article.sourceFile}).`],
        );
      }
      summary.created.push(`${article.slug} (${status}${scheduledFor ? ` ${scheduledFor.toISOString().slice(0, 10)}` : ""})`);
    }
    await client.query("delete from article_tags where article_id = $1", [id]);
    for (const name of article.tags) {
      await client.query("insert into article_tags (article_id, tag_id) values ($1, $2) on conflict do nothing", [id, tagIds.get(name)]);
    }
    const [{ next }] = (await client.query("select coalesce(max(revision_number), 0) + 1 as next from article_revisions where article_id = $1", [id])).rows;
    await client.query(
      "insert into article_revisions (article_id, editor_id, title, body, revision_number, change_note) values ($1, $2, $3, $4, $5, $6)",
      [id, author.id, article.title, article.body, next, `${existing ? "Refreshed" : "Imported"} from ${article.sourceFile}`],
    );
  }

  await client.query(
    "insert into activity_logs (actor_id, action, entity_type, entity_id, description) values (null, 'article.imported', 'article', null, $1)",
    [`${series}: ${summary.created.length} articles created (${mode}), ${summary.updated.length} refreshed, credited to ${author.full_name}.`],
  );

  if (dryRun) await client.query("rollback");
  else await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

console.log(`${dryRun ? "[dry run, nothing written] " : ""}${host}${local ? " (local)" : ""}`);
if (summary.authorCreated) console.log(`Created non-login author profile "${authorName}".`);
console.log(`Created ${summary.created.length}:`);
for (const line of summary.created) console.log(`  + ${line}`);
console.log(`Refreshed ${summary.updated.length}:`);
for (const line of summary.updated) console.log(`  ~ ${line}`);
console.log(`New tags: ${summary.tagsCreated}`);
