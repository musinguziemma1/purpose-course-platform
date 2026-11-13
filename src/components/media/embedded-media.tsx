/* eslint-disable @next/next/no-img-element -- Authenticated media requests need browser session cookies. */
import {
  safeContentUrl,
  videoEmbedUrl,
  type EmbedKind,
} from "@/lib/content-media";
export function EmbeddedMedia({
  kind,
  url,
  caption,
}: {
  kind: EmbedKind;
  url: string;
  caption: string;
}) {
  const src = safeContentUrl(url, true);
  if (!src) return <p>Media unavailable.</p>;
  const embed = kind === "video" ? videoEmbedUrl(src) : null;
  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-navy/15 bg-paper">
      {kind === "image" ? (
        <img
          src={src}
          alt={caption || "Content illustration"}
          loading="lazy"
          className="max-h-[36rem] w-full object-contain"
        />
      ) : kind === "video" ? (
        embed ? (
          <iframe
            src={embed}
            title={caption || "Video"}
            allow="encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
        ) : (
          <video
            src={src}
            aria-label={caption || "Video"}
            controls
            playsInline
            preload="metadata"
            className="max-h-[36rem] w-full bg-black"
          >
            Your browser cannot play this video.{" "}
            <a href={src}>Download video</a>
          </video>
        )
      ) : kind === "audio" ? (
        <audio
          src={src}
          aria-label={caption || "Audio"}
          controls
          preload="metadata"
          className="my-4 w-full"
        >
          Your browser cannot play this audio. <a href={src}>Download audio</a>
        </audio>
      ) : (
        <a
          href={src}
          className="flex min-h-16 items-center gap-3 px-5 py-4 font-semibold text-navy underline decoration-gold underline-offset-4"
        >
          Download {caption || "learning material"}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      )}
      {caption && kind !== "document" ? (
        <figcaption className="border-t border-navy/10 px-4 py-3 text-sm text-stone-600">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
