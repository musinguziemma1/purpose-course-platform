export const STARTER_RESOURCES = {
  "five-principles-overview": { url: "/resources/five-principles-overview.pdf", pages: 1 },
  "gifting-audit-worksheet": { url: "/resources/gifting-audit-worksheet.pdf", pages: 2 },
  "vision-plan-12-months": { url: "/resources/vision-plan-12-months.pdf", pages: 2 },
} as const;

/** Local files are explicit; future uploaded assets may use HTTPS storage URLs. */
export function resourceFileTarget(fileUrl: string | null) {
  if (!fileUrl || /[\s\x00-\x1f\x7f]/.test(fileUrl)) return null;
  if (Object.values(STARTER_RESOURCES).some((entry) => entry.url === fileUrl)) return fileUrl;
  try {
    const url = new URL(fileUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    return url.href;
  } catch { return null; }
}
