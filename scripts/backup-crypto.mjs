import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream, openSync, readSync, writeSync, closeSync, writeFileSync, statSync } from "node:fs";
import { Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
const magic = Buffer.from("PCBK0001");
const digest = data => createHash("sha256").update(data).digest("hex");

export function encryptBuffer(data, key, path) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(magic);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  writeFileSync(path, Buffer.concat([magic, iv, cipher.getAuthTag(), ciphertext]), { mode: 0o600, flag: "wx" });
  return { sha256: digest(data), bytes: data.length };
}
export function decryptBuffer(data, key) {
  if (data.length < 36 || !data.subarray(0, 8).equals(magic)) throw new Error("Invalid encrypted backup.");
  const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(8, 20));
  decipher.setAAD(magic); decipher.setAuthTag(data.subarray(20, 36));
  return Buffer.concat([decipher.update(data.subarray(36)), decipher.final()]);
}
export async function encryptFile(source, key, target) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv), hash = createHash("sha256");
  cipher.setAAD(magic);
  writeFileSync(target, Buffer.concat([magic, iv, Buffer.alloc(16)]), { mode: 0o600, flag: "wx" });
  await pipeline(createReadStream(source), new Transform({ transform(chunk, _encoding, done) { hash.update(chunk); done(null, chunk); } }), cipher, createWriteStream(target, { flags: "a", mode: 0o600 }));
  const handle = openSync(target, "r+"); try { writeSync(handle, cipher.getAuthTag(), 0, 16, 20); } finally { closeSync(handle); }
  return { sha256: hash.digest("hex"), bytes: statSync(source).size };
}
export async function decryptFile(source, key, target) {
  const header = Buffer.alloc(36), handle = openSync(source, "r");
  try { if (readSync(handle, header, 0, 36, 0) !== 36 || !header.subarray(0, 8).equals(magic)) throw new Error("Invalid encrypted backup."); } finally { closeSync(handle); }
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(8, 20)), hash = createHash("sha256");
  let bytes = 0;
  decipher.setAAD(magic); decipher.setAuthTag(header.subarray(20, 36));
  await pipeline(createReadStream(source, { start: 36 }), decipher, new Transform({ transform(chunk, _encoding, done) { hash.update(chunk); bytes += chunk.length; done(null, chunk); } }),
    target ? createWriteStream(target, { flags: "wx", mode: 0o600 }) : new Writable({ write(_chunk, _encoding, done) { done(); } }));
  return { sha256: hash.digest("hex"), bytes };
}
