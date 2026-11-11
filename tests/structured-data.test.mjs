import assert from "node:assert/strict";
import { test } from "node:test";
import { serializeStructuredData } from "../src/lib/structured-data.ts";

test("stored article and author text cannot terminate the JSON-LD script", () => {
  const data = { headline: '</script><script>globalThis.injected = true</script>', author: { name: '</ScRiPt><img src=x onerror=alert(1)>' }, description: '<!--\u2028\u2029' };
  const result = serializeStructuredData(data);
  assert.ok(!result.includes('<'));
  assert.ok(!result.includes('\u2028'));
  assert.ok(!result.includes('\u2029'));
  assert.deepEqual(JSON.parse(result), data);
});
