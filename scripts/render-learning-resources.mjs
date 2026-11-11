import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Rendering is an authoring tool; the deployed application serves committed PDFs.
const modulePath = resolve(process.argv[2] ?? ".local/resource-tools/node_modules/playwright/index.mjs");
if (!existsSync(modulePath)) throw new Error("Install the authoring tool: npm install --prefix .local/resource-tools --save-exact playwright@1.65.0. Chrome must also be installed.");
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ channel: "chrome", headless: true });
mkdirSync("public/resources", { recursive: true });
try {
  for (const slug of ["five-principles-overview", "gifting-audit-worksheet", "vision-plan-12-months"]) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve(`docs/resources/${slug}.html`)).href);
    await page.emulateMedia({ media: "print" });
    const fits = await page.locator(".sheet").evaluateAll((sheets) => sheets.every((sheet) => {
      const footer = sheet.querySelector("footer").getBoundingClientRect();
      return sheet.scrollHeight <= sheet.clientHeight && Array.from(sheet.children).filter((child) => child.tagName !== "FOOTER").every((child) => child.getBoundingClientRect().bottom < footer.top - 8);
    }));
    if (!fits) throw new Error(`Content overlaps a page boundary or footer: ${slug}`);
    await page.pdf({ path: resolve(`public/resources/${slug}.pdf`), format: "A4", printBackground: true, preferCSSPageSize: true, tagged: true, outline: true });
    console.log(`Rendered ${slug}.pdf`);
    await page.close();
  }
} finally { await browser.close(); }
