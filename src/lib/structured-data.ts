/** Preserve valid JSON while preventing HTML's script end-tag parser from escaping it. */
export function serializeStructuredData(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
