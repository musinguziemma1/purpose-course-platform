import "./scripts/load-env.mjs";
import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./scripts/database-config.mjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Run npm run setup:local first.");
}
const connection = databaseConfig();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: connection.connectionString!, ssl: connection.ssl },
});
