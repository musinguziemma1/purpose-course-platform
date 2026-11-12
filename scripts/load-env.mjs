import * as nextEnv from "@next/env";

// Match Next.js precedence, including .env.local, for database commands.
// Native Node and drizzle-kit's config loader expose CJS packages differently.
const loadEnvConfig = nextEnv.loadEnvConfig ?? nextEnv.default?.loadEnvConfig;
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
