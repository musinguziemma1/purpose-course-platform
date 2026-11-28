// Imports the programme workbooks (.docx) into src/lib/curriculum/workbooks.ts.
//
//   node scripts/import-curriculum-workbooks.mjs "D:/path/to/purpose-course-programs"
//
// The folder holds one sub-folder per programme, each with three level workbooks.
// Every module follows the workbook template: A Level Introduction, B Module
// Introduction, C Learning Objectives, D Key Learning Areas, E Reflection,
// F Module Assessment, G Next Module. The importer keeps that text verbatim,
// applies the small correction table below (inconsistencies inside the
// workbooks themselves), validates every count and refuses to write on any gap.
// Nothing in the documents is executed: a .docx is a ZIP of XML, read with zlib.
import { inflateRawSync } from "node:zlib";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROGRAMMES = [
  { folder: "Purpose Program for Adults", slug: "purpose-program-adults", modulesPerLevel: [5, 5, 5], areasPerModule: 5 },
  { folder: "Purpose Program for Schools", slug: "purpose-program-schools", modulesPerLevel: [5, 5, 5], areasPerModule: 5 },
  { folder: "YouLead!", slug: "youlead", modulesPerLevel: [4, 4, 4], areasPerModule: 4 },
  { folder: "Purpose-to-Peace", slug: "purpose-to-peace", modulesPerLevel: [3, 3, 3], areasPerModule: 5 },
];

// Corrections for inconsistencies inside the workbooks. Each level workbook is
// authoritative for its own title and module codes; bridges that name a level
// or module range differently are aligned to it.
const BRIDGE_CORRECTIONS = [
  ["Level 2: Discovery & Alignment", "Level 2: Intermediate – Purpose Discovery and Clarity"],
  ["Level 3: Advanced – Purpose Execution, Leadership & Impact", "Level 3: Advanced – Influence and Impact"],
  // Schools Level 2 bridge used the Adults Level 3 title.
  ["Purpose Programme for Schools! Having mastered purposeful planning, gift stewardship, healthy relationships, positive influence, and lifestyle consistency, you are now ready to advance to Level 3: Advanced – Influence and Impact", "Purpose Programme for Schools! Having mastered purposeful planning, gift stewardship, healthy relationships, positive influence, and lifestyle consistency, you are now ready to advance to Level 3: Advanced – Purpose, Leadership and Impact"],
  // Purpose-to-Peace Level 1 named the Level 2 modules P2P 201–203; the Level 2 workbook uses P2P 104, P2P 105 and P2P 201.
  ["(Modules P2P 201 – P2P 203)", "(Modules P2P 104, P2P 105 and P2P 201)"],
];

// ---------------------------------------------------------------- docx → lines
function readZipEntry(buffer, wanted) {
  let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip archive");
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    if (buffer.toString("utf8", offset + 46, offset + 46 + nameLength) === wanted) {
      const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(start, start + size);
      return method === 0 ? data.toString("utf8") : inflateRawSync(data).toString("utf8");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

const decode = (text) =>
  text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function runText(xml) {
  let out = "";
  for (const token of xml.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\/>|<w:br\/>|<w:br\s[^>]*\/>/g) || []) {
    if (token.startsWith("<w:tab")) out += "\t";
    else if (token.startsWith("<w:br")) out += " / ";
    else out += decode(token.replace(/<[^>]+>/g, ""));
  }
  return out.replace(/\s+$/g, "");
}

function paragraphLine(xml, styles) {
  const text = runText(xml);
  if (!text.trim()) return null;
  const styleId = (xml.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
  const style = (styles[styleId] || styleId).toLowerCase();
  if (/<w:numPr>/.test(xml) || /list/.test(style)) return `- ${text}`;
  const bold = /<w:b\/>|<w:b w:val="(1|true)"\/>/.test(xml) && text.length < 160;
  return bold ? `**${text}**` : text;
}

function tableLines(xml) {
  return (xml.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || []).map((row) => {
    const cells = (row.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map((cell) =>
      (cell.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []).map(runText).filter(Boolean).join(" <br> ").replace(/\|/g, "\\|"),
    );
    return `| ${cells.join(" | ")} |`;
  });
}

function docxLines(file) {
  const buffer = readFileSync(file);
  const documentXml = readZipEntry(buffer, "word/document.xml");
  if (!documentXml) throw new Error(`${file}: word/document.xml not found`);
  const styles = {};
  for (const match of (readZipEntry(buffer, "word/styles.xml") || "").matchAll(/<w:style [^>]*w:styleId="([^"]+)"[^>]*>[\s\S]*?<w:name w:val="([^"]+)"/g)) styles[match[1]] = match[2];
  const body = documentXml.slice(documentXml.indexOf("<w:body>") + 8, documentXml.lastIndexOf("</w:body>"));
  const lines = [];
  let index = 0;
  while (index < body.length) {
    const table = body.indexOf("<w:tbl>", index);
    const found = body.slice(index).search(/<w:p[\s>]/);
    const paragraph = found === -1 ? -1 : index + found;
    if (table !== -1 && (paragraph === -1 || table < paragraph)) {
      const tags = /<w:tbl>|<\/w:tbl>/g;
      tags.lastIndex = table;
      let depth = 0, end = body.length, tag;
      while ((tag = tags.exec(body))) {
        depth += tag[0] === "<w:tbl>" ? 1 : -1;
        if (depth === 0) { end = tags.lastIndex; break; }
      }
      lines.push(...tableLines(body.slice(table, end)));
      index = end;
    } else if (paragraph !== -1) {
      const open = body.slice(paragraph, body.indexOf(">", paragraph) + 1);
      const stop = open.endsWith("/>") ? paragraph + open.length : body.indexOf("</w:p>", paragraph) + 6;
      const line = open.endsWith("/>") ? null : paragraphLine(body.slice(paragraph, stop), styles);
      if (line) lines.push(line);
      index = stop;
    } else break;
  }
  return lines;
}

// ---------------------------------------------------------------- lines → modules
const strip = (text) => text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
const NUL = "\u0000";
const cellsOf = (line) => line.replace(/\\\|/g, NUL).replace(/^\|\s*|\s*\|$/g, "").split("|").map((cell) => cell.replaceAll(NUL, "|").trim());
const isTable = (line) => line.startsWith("|");
const isFiller = (line) => !line.trim() || line.trim() === "/" || /^\|(\s*\|)+$/.test(line.trim());
const segmentsOf = (line) =>
  (isTable(line) ? cellsOf(line).join(" <br> ") : line)
    .split(/<br>| \/ (?=\S)/)
    .map((part) => strip(part).replace(/_{4,}.*$/, "").trim())
    .filter((part) => part && !/^[_\s.]+$/.test(part));

const SECTIONS = {
  A: /^A\.\s*Level Introduction/i,
  B: /^B\.\s*Module Introduction/i,
  C: /^C\.\s*Learning Objectives/i,
  D: /^D\.\s*Key Learning Areas/i,
  E: /^E\.\s*(Personal\s+)?Reflection/i,
  F: /^F\.\s*Module Assessment/i,
  G: /^G\.\s*Next\s*(Module|Level|Step|Steps)?/i,
};
const ITEM = /^(?:[-•▪◦●✓✔➤]|Q?\d{1,2}[.):]|Reflection\s*\d+\s*[.:)])\s*/i;
const INSTRUCTION = /^(After completing|Answer the following|Use the lined|Take quiet time|Personal Reflection|Reflect personally|Reflection Prompts)/i;

function sectionOf(line) {
  const text = strip(isTable(line) ? cellsOf(line).join(" ") : line);
  for (const [key, pattern] of Object.entries(SECTIONS)) {
    if (!pattern.test(text)) continue;
    const inline = text.replace(pattern, "").replace(/^[^:]*?:\s*/, (prefix) => (prefix.length < 40 ? "" : prefix)).trim();
    return { key, inline: key === "G" && inline.length > 30 ? inline : "" };
  }
  return null;
}

function bannerModule(line) {
  if (!isTable(line) || cellsOf(line).length !== 1) return null;
  const parts = cellsOf(line)[0].split(/<br>/).map(strip);
  const at = parts.findIndex((part) => /\bModule\s+\d+\b/i.test(part));
  if (at === -1) return null;
  const match = parts[at].match(/\bModule\s+(\d+)\b\s*(.*)$/i);
  const rest = match[2].trim();
  let title;
  if (/^[:—–-]/.test(rest)) title = rest.replace(/^[:—–-]\s*/, "").split(" | ")[0];
  else if (!rest || rest.startsWith("(")) title = parts[at + 1] ?? "";
  else return null;
  title = title.replace(/\s*\|\s*Module \d+ of Level \d+.*$/i, "").trim();
  const coded = title.match(/^((?:PURP|P2P)\s*\d{3})\s*[—–-]\s*(.+)$/i);
  return { number: Number(match[1]), code: coded ? coded[1].toUpperCase() : null, title: coded ? coded[2] : title };
}

function levelOverview(preamble) {
  // Raw lines: a multi-column table row is never the overview; a one-cell box may be.
  const textOf = (line) => (isTable(line) ? (cellsOf(line).length === 1 ? cellsOf(line)[0] : null) : line);
  for (let i = 0; i < preamble.length; i++) {
    const line = textOf(preamble[i]);
    if (line === null || !/(overview|introduction)/i.test(line)) continue;
    const next = preamble[i + 1] === undefined ? "" : textOf(preamble[i + 1]) ?? "";
    const text = strip(line.includes("<br>") ? line.slice(line.indexOf("<br>") + 4) : next);
    if (text.length > 200) return text;
  }
  return "";
}

function splitArea(text) {
  const colon = text.indexOf(": ");
  const dash = text.indexOf(" — ", text.startsWith("Topic") ? text.indexOf(" — ") + 3 : 0);
  const at = colon !== -1 && colon < 100 ? colon : dash !== -1 && dash < 100 ? dash : -1;
  return at === -1 ? { title: text, description: "" } : { title: text.slice(0, at).trim(), description: text.slice(at + (text[at] === ":" ? 2 : 3)).trim() };
}

function trimBridge(text) {
  // Capstone pages that follow the final bridge are not part of it.
  let bridge = text.replace(/\s+(?:PROGRAMME \d+: [^—]+—\s*)?LEVEL \d+[^.]{0,80}?(?:CAPSTONE|ACTION COMMITMENT)[\s\S]*$/, "").trim();
  for (const [from, to] of BRIDGE_CORRECTIONS) bridge = bridge.replace(from, to);
  return bridge;
}

function parseWorkbook(file) {
  const level = { preamble: [], modules: [] };
  let current = null, section = null, done = false;
  for (const raw of docxLines(file)) {
    if (isFiller(raw)) continue;
    const line = raw.trim();
    if (/(INSERT|PLACEHOLDER)[^\]]*(PICTURE|VISUAL|IMAGE)|VISUAL INSERTION FRAME|MODULE VISUALS/i.test(line)) continue;
    if (current && !done && section === "G" && !current.raw.G.length) { current.raw.G.push(line); continue; }
    const boxed = current && !done && isTable(line) && cellsOf(line).length === 1 ? sectionOf(line) : null;
    if (boxed) { section = boxed.key; if (boxed.inline) current.raw[section].push(boxed.inline); continue; }
    const banner = bannerModule(line);
    if (banner) { current = { ...banner, raw: { A: [], B: [], C: [], D: [], E: [], F: [], G: [] } }; level.modules.push(current); section = null; done = false; continue; }
    if (current && !done) {
      const heading = sectionOf(line);
      if (heading) { section = heading.key; if (heading.inline) current.raw.G.push(heading.inline); continue; }
      if (section === "G" && current.raw.G.length && (/^\*\*/.test(line) || (isTable(line) && cellsOf(line).length > 1))) { done = true; continue; }
      if (section) { current.raw[section].push(line); continue; }
    }
    if (!current) level.preamble.push(line);
  }
  return {
    overview: levelOverview(level.preamble),
    modules: level.modules.map((module) => {
      const items = (key) => module.raw[key].flatMap(segmentsOf).filter((part) => ITEM.test(part)).map((part) => part.replace(ITEM, "").trim());
      const prose = (key) => module.raw[key].flatMap(segmentsOf).filter((part) => !INSTRUCTION.test(part)).join(" ").trim();
      let reflections = items("E");
      if (!reflections.length) reflections = module.raw.E.flatMap(segmentsOf).filter((part) => part.endsWith("?"));
      return {
        number: module.number,
        code: module.code,
        title: module.title,
        levelIntroduction: prose("A"),
        introduction: prose("B"),
        objectives: items("C"),
        keyAreas: items("D").map(splitArea),
        reflections,
        assessmentQuestions: items("F"),
        nextModule: trimBridge(prose("G")),
      };
    }),
  };
}

// ---------------------------------------------------------------- run
const root = process.argv[2];
if (!root || !existsSync(root)) {
  console.error('Usage: node scripts/import-curriculum-workbooks.mjs "<folder with one sub-folder per programme>"');
  process.exit(1);
}
const problems = [];
const output = {};
for (const programme of PROGRAMMES) {
  const folder = join(root, programme.folder);
  if (!existsSync(folder)) { problems.push(`missing folder: ${programme.folder}`); continue; }
  output[programme.slug] = {};
  for (const name of readdirSync(folder).filter((file) => /\.docx$/i.test(file) && !file.startsWith("~$")).sort()) {
    const levelNumber = Number((name.match(/Level_(\d)/) || [])[1]);
    if (!levelNumber) { problems.push(`${programme.folder}/${name}: no level number in the file name`); continue; }
    const level = parseWorkbook(join(folder, name));
    const where = `${programme.folder} level ${levelNumber}`;
    if (level.overview.length < 200) problems.push(`${where}: level overview not found`);
    if (level.modules.length !== programme.modulesPerLevel[levelNumber - 1]) problems.push(`${where}: ${level.modules.length} modules`);
    for (const mod of level.modules) {
      const id = `${where} module ${mod.number}`;
      if (!mod.levelIntroduction || !mod.introduction || !mod.nextModule) problems.push(`${id}: missing A, B or G`);
      if (mod.objectives.length !== 5) problems.push(`${id}: ${mod.objectives.length} objectives`);
      if (mod.keyAreas.length !== programme.areasPerModule || mod.keyAreas.some((area) => !area.description)) problems.push(`${id}: key learning areas malformed`);
      if (mod.reflections.length !== 2) problems.push(`${id}: ${mod.reflections.length} reflections`);
      if (mod.assessmentQuestions.length !== 5) problems.push(`${id}: ${mod.assessmentQuestions.length} assessment questions`);
    }
    output[programme.slug][levelNumber] = { source: name, ...level };
  }
}
if (problems.length) {
  console.error(`Import refused, ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "curriculum", "workbooks.ts");
const banner = `// Generated by scripts/import-curriculum-workbooks.mjs from the programme workbooks.
// Do not edit by hand: update the .docx workbooks and run the importer again.
// Text is verbatim except for the documented bridge corrections in the importer.
import type { WorkbookLibrary } from "./types";

export const WORKBOOKS: WorkbookLibrary = ${JSON.stringify(output, null, 2)};
`;
writeFileSync(target, banner);
const levels = Object.values(output).flatMap((programme) => Object.values(programme));
const modules = levels.flatMap((level) => level.modules);
console.log(`Wrote ${basename(target)}: ${Object.keys(output).length} programmes, ${levels.length} levels, ${modules.length} modules, ${modules.reduce((sum, module) => sum + module.assessmentQuestions.length, 0)} assessment questions.`);
