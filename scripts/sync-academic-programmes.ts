import "./load-env.mjs";
import { pool } from "../src/db";
import { syncAcademicProgrammes } from "../src/db/sync-academic-programmes";

async function main() {
  try {
    const result = await syncAcademicProgrammes();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Academic programme sync failed.");
  process.exitCode = 1;
});
