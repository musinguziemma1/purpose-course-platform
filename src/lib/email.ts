import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EmailRequest = { from: string; to: string[]; subject: string; text: string };

export function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const rawUrl = process.env.APP_URL?.trim();
  const encryptionKey = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY?.trim();
  if (!apiKey || !from || !rawUrl || !encryptionKey) throw new Error("Configure Resend, APP_URL and the email encryption key before sending invitations or email.");
  if (!/^([\w .'-]+ <)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(from) || /[\r\n]/.test(from)) throw new Error("Configure a valid verified Resend sender address.");
  const url = new URL(rawUrl);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("APP_URL must be the canonical HTTPS origin of this application.");
  const key = Buffer.from(encryptionKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encryptionKey) throw new Error("EMAIL_OUTBOX_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return { apiKey, from, origin: url.origin, key };
}

export function emailConfigurationError() {
  try { emailConfiguration(); return null; } catch (error) { return error instanceof Error ? error.message : "Email is not configured."; }
}

// The immutable provider request includes activation tokens. Store only authenticated ciphertext.
export function encryptEmail(request: EmailRequest) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", emailConfiguration().key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(request), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptEmail(value: string): EmailRequest {
  const [version, iv, tag, ciphertext, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext || extra) throw new Error("Invalid encrypted email request.");
  const decipher = createDecipheriv("aes-256-gcm", emailConfiguration().key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8"));
}
