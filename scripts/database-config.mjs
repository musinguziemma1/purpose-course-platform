/** @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env */
export function databaseConfig(env = process.env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const url = new URL(env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URI.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const ca = env.DATABASE_SSL_CA?.replaceAll("\\n", "\n");
  if (!local && !ca) throw new Error("DATABASE_SSL_CA is required for a verified remote database connection.");
  // pg connection-string SSL parameters override its ssl object. Supply one
  // consistent, verified TLS configuration instead of allowing that override.
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) url.searchParams.delete(key);
  const max = Number(env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isInteger(max) || max < 1 || max > 20) throw new Error("DATABASE_POOL_MAX must be between 1 and 20.");
  return {
    connectionString: url.toString(),
    ssl: local ? undefined : { ca, rejectUnauthorized: true },
    max,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
    application_name: "purpose-course-platform",
  };
}
