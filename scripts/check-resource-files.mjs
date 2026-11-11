import { readFileSync } from "node:fs";

for (const [slug, expectedPages] of [["five-principles-overview", 1], ["gifting-audit-worksheet", 2], ["vision-plan-12-months", 2]]) {
  const data = readFileSync(`public/resources/${slug}.pdf`), text = data.toString("latin1");
  const pages = (text.match(/\/Type\s*\/Page\b/g) ?? []).length;
  if (!text.startsWith("%PDF-") || !text.includes("%%EOF") || pages !== expectedPages || !/\/Marked\s+true/.test(text)) throw new Error(`Missing, invalid, untagged or incomplete starter PDF: ${slug}`);
  console.log(`${slug}: ${pages} page(s), ${data.length} bytes, tagged PDF`);
}
