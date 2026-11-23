import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("all production workers have authenticated recurring schedules", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(config.schedules).sort(), [
    "email-delivery",
    "platform-maintenance",
    "scheduled-publishing",
  ]);
  assert.deepEqual(
    Object.values(config.schedules).map((schedule) => schedule.path).sort(),
    ["/api/jobs/email", "/api/jobs/maintenance", "/api/jobs/publishing"],
  );
  for (const schedule of Object.values(config.schedules)) {
    assert.equal(schedule.schedule, "*/15 * * * *");
    assert.equal(schedule.requestMethod, "GET");
  }
});
