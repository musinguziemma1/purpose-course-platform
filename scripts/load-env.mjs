import nextEnv from "@next/env";

// Match Next.js precedence, including .env.local, for database commands.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
