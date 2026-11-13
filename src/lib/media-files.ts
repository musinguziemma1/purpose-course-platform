export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const MEDIA_TYPES: Record<string, { mime: string; kind: string }> = {
  jpg: { mime: "image/jpeg", kind: "image" },
  jpeg: { mime: "image/jpeg", kind: "image" },
  png: { mime: "image/png", kind: "image" },
  gif: { mime: "image/gif", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  mp4: { mime: "video/mp4", kind: "video" },
  mov: { mime: "video/quicktime", kind: "video" },
  webm: { mime: "video/webm", kind: "video" },
  mp3: { mime: "audio/mpeg", kind: "audio" },
  wav: { mime: "audio/wav", kind: "audio" },
  ogg: { mime: "audio/ogg", kind: "audio" },
  m4a: { mime: "audio/mp4", kind: "audio" },
  pdf: { mime: "application/pdf", kind: "document" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "document",
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    kind: "document",
  },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "document",
  },
  doc: { mime: "application/msword", kind: "document" },
  xls: { mime: "application/vnd.ms-excel", kind: "document" },
  ppt: { mime: "application/vnd.ms-powerpoint", kind: "document" },
  txt: { mime: "text/plain", kind: "document" },
  csv: { mime: "text/csv", kind: "document" },
  rtf: { mime: "application/rtf", kind: "document" },
  zip: { mime: "application/zip", kind: "document" },
  odt: { mime: "application/vnd.oasis.opendocument.text", kind: "document" },
  ods: {
    mime: "application/vnd.oasis.opendocument.spreadsheet",
    kind: "document",
  },
  odp: {
    mime: "application/vnd.oasis.opendocument.presentation",
    kind: "document",
  },
  epub: { mime: "application/epub+zip", kind: "document" },
};
export const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");
export const MEDIA_STAFF_ROLES = [
  "super_admin",
  "platform_admin",
  "program_manager",
  "editor",
  "instructor",
  "mentor",
  "moderator",
  "author",
];
export function canUseMediaLibrary(
  viewer: { roleSlug: string } | null | undefined,
) {
  return Boolean(viewer && MEDIA_STAFF_ROLES.includes(viewer.roleSlug));
}
export function mediaFileError(name: string, bytes: number) {
  if (
    !name ||
    name.length > 240 ||
    name.includes("/") ||
    name.includes("\\") ||
    [...name].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return "Use a file name of up to 240 characters without folders.";
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MEDIA_MAX_BYTES)
    return "Choose a nonempty file up to 50 MB.";
  if (!MEDIA_TYPES[name.toLowerCase().split(".").at(-1) ?? ""])
    return "This file format is not supported. Choose an image, audio, video, PDF, Office document, text file or ZIP archive.";
  return null;
}
export function fileSignatureMatches(name: string, bytes: Uint8Array) {
  const ext = name.toLowerCase().split(".").at(-1),
    b = Buffer.from(bytes),
    text = b.subarray(0, 16).toString("latin1");
  if (!b.length) return false;
  if (
    ["docx", "xlsx", "pptx", "odt", "ods", "odp", "epub", "zip"].includes(
      ext ?? "",
    )
  )
    return b[0] === 0x50 && b[1] === 0x4b && [3, 5, 7].includes(b[2]);
  if (["doc", "xls", "ppt"].includes(ext ?? ""))
    return b
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (ext === "pdf") return text.startsWith("%PDF-");
  if (ext === "png")
    return b
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (ext === "jpg" || ext === "jpeg")
    return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (ext === "gif") return /^GIF8[79]a/.test(text);
  if (ext === "webp")
    return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
  if (ext === "wav")
    return text.startsWith("RIFF") && text.slice(8, 12) === "WAVE";
  if (ext === "ogg") return text.startsWith("OggS");
  if (["mp4", "mov", "m4a"].includes(ext ?? ""))
    return text.slice(4, 8) === "ftyp";
  if (ext === "webm")
    return b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (ext === "mp3")
    return text.startsWith("ID3") || (b[0] === 255 && (b[1] & 0xe0) === 0xe0);
  if (ext === "rtf") return text.startsWith("{\\rtf");
  return ["txt", "csv"].includes(ext ?? "") && !b.includes(0);
}
