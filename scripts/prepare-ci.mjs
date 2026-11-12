import { existsSync, writeFileSync, mkdirSync } from "node:fs";
if (process.env.CI !== "true") throw new Error("This helper is only for an isolated CI checkout.");
const uri = new URL(process.env.DATABASE_URL ?? "");
if (uri.hostname !== "127.0.0.1" || uri.port !== "54329" || uri.pathname !== "/purpose_course_ci") throw new Error("CI requires the ephemeral project-local test database.");
if (existsSync(".env") || existsSync(".env.local")) throw new Error("CI must use a fresh checkout without environment files.");
writeFileSync(".env", `DATABASE_URL=${process.env.DATABASE_URL}\nPURPOSE_DEMO_OPEN=false\nNEXT_TELEMETRY_DISABLED=1\n`, {flag:"wx"});
mkdirSync(".local/verification",{recursive:true});
console.log("Prepared isolated local database fixtures; no hosted credentials are used.");
