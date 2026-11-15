import { readFileSync, existsSync } from "node:fs";
import dotenv from "dotenv";
import { databaseConfig } from "./database-config.mjs";

export function operatorEnvironment(file, project) {
  const env = { ...dotenv.parse(readFileSync(file)) };
  const target = new URL(env.DATABASE_URL);
  const local = ["localhost", "127.0.0.1"].includes(target.hostname);
  if (!local && (!project || !/^[a-z0-9]{20}$/.test(project) || !decodeURIComponent(target.username).endsWith("." + project) || !target.hostname.endsWith(".pooler.supabase.com") || target.port !== "5432")) {
    throw new Error("A matching --project reference and Session pooler on port 5432 are required for hosted operator work.");
  }
  if (!local && !env.DATABASE_SSL_CA && existsSync(".local/certs/supabase-ca-2021.crt")) env.DATABASE_SSL_CA = readFileSync(".local/certs/supabase-ca-2021.crt", "utf8");
  databaseConfig(env); // Validate verified TLS before any connection or export.
  return { env, target, local };
}
