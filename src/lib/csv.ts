/** One CSV cell, quoted, with spreadsheet formulas neutralised (OWASP CSV injection). */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export const csvRow = (values: unknown[]) => values.map(csvCell).join(",");
