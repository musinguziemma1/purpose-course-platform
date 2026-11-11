import "./load-env.mjs";
import { databaseConfig } from "./database-config.mjs";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Run npm run setup:local first.");
}

const databaseUrl = new URL(connectionString);
const port = Number(databaseUrl.port || 5432);
const isManagedLocal = ["127.0.0.1", "localhost"].includes(databaseUrl.hostname) && port === 54329;
const action = process.argv[2] ?? "start";

async function canConnect(url) {
  const client = new pg.Client({ ...databaseConfig({ ...process.env, DATABASE_URL: url }), connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query("select 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  if (!["start", "stop"].includes(action)) throw new Error("Use db:start or db:stop.");
  if (!isManagedLocal) {
    if (action === "stop") throw new Error("Only the project-managed database can be stopped by this script.");
    if (!(await canConnect(connectionString))) throw new Error("Cannot connect to the configured PostgreSQL database.");
    console.log("Using the PostgreSQL database configured in DATABASE_URL.");
    return;
  }

  const databaseDir = resolve(".local/postgres");
  const logFile = resolve(".local/postgres.log");
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const { pg_ctl, initdb } = await import(`@embedded-postgres/${platform}-${process.arch}`);
  const runPgCtl = (args) => execFileSync(pg_ctl, args, { stdio: "inherit", windowsHide: true });

  if (action === "stop") {
    if (existsSync(resolve(databaseDir, "postmaster.pid"))) {
      runPgCtl(["-D", databaseDir, "-m", "fast", "-w", "stop"]);
    } else {
      console.log("The project database is already stopped.");
    }
    return;
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";
  if (!(await canConnect(adminUrl.toString()))) {
    mkdirSync(resolve(".local"), { recursive: true });
    if (!existsSync(resolve(databaseDir, "PG_VERSION"))) {
      // Invoke the packaged binaries directly: the wrapper requires os.userInfo(),
      // which is unavailable in some restricted Windows development accounts.
      const passwordFile = resolve(".local/postgres-password.tmp");
      writeFileSync(passwordFile, decodeURIComponent(databaseUrl.password), { mode: 0o600 });
      try {
        execFileSync(initdb, [
          "-D", databaseDir,
          "-U", decodeURIComponent(databaseUrl.username),
          `--pwfile=${passwordFile}`,
          "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C",
        ], { stdio: "inherit", windowsHide: true });
      } finally {
        unlinkSync(passwordFile);
      }
    }
    runPgCtl(["-D", databaseDir, "-l", logFile, "-o", `-h 127.0.0.1 -p ${port}`, "-w", "start"]);
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  if (!databaseName) throw new Error("DATABASE_URL must include a database name.");
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query("select 1 from pg_database where datname = $1", [databaseName]);
    if (!existing.rowCount) {
      await client.query(`create database "${databaseName.replaceAll('"', '""')}"`);
    }
  } finally {
    await client.end();
  }
  console.log(`Local PostgreSQL is ready on 127.0.0.1:${port}/${databaseName}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
