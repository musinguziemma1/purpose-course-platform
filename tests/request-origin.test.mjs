import assert from "node:assert/strict";
import { test } from "node:test";
import { isSameOriginRequest } from "../src/lib/request-origin.ts";
const request = (origin, host = "127.0.0.1:3012", forwarded) => ({ url: "http://localhost:3012/api/media", headers: new Headers({ ...(origin ? { origin } : {}), host, ...(forwarded ? { "x-forwarded-host": forwarded } : {}) }) });
test("upload origin checks accept the canonical app when Next uses an internal hostname", () => {
  assert.equal(isSameOriginRequest(request("https://purpose-course.example"), { APP_URL: "https://purpose-course.example" }), true);
  assert.equal(isSameOriginRequest(request("http://127.0.0.1:3012"), {}), true);
});
test("missing, malformed and foreign origins cannot authorize cookie-authenticated uploads", () => {
  for (const origin of [null, "null", "https://attacker.example", "https://purpose-course.example/extra"]) assert.equal(isSameOriginRequest(request(origin), { APP_URL: "https://purpose-course.example" }), false);
  assert.equal(isSameOriginRequest(request("https://attacker.example", "127.0.0.1:3012", "attacker.example"), {}), false);
});
test("Vercel deployments use the browser-facing host and HTTPS", () => {
  assert.equal(isSameOriginRequest(request("https://preview.example", "localhost", "preview.example"), { VERCEL: "1" }), true);
  assert.equal(isSameOriginRequest(request("http://preview.example", "localhost", "preview.example"), { VERCEL: "1" }), false);
});
