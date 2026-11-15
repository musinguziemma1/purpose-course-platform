import assert from "node:assert/strict";
import { test } from "node:test";
import { probeProduction } from "../scripts/monitor-production.mjs";

test("availability checks fail on a database error even when the public pages render", async () => {
  const good = async url => new Response(url.endsWith("/api/health") ? '{"ok":true}' : "ok");
  assert.equal((await probeProduction("https://academy.example", good)).ok, true);
  const broken = async url => url.endsWith("/api/health") ? Response.json({ ok: false }, { status: 503 }) : new Response("ok");
  const result = await probeProduction("https://academy.example", broken);
  assert.equal(result.ok, false);
  assert.equal(result.checks.filter(x => !x.ok).length, 1);
  assert.equal((await probeProduction("https://academy.example", async () => new Response("login redirect", { status: 302 }))).ok, false);
  for (const origin of ["http://academy.example", "https://user:secret@academy.example", "https://academy.example/path"]) await assert.rejects(probeProduction(origin, good));
});
