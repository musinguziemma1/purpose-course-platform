import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { operatorEnvironment } from "./operator-environment.mjs";
import { databaseConfig } from "./database-config.mjs";
import { decryptBuffer, decryptFile, encryptBuffer, encryptFile } from "./backup-crypto.mjs";

const args = process.argv.slice(2), action = args[0];
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const keyPath = resolve(option("--key-file", ".local/credentials/recovery-backup.key"));
const tool = name => option("--pg-bin") ? resolve(option("--pg-bin"), name + (process.platform === "win32" ? ".exe" : "")) : name;
function key(create = false) {
  if (!existsSync(keyPath) && create) { mkdirSync(resolve(keyPath, ".."), { recursive: true }); writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: "wx" }); }
  const value = readFileSync(keyPath); if (value.length !== 32) throw new Error("A 32-byte backup key is required."); return value;
}
function pgEnvironment(url, caPath) {
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: caPath ? "verify-full" : "disable", PGOPTIONS: "-c statement_timeout=120000 -c lock_timeout=15000", PGCONNECT_TIMEOUT: "15" };
  delete env.PGSERVICE; delete env.PGSERVICEFILE;
  if (caPath) env.PGSSLROOTCERT = caPath; else delete env.PGSSLROOTCERT;
  return env;
}
async function inventory(client) {
  await client.query("set local timezone='UTC'");
  const tables = (await client.query("select schemaname,tablename from pg_tables where schemaname in ('public','supabase_migrations') order by schemaname,tablename")).rows;
  for (const table of tables) {
    const value = (await client.query(`select count(*)::int as rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as digest from ${identifier(table.schemaname)}.${identifier(table.tablename)} t`)).rows[0];
    Object.assign(table, value);
  }
  return tables;
}
async function backup() {
  const { env, target, local } = operatorEnvironment(option("--env-file", ".env.supabase.local"), option("--project"));
  const archive = resolve(option("--output-dir", ".local/recovery"), `backup-${Date.now()}-${randomUUID().slice(0, 8)}`);
  mkdirSync(join(archive, "objects"), { recursive: true });
  const backupKey = key(true), plain = join(archive, "database.tmp"), caFile = join(archive, "certificate.tmp");
  const client = new pg.Client(databaseConfig(env)); await client.connect();
  const manifest = { format: 1, createdAt: new Date().toISOString(), scope: "application public schema, migration history and purpose-course-media objects", project: option("--project") ?? "local", objects: [] };
  try {
    await client.query("begin isolation level repeatable read read only");
    const snapshot = (await client.query("select pg_export_snapshot() as id")).rows[0].id;
    manifest.tables = await inventory(client);
    manifest.policyRoles = (await client.query("select distinct unnest(roles)::text as name from pg_policies where schemaname='public'")).rows.map(row => row.name).filter(name => name !== "public");
    manifest.rlsTables = Number((await client.query("select count(*)::int as n from pg_tables where schemaname='public' and rowsecurity")).rows[0].n);
    const objects = local ? [] : (await client.query("select id,name,metadata,updated_at from storage.objects where bucket_id='purpose-course-media' order by id")).rows;
    if (!local) writeFileSync(caFile, env.DATABASE_SSL_CA.replaceAll("\\n", "\n"), { mode: 0o600, flag: "wx" });
    execFileSync(tool("pg_dump"), ["--format=custom", "--no-owner", "--no-acl", "--schema=public", ...(manifest.tables.some(t => t.schemaname === "supabase_migrations") ? ["--schema=supabase_migrations"] : []), "--snapshot=" + snapshot, "--file=" + plain], { env: pgEnvironment(target, local ? null : caFile), windowsHide: true, stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
    await client.query("rollback");
    manifest.database = { file: "database.dump.enc", ...await encryptFile(plain, backupKey, join(archive, "database.dump.enc")) };
    if (objects.length) {
      const storageEnv = { ...env, ...(option("--storage-env-file") ? dotenv.parse(readFileSync(option("--storage-env-file"))) : {}), ...(process.env.SUPABASE_SECRET_KEY ? { SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY } : {}), ...(process.env.SUPABASE_SERVICE_ROLE_KEY ? { SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY } : {}) };
      const endpoint = storageEnv.SUPABASE_URL || storageEnv.NEXT_PUBLIC_SUPABASE_URL, serviceKey = storageEnv.SUPABASE_SECRET_KEY || storageEnv.SUPABASE_SERVICE_ROLE_KEY;
      if (!endpoint || new URL(endpoint).protocol !== "https:" || new URL(endpoint).username || new URL(endpoint).password || new URL(endpoint).hostname !== option("--project") + ".supabase.co" || !serviceKey) throw new Error("Matching server-only Storage configuration is required to protect media.");
      const storage = createClient(endpoint, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }).storage.from("purpose-course-media");
      for (const object of objects) {
        const result = await storage.download(object.name);
        if (result.error || !result.data) throw new Error("A Storage object could not be downloaded.");
        const data = Buffer.from(await result.data.arrayBuffer());
        if (object.metadata?.size != null && data.length !== Number(object.metadata.size)) throw new Error("Storage changed during backup; retry a fresh export.");
        const file = `objects/${object.id}.enc`;
        manifest.objects.push({ ...object, file, ...encryptBuffer(data, backupKey, join(archive, file)) });
      }
      const current = (await client.query("select id,name,metadata,updated_at from storage.objects where bucket_id='purpose-course-media' order by id")).rows;
      if (JSON.stringify(current) !== JSON.stringify(objects)) throw new Error("Storage changed during backup; retry a fresh export.");
    }
    encryptBuffer(Buffer.from(JSON.stringify(manifest)), backupKey, join(archive, "manifest.enc"));
    writeFileSync(join(archive, "summary.json"), JSON.stringify({ format: 1, createdAt: manifest.createdAt, tables: manifest.tables.length, objects: manifest.objects.length, encrypted: true }, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ ok: true, archive, tables: manifest.tables.length, objects: manifest.objects.length, encrypted: true }));
  } finally { await client.query("rollback").catch(() => {}); await client.end(); for (const file of [plain, caFile]) if (existsSync(file)) unlinkSync(file); }
}
async function verify(archive, backupKey) {
  const manifest = JSON.parse(decryptBuffer(readFileSync(join(archive, "manifest.enc")), backupKey));
  if (manifest.format !== 1 || !Array.isArray(manifest.tables) || !Array.isArray(manifest.objects)) throw new Error("Unknown backup format.");
  for (const entry of [manifest.database, ...manifest.objects]) {
    if (!/^(database\.dump|objects\/[a-f0-9-]+)\.enc$/.test(entry.file)) throw new Error("Unsafe archive entry.");
    const actual = await decryptFile(join(archive, entry.file), backupKey);
    if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) throw new Error("Backup content verification failed.");
  }
  return manifest;
}
async function rehearse(archive, backupKey) {
  const started = Date.now(), manifest = await verify(archive, backupKey);
  const base = resolve(".local/recovery-rehearsals"), work = join(base, randomUUID()); mkdirSync(work, { recursive: true });
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const binaries = await import(`@embedded-postgres/${platform}-${process.arch}`);
  const dataDir = join(work, "pgdata"), passwordFile = join(work, "password.tmp"), dumpFile = join(work, "database.dump");
  const password = randomBytes(32).toString("hex"), port = await new Promise((accept, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const assigned = server.address().port; server.close(() => accept(assigned)); }); });
  const target = new URL(`postgresql://recovery_operator:${password}@127.0.0.1:${port}/postgres`);
  let running = false, client;
  const run = (exe, parameters) => execFileSync(exe, parameters, { windowsHide: true, stdio: exe === binaries.pg_ctl ? "ignore" : ["ignore", "pipe", "pipe"], timeout: 120000 });
  try {
    writeFileSync(passwordFile, password, { mode: 0o600, flag: "wx" });
    run(binaries.initdb, ["-D", dataDir, "-U", "recovery_operator", "--pwfile=" + passwordFile, "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C"]);
    unlinkSync(passwordFile);
    running = true;
    run(binaries.pg_ctl, ["-D", dataDir, "-l", join(work, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port}`, "-w", "start"]);
    client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 10000 }); await client.connect();
    for (const role of manifest.policyRoles) await client.query(`create role ${identifier(role)} nologin`);
    await client.query("create database purpose_recovery"); await client.end();
    target.pathname = "/purpose_recovery";
    client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 10000 }); await client.connect();
    await client.query("drop schema public"); // Empty schema in this newly created, isolated database only.
    await client.end();
    await decryptFile(join(archive, manifest.database.file), backupKey, dumpFile);
    execFileSync(tool("pg_restore"), ["--exit-on-error", "--no-owner", "--no-acl", "--dbname=purpose_recovery", dumpFile], { env: pgEnvironment(target), windowsHide: true, stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
    client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 10000 }); await client.connect();
    await client.query("begin read only"); const actual = await inventory(client); await client.query("rollback");
    if (JSON.stringify(actual) !== JSON.stringify(manifest.tables)) throw new Error("Restored table counts or row digests differ from the exported snapshot.");
    const rls = Number((await client.query("select count(*)::int as n from pg_tables where schemaname='public' and rowsecurity")).rows[0].n);
    if (rls !== manifest.rlsTables) throw new Error("Restored RLS configuration differs.");
    // The rehearsal never starts application servers or outbound workers.
    // Revoke restored access before retaining any diagnostic state.
    await client.query("begin"); await client.query("delete from auth_sessions"); await client.query("update users set is_active=false"); await client.query("commit");
    for (const object of manifest.objects) { const actual = await decryptFile(join(archive, object.file), backupKey); if (actual.sha256 !== object.sha256) throw new Error("Restored media differs."); }
    const report = { ok: true, completedAt: new Date().toISOString(), elapsedSeconds: Math.round((Date.now() - started) / 1000), tablesVerified: actual.length, rowDigestsMatched: true, rlsTables: rls, mediaObjectsVerified: manifest.objects.length, isolatedLocalCluster: true, restoredSessionsRevoked: true, outboundWorkersStarted: false };
    mkdirSync(base, { recursive: true }); writeFileSync(join(base, `result-${Date.now()}.json`), JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
  } finally {
    await client?.end().catch(() => {});
    if (running && existsSync(join(dataDir, "postmaster.pid"))) run(binaries.pg_ctl, ["-D", dataDir, "-m", "fast", "-w", "stop"]);
    // Only the newly generated disposable directory may be removed, never an archive or live cluster.
    if (resolve(work).startsWith(base + sep) && /^[a-f0-9-]{36}$/.test(work.slice(base.length + 1))) rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
try {
  if (action === "backup") await backup();
  else if (["verify", "rehearse"].includes(action)) {
    const archive = resolve(option("--archive", "")); if (!option("--archive")) throw new Error("An archive is required.");
    if (action === "rehearse") await rehearse(archive, key());
    else { const manifest = await verify(archive, key()); console.log(JSON.stringify({ ok: true, tablesVerified: manifest.tables.length, mediaObjectsVerified: manifest.objects.length })); }
  } else throw new Error("Use backup, verify or rehearse.");
  if (existsSync(".local/recovery/last-error.log")) unlinkSync(".local/recovery/last-error.log");
} catch (error) {
  // Keep database URLs, data and child-process stderr out of shared logs.
  mkdirSync(".local/recovery", { recursive: true });
  writeFileSync(".local/recovery/last-error.log", String(error.stderr?.toString() || error.stack || error), { mode: 0o600 });
  console.error("Recovery operation failed. Private diagnostics: .local/recovery/last-error.log"); process.exitCode = 1;
}
