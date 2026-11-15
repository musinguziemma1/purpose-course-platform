import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { encryptBuffer, decryptBuffer, encryptFile, decryptFile } from "../scripts/backup-crypto.mjs";

test("backups authenticate metadata and streamed data and reject tampering or the wrong key", async () => {
  const dir = mkdtempSync(join(tmpdir(), "purpose-backup-")), key = randomBytes(32), data = randomBytes(75000);
  try {
    encryptBuffer(data, key, join(dir, "buffer.enc"));
    const encrypted = readFileSync(join(dir, "buffer.enc"));
    assert.deepEqual(decryptBuffer(encrypted, key), data);
    assert.throws(() => decryptBuffer(encrypted, randomBytes(32)));
    const changed = Buffer.from(encrypted); changed[changed.length - 1] ^= 1;
    assert.throws(() => decryptBuffer(changed, key));
    writeFileSync(join(dir, "source"), data);
    const expected = await encryptFile(join(dir, "source"), key, join(dir, "stream.enc"));
    assert.deepEqual(await decryptFile(join(dir, "stream.enc"), key, join(dir, "restored")), expected);
    assert.deepEqual(readFileSync(join(dir, "restored")), data);
    await assert.rejects(decryptFile(join(dir, "stream.enc"), randomBytes(32)));
    assert.throws(() => decryptBuffer(Buffer.from("invalid"), key));
  } finally { for (const file of readdirSync(dir)) unlinkSync(join(dir, file)); rmdirSync(dir); }
});
