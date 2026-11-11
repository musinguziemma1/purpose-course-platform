import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  if (typeof password !== "string" || password.length > 128 || typeof stored !== "string") return false;
  const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(stored);
  if (!match) return false;
  return timingSafeEqual(scryptSync(password, match[1], 64), Buffer.from(match[2], "hex"));
}

export function passwordError(password) {
  if (password.length < 15) return "Use at least 15 characters for your new password.";
  if (password.length > 128) return "Use no more than 128 characters for your password.";
  return null;
}

export function initialPassword() {
  return randomBytes(24).toString("base64url");
}
