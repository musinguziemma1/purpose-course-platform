#!/usr/bin/env node
/**
 * Convert SPURL Journal Word documents (.docx "website publishing packages") into
 * article records for the Purpose Journal.
 *
 *   node scripts/journal/convert-spurl-journal.mjs <folder-of-docx> [output.json]
 *
 * Each package holds a metadata table (SEO title, URL slug, category & tags,
 * reading time, meta description), the article copy, one-cell callout boxes and a
 * closing call to action. The output body uses the editorial markdown subset that
 * src/lib/markdown.tsx renders (## / ### headings, lists, quotes, tables and
 * `:::callout Title` blocks). Needs the `unzip` command (Git Bash, macOS, Linux).
 * Review the JSON, then load it with scripts/journal/import-journal-articles.mjs.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [inputDir, outputFile = "scripts/journal/spurl-journal-articles.json"] = process.argv.slice(2);
if (!inputDir) {
  console.error("Usage: node scripts/journal/convert-spurl-journal.mjs <folder-of-docx> [output.json]");
  process.exit(1);
}

/* Editorial placement for the first series (Journal 01–24): principle category and cover photo.
   Covers are the site's licensed stock photographs (public/images/README.md). */
const COVERS = {
  "level-foundation.jpg": "A path winding through a forest",
  "level-advanced.jpg": "A mountain landscape under an open sky",
  "level-intermediate.jpg": "Colleagues discussing charts and plans",
  "journal-identity.jpg": "Two people reading and learning together",
  "journal-purpose.jpg": "A person writing in a notebook beside a laptop",
  "student-study.jpg": "A learner taking notes while studying online",
  "hero-workshop.jpg": "Participants in a facilitated workshop",
  "learning-materials.jpg": "An open notebook and pen on a desk",
  "mentor-guidance.jpg": "A mentor guiding a learner at a laptop",
  "community.jpg": "A group joining hands across a table",
  "about-team.jpg": "A team working together around a table",
  "mentorship.jpg": "An educator preparing teaching materials",
  "learning-together.jpg": "A teacher and adult learners discussing their work in a library",
  "study-partners.jpg": "Two students working together at a laptop",
  "online-learning.jpg": "A woman working at a laptop with headphones on",
  "learner-support.jpg": "A woman listening on headphones while she works",
};
const PLACEMENT = {
  1: ["purpose", "level-foundation.jpg"],
  2: ["destiny", "level-advanced.jpg"],
  3: ["identity", "journal-identity.jpg"],
  4: ["potential", "student-study.jpg"],
  5: ["destiny", "hero-workshop.jpg"],
  6: ["destiny", "level-intermediate.jpg"],
  7: ["destiny", "learning-materials.jpg"],
  8: ["potential", "journal-purpose.jpg"],
  9: ["identity", "mentor-guidance.jpg"],
  10: ["identity", "community.jpg"],
  11: ["source", "about-team.jpg"],
  12: ["source", "mentorship.jpg"],
  13: ["identity", "learning-together.jpg"],
  14: ["potential", "study-partners.jpg"],
  15: ["potential", "level-advanced.jpg"],
  16: ["potential", "student-study.jpg"],
  17: ["potential", "online-learning.jpg"],
  18: ["purpose", "learner-support.jpg"],
  19: ["destiny", "about-team.jpg"],
  20: ["destiny", "level-foundation.jpg"],
  21: ["purpose", "journal-purpose.jpg"],
  22: ["source", "level-intermediate.jpg"],
  23: ["potential", "study-partners.jpg"],
  24: ["identity", "learning-together.jpg"],
};

const CALL_TO_ACTION_LINKS =
  "[Join a cohort](/course#enrol) · [Partner with SPURL](/contact) · WhatsApp [+256 708 376997](https://wa.me/256708376997) · [schoolofpurposeandleadership@gmail.com](mailto:schoolofpurposeandleadership@gmail.com)";

/* ---------------------------------------------------------------- *
 * Minimal .docx reader
 * ---------------------------------------------------------------- */
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e] ?? m),
  );

function parseXml(xml) {
  const root = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  const re = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|<\?[^>]*\?>|<!--[\s\S]*?-->|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) {
      stack.at(-1).children.push({ tag: "#text", text: decode(m[5]) });
      continue;
    }
    if (!m[2]) continue;
    if (m[1]) {
      stack.pop();
      continue;
    }
    const attrs = {};
    for (const a of m[3].matchAll(/([\w:.-]+)="([^"]*)"/g)) attrs[a[1]] = decode(a[2]);
    const node = { tag: m[2], attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!m[4]) stack.push(node);
  }
  return root;
}

const find = (node, tag) => node.children?.find((c) => c.tag === tag);
function* walk(node) {
  for (const child of node.children ?? []) {
    yield child;
    yield* walk(child);
  }
}

function runText(run) {
  let out = "";
  for (const node of run.children) {
    if (node.tag === "w:t") out += node.children.map((c) => c.text ?? "").join("");
    else if (node.tag === "w:tab") out += " ";
    else if (node.tag === "w:br" || node.tag === "w:cr") out += " ";
  }
  return out;
}

const isOn = (rpr, name) => {
  const el = rpr && find(rpr, name);
  return Boolean(el) && !["0", "false", "none"].includes(el.attrs["w:val"]);
};

function inline(p) {
  const segments = [];
  for (const node of walk(p)) {
    if (node.tag !== "w:r") continue;
    const text = runText(node);
    if (!text) continue;
    const rpr = find(node, "w:rPr");
    const style = `${isOn(rpr, "w:b") ? "b" : ""}${isOn(rpr, "w:i") ? "i" : ""}`;
    if (segments.length && segments.at(-1).style === style) segments.at(-1).text += text;
    else segments.push({ text, style });
  }
  const visible = segments.filter((s) => s.text.trim());
  const markdown = segments
    .map(({ text, style }) => {
      const core = text.trim();
      if (!core || !style) return text;
      const mark = style.includes("b") ? "**" : "*";
      return `${text.slice(0, text.length - text.trimStart().length)}${mark}${core}${mark}${text.slice(text.trimEnd().length)}`;
    })
    .join("");
  return {
    markdown: tidy(markdown),
    plain: tidy(segments.map((s) => s.text).join("")),
    allBold: visible.length > 0 && visible.every((s) => s.style.includes("b")),
    allItalic: visible.length > 0 && visible.every((s) => s.style.includes("i")),
  };
}

function tidy(text) {
  return text
    .replace(/ /g, " ")
    .replace(/\*\*\s*\*\*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function readDocx(file) {
  const read = (entry) => execFileSync("unzip", ["-p", file, entry], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  const styleNames = {};
  for (const node of walk(parseXml(read("word/styles.xml")))) {
    if (node.tag !== "w:style") continue;
    styleNames[node.attrs["w:styleId"]] = find(node, "w:name")?.attrs["w:val"] ?? node.attrs["w:styleId"];
  }
  const paragraph = (p) => {
    const ppr = find(p, "w:pPr");
    const styleId = ppr && find(ppr, "w:pStyle")?.attrs["w:val"];
    const style = styleNames[styleId] ?? styleId ?? "Normal";
    const list = Boolean(ppr && find(ppr, "w:numPr")) || /list/i.test(style);
    return { type: "p", style: style.toLowerCase(), list, numbered: /number/i.test(style), ...inline(p) };
  };
  const body = find(find(parseXml(read("word/document.xml")), "w:document"), "w:body");
  const blocks = [];
  for (const el of body.children) {
    if (el.tag === "w:tbl") {
      const rows = el.children
        .filter((c) => c.tag === "w:tr")
        .map((tr) => tr.children.filter((c) => c.tag === "w:tc").map((tc) => [...walk(tc)].filter((n) => n.tag === "w:p").map(paragraph).filter((x) => x.plain)));
      blocks.push({ type: "table", rows });
    } else if (el.tag === "w:p") {
      const p = paragraph(el);
      if (p.plain) blocks.push(p);
    }
  }
  return blocks;
}

/* ---------------------------------------------------------------- *
 * Package → article
 * ---------------------------------------------------------------- */
const KEEP_CAPS = ["SPURL", "SMART", "I", "I’m", "I'm", "God", "YouLead!"];
function sentenceCase(label) {
  const words = label.toLowerCase().split(/(\s+)/);
  const fixed = words.map((word) => {
    const bare = word.replace(/[^\p{L}!’']/gu, "");
    const keep = KEEP_CAPS.find((k) => k.toLowerCase() === bare);
    return keep ? word.replace(bare, keep) : word;
  });
  return fixed
    .join("")
    .replace(/^(\W*)(\p{Ll})/u, (_, lead, ch) => lead + ch.toUpperCase())
    .replace(/([:?.!]\s+)(\p{Ll})/gu, (_, lead, ch) => lead + ch.toUpperCase());
}

const cellText = (cell) => cell.map((p) => p.plain).join(" ");
const BULLET = /^[•·▪●◦–-]\s*/;
const isBanner = (text) => /web journal|website content pack|cms metadata|website cms|web\s*\|?\s*journal|publishing package/i.test(text);
const isMarker = (text) => /copy below|begin website article|end of article|copy above/i.test(text);
const isHeadingStyle = (style) => /^heading/.test(style) || style === "title";
/* Packages without heading styles mark headings as whole-bold paragraphs: numbered steps
   ("1. Begin with a clear priority."), Title Case questions ("What Is Discipline?") and short
   phrases without closing punctuation. Bold sentences stay paragraphs. */
function boldHeading(block) {
  const text = block.plain;
  if (!block.allBold || text.length > 120) return false;
  if (/^\d+[.)]\s/.test(text)) return true;
  if (/[.!]["”’']?$/.test(text)) return false;
  if (!/\?["”’']?$/.test(text)) return true;
  const words = text.split(/\s+/).filter((word) => /^\p{L}{4,}/u.test(word));
  return words.length > 0 && words.filter((word) => /^\p{Lu}/u.test(word)).length / words.length >= 0.6;
}
const headingFor = (text) => (/^\d+[.)]\s/.test(text) ? "### " : "## ") + text.replace(/^(\d+)\)\s/, "$1. ");

function calloutBlock(cell, linksLine) {
  const [label, ...rest] = cell;
  const lines = [];
  for (const p of rest) {
    if (p.list || BULLET.test(p.plain)) lines.push(`- ${p.markdown.replace(BULLET, "")}`);
    else if (/^\d+[.)]\s/.test(p.plain)) lines.push(p.markdown.replace(/^(\d+)\)\s/, "$1. "));
    else lines.push(p.markdown);
  }
  if (linksLine) lines.push(linksLine);
  return `:::callout ${sentenceCase(label.plain.replace(/[:\s]+$/, ""))}\n${lines.join("\n")}`;
}

function tableBlock(rows) {
  const cells = rows.map((row) => row.map((cell) => cell.map((p) => p.markdown).join(" ").replace(/\|/g, "\\|")));
  const width = Math.max(...cells.map((r) => r.length));
  const line = (r) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? "").join(" | ")} |`;
  return [line(cells[0]), `| ${Array.from({ length: width }, () => "---").join(" | ")} |`, ...cells.slice(1).map(line)].join("\n");
}

function convert(file) {
  const number = Number(/Journal_(\d+)/i.exec(basename(file))?.[1] ?? 0);
  const blocks = readDocx(file);
  const meta = {};
  const out = [];
  let list = [];
  const flushList = () => {
    if (list.length) out.push(list.join("\n"));
    list = [];
  };

  // Metadata table: rows of [label, value].
  for (const block of blocks) {
    if (block.type !== "table" || !block.rows.some((r) => r.length >= 2 && /seo (page )?title|url slug|meta description/i.test(cellText(r[0])))) continue;
    block.metadata = true;
    for (const row of block.rows.filter((r) => r.length >= 2)) {
      const key = cellText(row[0]);
      const value = cellText(row[1]);
      if (/seo (page )?title/i.test(key)) meta.seoTitle = value;
      else if (/slug/i.test(key)) meta.slug = value;
      else if (/categor|tags/i.test(key)) meta.tags = value;
      else if (/reading/i.test(key)) meta.reading = value;
      else if (/meta description|description/i.test(key)) meta.description = value;
    }
  }
  const titleBase = (meta.seoTitle ?? "").replace(/\s*\|\s*SPURL Journal\s*$/i, "").trim();
  const same = (a, b) => a.replace(/\W+/g, " ").trim().toLowerCase() === b.replace(/\W+/g, " ").trim().toLowerCase();

  // The article starts at its title: a heading paragraph, or a bold paragraph equal to the SEO title.
  let titleIndex = blocks.findIndex((b) => b.type === "p" && (isHeadingStyle(b.style) || b.allBold) && titleBase && same(b.plain, titleBase));
  if (titleIndex < 0) titleIndex = blocks.findIndex((b) => b.type === "p" && /^heading 1|title/.test(b.style));
  if (titleIndex < 0) throw new Error(`${basename(file)}: could not find the article title`);
  const title = blocks[titleIndex].plain;

  let cta = null;
  let pastByline = false;
  for (const block of blocks.slice(titleIndex + 1)) {
    if (block.type === "table") {
      flushList();
      if (block.metadata) continue;
      const single = block.rows.length === 1 && block.rows[0].length === 1;
      const cell = block.rows[0]?.[0] ?? [];
      if (single && isBanner(cellText(cell))) continue;
      if (single && /^ready to deepen/i.test(cell[0]?.plain ?? "")) {
        cta = cell;
        continue;
      }
      if (single) out.push(calloutBlock(cell));
      else out.push(tableBlock(block.rows));
      continue;
    }
    const text = block.plain;
    if (isMarker(text)) continue;
    if (!pastByline && (/^by\b/i.test(text) || /editorial team/i.test(text)) && text.length < 160) {
      pastByline = true;
      continue;
    }
    pastByline = true;
    if (block.list || BULLET.test(text)) {
      list.push(`${block.numbered ? "1." : "-"} ${block.markdown.replace(BULLET, "")}`);
      continue;
    }
    flushList();
    if (isHeadingStyle(block.style) || boldHeading(block)) out.push(headingFor(text.replace(/^(\d+[.)]\s.*)\.$/, "$1")));
    else if (/quote/.test(block.style)) out.push(`> ${block.markdown}`);
    else out.push(block.markdown);
  }
  flushList();
  if (cta) out.push(calloutBlock([cta[0], ...cta.slice(1).filter((p) => !/join a cohort|whatsapp|@/i.test(p.plain))], CALL_TO_ACTION_LINKS));

  const slug = (meta.slug ?? titleBase)
    .split("/")
    .filter(Boolean)
    .at(-1)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const body = out.join("\n\n");
  const words = (body.match(/[\p{L}\p{N}’']+/gu) ?? []).length;
  const [categorySlug, cover] = PLACEMENT[number] ?? ["purpose", null];
  return {
    number,
    sourceFile: basename(file),
    slug,
    title,
    excerpt: meta.description ?? null,
    seoTitle: meta.seoTitle ?? null,
    seoDescription: meta.description ?? null,
    categorySlug,
    tags: (meta.tags ?? "").split(/\s*[•·|,]\s*/).map((t) => t.trim()).filter(Boolean),
    readingMinutes: Number(/(\d+)/.exec(meta.reading ?? "")?.[1]) || Math.max(3, Math.round(words / 220)),
    coverImageUrl: cover ? `/images/${cover}` : null,
    coverAlt: cover ? COVERS[cover] : null,
    words,
    body,
  };
}

const files = readdirSync(inputDir).filter((f) => /\.docx$/i.test(f) && !f.startsWith("~$")).sort();
const articles = files.map((f) => convert(join(inputDir, f)));
const slugs = new Set();
for (const article of articles) {
  if (!article.slug) throw new Error(`${article.sourceFile}: missing slug`);
  if (slugs.has(article.slug)) throw new Error(`${article.sourceFile}: duplicate slug ${article.slug}`);
  slugs.add(article.slug);
}
writeFileSync(resolve(outputFile), `${JSON.stringify({ series: "SPURL Journal", convertedFrom: files.length, articles }, null, 2)}\n`, "utf8");
for (const a of articles) console.log(`${String(a.number).padStart(2, "0")}  ${a.slug.padEnd(66)} ${a.categorySlug.padEnd(9)} ${a.readingMinutes}m ${a.words}w`);
console.log(`\nWrote ${articles.length} articles to ${outputFile}`);
