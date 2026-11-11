import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { databaseConfig } from "./database-config.mjs";

const action = process.argv[2] ?? "check";
const identifier = (value) => `"${value.replaceAll('"', '""')}"`;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const parseFile = (path) => dotenv.parse(readFileSync(path));
const migrationDirectory = resolve("supabase/migrations");
const statePath = resolve(".local/supabase-migration.json");
const credentialsPath = resolve(".local/supabase-runtime.env");

function adminEnvironment() {
  const env = parseFile(".env.supabase.local");
  const endpoint = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const ref = endpoint.hostname.split(".")[0];
  const database = new URL(env.DATABASE_URL);
  if (!endpoint.hostname.endsWith(".supabase.co") || !decodeURIComponent(database.username).endsWith(`.${ref}`) || !database.hostname.endsWith(".pooler.supabase.com") || database.port !== "5432") {
    throw new Error("Use the matching project's Supabase Session pooler URI on port 5432.");
  }
  return { ...env, DATABASE_SSL_CA: readFileSync(".local/certs/supabase-ca-2021.crt", "utf8") };
}

async function connect(env, administrator = false) {
  const client = new pg.Client({
    ...databaseConfig(env),
    statement_timeout: administrator ? 90000 : 15000,
    application_name: administrator ? "purpose-course-migration" : "purpose-course-verification",
  });
  await client.connect();
  if (!client.connection.stream.authorized) {
    await client.end();
    throw new Error("Database TLS certificate verification failed.");
  }
  return client;
}

async function tableNames(client) {
  const result = await client.query("select tablename from pg_tables where schemaname = 'public' order by tablename");
  return result.rows.map((row) => row.tablename);
}

async function snapshotSource() {
  const env = parseFile(".env");
  const url = new URL(env.DATABASE_URL);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "54329") {
    throw new Error("Migration source must be the preserved project-local database on port 54329.");
  }
  const source = new pg.Client(databaseConfig(env));
  await source.connect();
  try {
    await source.query("begin isolation level repeatable read read only");
    const tables = await tableNames(source);
    if (!tables.length) throw new Error("Source has no application tables.");
    const columns = (await source.query("select table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position")).rows;
    const foreignKeys = (await source.query("select child.relname as child,parent.relname as parent from pg_constraint c join pg_class child on child.oid=c.conrelid join pg_namespace n on n.oid=child.relnamespace join pg_class parent on parent.oid=c.confrelid where c.contype='f' and n.nspname='public'")).rows;
    const sequences = (await source.query("select sequencename,last_value::text from pg_sequences where schemaname='public'")).rows;
    const data = {};
    const recordCounts = {};
    for (const table of tables) {
      const rows = await source.query(`select coalesce(json_agg(row_to_json(t)), '[]'::json)::text as rows from public.${identifier(table)} t`);
      data[table] = JSON.parse(rows.rows[0].rows);
      recordCounts[table] = data[table].length;
    }
    const snapshot = { format: "purpose-course-postgres-data-snapshot-v1", createdAt: new Date().toISOString(), source: "project-local PostgreSQL", columns, foreignKeys, sequences, recordCounts, data };
    const contents = JSON.stringify(snapshot);
    mkdirSync(".local/backups", { recursive: true });
    const path = resolve(`.local/backups/purpose-course-before-supabase-${snapshot.createdAt.replaceAll(/[:.]/g, "-")}.json`);
    writeFileSync(path, contents, { mode: 0o600 });
    writeFileSync(`${path}.sha256`, `${digest(contents)}\n`);
    writeFileSync(`${path}.schema.ts`, readFileSync("src/db/schema.ts"));
    if (digest(readFileSync(path)) !== digest(contents)) throw new Error("Backup verification failed.");
    await source.query("commit");
    return { path, sha256: digest(contents), snapshot };
  } catch (error) {
    await source.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await source.end();
  }
}

function importOrder(snapshot) {
  const remaining = new Set(Object.keys(snapshot.data));
  const done = new Set();
  const order = [];
  while (remaining.size) {
    const ready = [...remaining].filter((table) => snapshot.foreignKeys.every((key) => key.child !== table || key.parent === table || done.has(key.parent)));
    if (!ready.length) throw new Error("Foreign key cycle requires a reviewed import strategy.");
    for (const table of ready) { remaining.delete(table); done.add(table); order.push(table); }
  }
  return order;
}

async function verifyData(client, snapshot) {
  const tables = Object.keys(snapshot.data).sort();
  if (JSON.stringify(await tableNames(client)) !== JSON.stringify(tables)) throw new Error("Source and destination table names differ.");
  const columns = (await client.query("select table_name,column_name,udt_name,is_nullable from information_schema.columns where table_schema='public' order by table_name,ordinal_position")).rows;
  const expected = snapshot.columns.map(({ table_name, column_name, udt_name, is_nullable }) => ({ table_name, column_name, udt_name, is_nullable }));
  if (JSON.stringify(columns) !== JSON.stringify(expected)) throw new Error("Source and destination column definitions differ.");
  let records = 0;
  for (const table of tables) {
    const result = await client.query(`
      with expected as (select to_jsonb(s) as row from jsonb_populate_recordset(null::public.${identifier(table)}, $1::jsonb) s),
      actual as (select to_jsonb(t) as row from public.${identifier(table)} t)
      select (select count(*)::int from actual) as count,
        exists(select row from actual except select row from expected) or
        exists(select row from expected except select row from actual) as differs`, [JSON.stringify(snapshot.data[table])]);
    if (result.rows[0].differs || result.rows[0].count !== snapshot.recordCounts[table]) throw new Error(`Data verification failed for ${table}.`);
    records += result.rows[0].count;
  }
  return { tables: tables.length, records };
}

async function verifySecurity(client) {
  const result = await client.query(`
    select count(*)::int as tables,
      count(*) filter (where not c.relrowsecurity)::int as missing_rls,
      count(*) filter (where has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'))::int as api_accessible,
      count(*) filter (where not (has_table_privilege('purpose_app',c.oid,'SELECT') and has_table_privilege('purpose_app',c.oid,'INSERT') and has_table_privilege('purpose_app',c.oid,'UPDATE') and has_table_privilege('purpose_app',c.oid,'DELETE')))::int as missing_backend_grants
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`);
  const roles = await client.query("select rolsuper,rolcreatedb,rolcreaterole,rolbypassrls from pg_roles where rolname='purpose_app'");
  const flags = roles.rows[0];
  if (!flags || Object.values(flags).some(Boolean) || result.rows[0].missing_rls || result.rows[0].api_accessible || result.rows[0].missing_backend_grants) throw new Error("Database access verification failed.");
  return { ...result.rows[0], runtime_role: "restricted, no RLS bypass" };
}

function envText(env) {
  return Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n") + "\n";
}

async function activate() {
  if (!existsSync(statePath) || !existsSync(credentialsPath)) throw new Error("No completed migration is available to activate.");
  const env = parseFile(credentialsPath);
  const state = JSON.parse(readFileSync(statePath));
  const contents = readFileSync(state.snapshot);
  if (digest(contents) !== state.sha256) throw new Error("Backup checksum differs from the completed migration.");
  const runtime = await connect(env);
  try {
    const data = await verifyData(runtime, JSON.parse(contents));
    const security = await verifySecurity(runtime);
    const permissions = (await runtime.query("select has_schema_privilege(current_user,'public','CREATE') as can_create")).rows[0];
    if (permissions.can_create) throw new Error("Runtime role has unexpected DDL access.");
    const existing = existsSync(".env.local") ? parseFile(".env.local") : {};
    if (existsSync(".env.local")) writeFileSync(`.local/backups/env-local-before-supabase-${Date.now()}.env`, readFileSync(".env.local"), { mode: 0o600 });
    writeFileSync(".env.local", "# Supabase runtime; generated locally and ignored by Git.\n" + envText({ ...existing, ...env }), { mode: 0o600 });
    console.log(JSON.stringify({ activated: true, tls_verified: true, ...data, security }));
  } finally { await runtime.end(); }
}

async function migrate(adminEnv, target) {
  if ((await tableNames(target)).length) throw new Error("Destination is not empty. Use verify; migration never replaces existing cloud tables.");
  const backup = await snapshotSource();
  const order = importOrder(backup.snapshot);
  const migrations = readdirSync(migrationDirectory).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
  if (migrations.length !== 2) throw new Error("Initial import expects the two reviewed baseline migrations.");
  const url = new URL(adminEnv.DATABASE_URL);
  const ref = new URL(adminEnv.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  url.username = `purpose_app.${ref}`;
  const password = randomBytes(32).toString("hex");
  url.password = password;
  const runtimeEnv = {
    DATABASE_URL: url.toString(), DATABASE_SSL_CA: adminEnv.DATABASE_SSL_CA,
    DATABASE_POOL_MAX: "5", PURPOSE_DEMO_OPEN: "false", NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SUPABASE_URL: adminEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: adminEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
  // Preserve generated credentials before COMMIT, so activation can be retried
  // after a network interruption without rotating a role used by the app.
  writeFileSync(credentialsPath, envText(runtimeEnv), { mode: 0o600 });
  await target.query("begin");
  try {
    await target.query("select pg_advisory_xact_lock(725104, 1)");
    if ((await tableNames(target)).length) throw new Error("Destination changed during migration preflight.");
    await target.query("create schema if not exists supabase_migrations");
    await target.query("revoke all on schema supabase_migrations from public, anon, authenticated");
    await target.query("create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)");
    for (const file of migrations) {
      const sql = readFileSync(resolve(migrationDirectory, file), "utf8");
      await target.query(sql);
      const [version, ...name] = file.replace(/\.sql$/, "").split("_");
      await target.query("insert into supabase_migrations.schema_migrations(version,statements,name) values($1,$2,$3)", [version, [sql], name.join("_")]);
    }
    for (const table of order) {
      if (!backup.snapshot.data[table].length) continue;
      const columns = backup.snapshot.columns.filter((column) => column.table_name === table).map((column) => identifier(column.column_name)).join(",");
      await target.query(`insert into public.${identifier(table)} (${columns}) select ${columns} from jsonb_populate_recordset(null::public.${identifier(table)},$1::jsonb)`, [JSON.stringify(backup.snapshot.data[table])]);
    }
    for (const sequence of backup.snapshot.sequences) {
      if (sequence.last_value != null) await target.query("select setval($1::regclass,$2::bigint,true)", [`public.${identifier(sequence.sequencename)}`, sequence.last_value]);
    }
    // The generated password is hex, so it cannot contain SQL delimiters.
    await target.query(`alter role purpose_app login password '${password}'`);
    const data = await verifyData(target, backup.snapshot);
    const security = await verifySecurity(target);
    await target.query("commit");
    writeFileSync(statePath, JSON.stringify({ completedAt: new Date().toISOString(), projectRef: ref, snapshot: backup.path, sha256: backup.sha256, ...data, migrations }, null, 2));
    console.log(JSON.stringify({ migrated: true, ...data, security, backup: backup.path }));
  } catch (error) {
    await target.query("rollback").catch(() => undefined);
    throw error;
  }
}

async function main() {
  if (!["check", "migrate", "verify", "activate"].includes(action)) throw new Error("Use check, migrate --apply, verify, or activate.");
  mkdirSync(".local", { recursive: true });
  if (action === "activate") return activate();
  const env = adminEnvironment();
  const target = await connect(env, true);
  try {
    if (action === "migrate") {
      if (!process.argv.includes("--apply")) throw new Error("Use migrate --apply to execute the reviewed initial import.");
      await migrate(env, target);
    } else if (action === "verify") {
      const state = JSON.parse(readFileSync(statePath));
      const contents = readFileSync(state.snapshot);
      if (digest(contents) !== state.sha256) throw new Error("Backup checksum mismatch.");
      console.log(JSON.stringify({ ...(await verifyData(target, JSON.parse(contents))), security: await verifySecurity(target), tls_verified: true }));
    } else {
      console.log(JSON.stringify({ connected: true, tls_verified: true, public_tables: (await tableNames(target)).length }));
    }
  } finally { await target.end(); }
}

main().catch((error) => {
  // Never log a URI, SQL parameters, PostgreSQL detail, or row contents.
  const message = error instanceof Error ? error.message : "Database operation failed.";
  console.error(message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database URI]"));
  if (error.code) console.error(`Database error code: ${error.code}`);
  process.exitCode = 1;
});
