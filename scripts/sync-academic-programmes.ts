import "./load-env.mjs";
import { pool } from "../src/db";
import { syncAcademicProgrammes } from "../src/db/sync-academic-programmes";

try {
  const result = await syncAcademicProgrammes();
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}
