import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";

const path = ".env.local";
let contents = existsSync(path) ? readFileSync(path, "utf8") : "";
const env = dotenv.parse(contents), created = [];
for (const name of ["EMAIL_OUTBOX_ENCRYPTION_KEY", "CRON_SECRET"]) {
  if (env[name]) continue;
  env[name] = randomBytes(32).toString(name === "CRON_SECRET" ? "hex" : "base64");
  contents += `\n${name}=${env[name]}\n`; created.push(name);
}
if (created.length) writeFileSync(path, contents, { mode: 0o600 });
const missing = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "APP_URL", "RESEND_WEBHOOK_SECRET"].filter((name) => !env[name]);
console.log(JSON.stringify({ file: path, generated: created, missing, note: "Values are never printed. Keep the encryption key unchanged and copy it to your hosting secrets before dispatching queued email." }, null, 2));
