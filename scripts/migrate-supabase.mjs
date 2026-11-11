import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { databaseConfig } from "./database-config.mjs";

const directory = resolve("supabase/migrations");
const identifier = (name) => `"${name.replaceAll('"', '""')}"`;
export const sqlDigest = (sql) => createHash("sha256").update(sql.replaceAll("\r\n", "\n")).digest("hex");

export function readMigrations() {
  return readdirSync(directory).filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort().map((file) => {
    const sql = readFileSync(resolve(directory, file), "utf8");
    if (!sql.trim()) throw new Error(`Migration is empty: ${file}`);
    return { file, version: file.slice(0, 14), name: file.slice(15, -4), sql };
  });
}

export function pendingMigrations(files, history) {
  const recorded = new Map(history.map((entry) => [entry.version, entry]));
  const known = new Set(files.map((file) => file.version));
  for (const entry of history) if (!known.has(entry.version)) throw new Error(`Database has an unknown migration: ${entry.version}`);
  for (const file of files) {
    const existing = recorded.get(file.version);
    if (existing && sqlDigest((existing.statements ?? []).join("\n")) !== sqlDigest(file.sql)) throw new Error(`Applied migration was modified: ${file.file}`);
    if (!existing && history.some((entry) => entry.version > file.version)) throw new Error(`Migration is out of order: ${file.file}`);
  }
  return files.filter((file) => !recorded.has(file.version));
}

async function backup(client) {
  await client.query("begin isolation level repeatable read read only");
  try {
    const tables = (await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map((row) => row.tablename);
    const columns = (await client.query("select table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position")).rows;
    const foreignKeys = (await client.query("select child.relname as child,parent.relname as parent from pg_constraint c join pg_class child on child.oid=c.conrelid join pg_namespace n on n.oid=child.relnamespace join pg_class parent on parent.oid=c.confrelid where c.contype='f' and n.nspname='public'")).rows;
    const constraints = (await client.query("select c.conrelid::regclass::text as table_name,c.conname,pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' order by table_name,c.conname")).rows;
    const indexes = (await client.query("select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname")).rows;
    const sequences = (await client.query("select sequencename,last_value::text from pg_sequences where schemaname='public'")).rows;
    const data = {}, recordCounts = {};
    for (const table of tables) {
      data[table] = (await client.query(`select coalesce(json_agg(row_to_json(t)), '[]'::json) as rows from public.${identifier(table)} t`)).rows[0].rows;
      recordCounts[table] = data[table].length;
    }
    const snapshot = { format: "purpose-course-postgres-data-snapshot-v1", createdAt: new Date().toISOString(), source: "Supabase before incremental migration", columns, foreignKeys, constraints, indexes, sequences, recordCounts, data };
    const contents = JSON.stringify(snapshot), checksum = sqlDigest(contents);
    mkdirSync(".local/backups", { recursive: true });
    const path = resolve(`.local/backups/supabase-before-migration-${snapshot.createdAt.replaceAll(/[:.]/g, "-")}.json`);
    writeFileSync(path, contents, { mode: 0o600 });
    writeFileSync(`${path}.sha256`, checksum + "\n", { mode: 0o600 });
    writeFileSync(`${path}.target-schema.ts`, readFileSync("src/db/schema.ts"));
    if (sqlDigest(readFileSync(path, "utf8")) !== checksum) throw new Error("Backup checksum verification failed.");
    await client.query("commit");
    return { path, checksum, tables: tables.length, records: Object.values(recordCounts).reduce((sum, count) => sum + count, 0) };
  } catch (error) { await client.query("rollback"); throw error; }
}

export async function applyMigrations(client, files) {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(725104, 2)");
    await client.query("set local lock_timeout = '10s'");
    const history = (await client.query("select version,name,statements from supabase_migrations.schema_migrations order by version")).rows;
    const pending = pendingMigrations(files, history);
    for (const file of pending) {
      await client.query(file.sql);
      await client.query("insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)", [file.version, [file.sql], file.name]);
    }
    const insecure = (await client.query("select tablename from pg_tables where schemaname='public' and not rowsecurity")).rows;
    if (insecure.length) throw new Error("Migration left application tables without RLS.");
    const exposed = (await client.query("select tablename from pg_tables where schemaname='public' and (has_table_privilege('anon',format('public.%I',tablename),'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',format('public.%I',tablename),'SELECT,INSERT,UPDATE,DELETE'))")).rows;
    if (exposed.length) throw new Error("Migration exposed application tables to a public API role.");
    await client.query("commit");
    return pending.map((file) => file.file);
  } catch (error) { await client.query("rollback"); throw error; }
}

async function main() {
  const action = process.argv[2] ?? "plan";
  if (!["plan", "apply"].includes(action)) throw new Error("Use plan or apply.");
  const env = dotenv.parse(readFileSync(".env.supabase.local"));
  const endpoint = new URL(env.NEXT_PUBLIC_SUPABASE_URL), uri = new URL(env.DATABASE_URL);
  const ref = endpoint.hostname.split(".")[0];
  if (!endpoint.hostname.endsWith(".supabase.co") || !decodeURIComponent(uri.username).endsWith(`.${ref}`) || !uri.hostname.endsWith(".pooler.supabase.com") || uri.port !== "5432") throw new Error("Use the matching project's Supabase Session pooler URI.");
  env.DATABASE_SSL_CA = readFileSync(".local/certs/supabase-ca-2021.crt", "utf8");
  const client = new pg.Client({ ...databaseConfig(env), statement_timeout: 90000, application_name: "purpose-incremental-migration" });
  await client.connect();
  try {
    if (!client.connection.stream.authorized) throw new Error("Verified database TLS is required.");
    const files = readMigrations();
    const history = (await client.query("select version,name,statements from supabase_migrations.schema_migrations order by version")).rows;
    if (history.length < 2) throw new Error("The initial verified Supabase import must be completed first.");
    const pending = pendingMigrations(files, history);
    if (action === "plan" || pending.length === 0) { console.log(JSON.stringify({ target: ref, pending: pending.map((file) => file.file), applied: [], tlsVerified: true })); return; }
    const saved = await backup(client);
    const applied = await applyMigrations(client, files);
    console.log(JSON.stringify({ target: ref, applied, backup: saved, tlsVerified: true }));
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
