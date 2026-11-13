export const EMBED_KINDS = ["image", "video", "audio", "document"] as const;
export type EmbedKind = (typeof EMBED_KINDS)[number];
export function safeContentUrl(value: string, media = false): string | null {
  if (
    !value ||
    /[\s\\]/.test(value) ||
    Array.from(value).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    value.startsWith("//")
  )
    return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (!media && ["http:", "mailto:"].includes(url.protocol)))
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function videoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.replace(/^www\./, "");
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : ["youtube.com", "youtube-nocookie.com"].includes(host)
          ? url.searchParams.get("v") ||
            /^\/(?:embed|shorts)\/([\w-]+)$/.exec(url.pathname)?.[1]
          : null;
    if (id && /^[\w-]{11}$/.test(id))
      return `https://www.youtube-nocookie.com/embed/${id}`;
    if (["vimeo.com", "player.vimeo.com"].includes(host)) {
      const match = /^\/(?:video\/)?(\d+)$/.exec(url.pathname);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
  } catch {
    /* Invalid URLs render as ordinary text. */
  }
  return null;
}
export function mediaBlock(asset: { kind: string; url: string; name: string }) {
  const kind = EMBED_KINDS.includes(asset.kind as EmbedKind)
    ? asset.kind
    : "document";
  const caption = asset.name.replace(/[\r\n]/g, " ").slice(0, 240);
  return `:::media ${kind} ${asset.url}\n${caption}\n:::`;
}
export function parseMediaBlock(block: string) {
  const match =
    /^:::media (image|video|audio|document) (\S+)\n([^\n]{0,240})\n:::$/.exec(
      block,
    );
  if (!match || !safeContentUrl(match[2], true)) return null;
  return { kind: match[1] as EmbedKind, url: match[2], caption: match[3] };
}
