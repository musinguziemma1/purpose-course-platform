import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderRichText } from "../src/lib/markdown.tsx";
import {
  mediaBlock,
  parseMediaBlock,
  safeContentUrl,
  videoEmbedUrl,
} from "../src/lib/content-media.ts";
import { zonedDateTime } from "../src/lib/event-time.ts";
test("embedded images, audio, video and materials render as safe semantic content", () => {
  for (const kind of ["image", "video", "audio", "document"]) {
    const block = mediaBlock({
      kind,
      url: "/api/media/12345678-1234-1234-1234-123456789abc",
      name: "Learning resource",
    });
    assert.equal(parseMediaBlock(block).kind, kind);
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        ...renderRichText("Introduction\n\n" + block + "\n\nClosing paragraph"),
      ),
    );
    assert.match(
      html,
      kind === "image"
        ? /<img/
        : kind === "video"
          ? /<video/
          : kind === "audio"
            ? /<audio/
            : /Download Learning resource/,
    );
    assert.match(html, /Closing paragraph/);
  }
});
test("active URLs, arbitrary HTML and disguised external video providers cannot inject executable content", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//attacker.invalid/a",
    "https://user:secret@example.invalid/a",
    "https://example.invalid/\\evil",
  ])
    assert.equal(safeContentUrl(url, true), null);
  const html = renderToStaticMarkup(
    createElement(
      "div",
      null,
      ...renderRichText(
        "[Unsafe](javascript:alert)\n\n<script>alert(1)</script>\n\n:::media video javascript:alert\nUnsafe\n:::",
      ),
    ),
  );
  assert.doesNotMatch(html, /href="javascript|src="javascript|<script/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(
    videoEmbedUrl("https://youtube.com.attacker.invalid/watch?v=abcdefghijk"),
    null,
  );
  assert.equal(
    videoEmbedUrl("https://youtu.be/abcdefghijk"),
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  );
});
test("scheduling converts Kampala and DST clock time accurately and rejects missing local times", () => {
  assert.equal(
    zonedDateTime("2026-11-13T16:00", "Africa/Kampala"),
    "2026-11-13T13:00:00.000Z",
  );
  assert.equal(
    zonedDateTime("2026-07-13T16:00", "America/New_York"),
    "2026-07-13T20:00:00.000Z",
  );
  assert.equal(zonedDateTime("2026-03-08T02:30", "America/New_York"), null);
  assert.equal(zonedDateTime("2026-02-31T12:00", "Africa/Kampala"), null);
  assert.equal(zonedDateTime("2026-11-13T16:00", "Invalid/Zone"), null);
});
