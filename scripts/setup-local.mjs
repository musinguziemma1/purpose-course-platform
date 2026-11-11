import { copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import pg from "pg";

async function main() {
  if (!existsSync(".env")) {
    copyFileSync(".env.example", ".env");
    console.log("Created .env from the local development defaults.");
  }
  nextEnv.loadEnvConfig(process.cwd(), true);
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname) || databaseUrl.port !== "54329") {
    throw new Error("setup:local only provisions the project database on port 54329. Remove the Supabase .env.local override to use local development.");
  }

  const runNode = (file, args = []) => execFileSync(process.execPath, [resolve(file), ...args], {
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  });
  runNode("scripts/local-db.mjs", ["start"]);
  runNode("node_modules/drizzle-kit/bin.cjs", ["push"]);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let empty;
  try {
    const result = await client.query("select exists(select 1 from profiles) as populated");
    empty = !result.rows[0].populated;
  } finally {
    await client.end();
  }

  if (empty) {
    runNode("node_modules/tsx/dist/cli.mjs", ["src/db/seed.ts"]);
  } else {
    console.log("Existing application data preserved; demo seed skipped.");
  }
  console.log("Local setup complete. Run npm run dev and open http://localhost:3000.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
