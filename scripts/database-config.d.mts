import type { PoolConfig } from "pg";
export function databaseConfig(env?: NodeJS.ProcessEnv | Record<string, string | undefined>): PoolConfig;
