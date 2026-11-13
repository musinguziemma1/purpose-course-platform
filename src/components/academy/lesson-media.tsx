"use client";

import { useState } from "react";
import { Download, FileAudio, ImageIcon, Video } from "lucide-react";
import { safeContentUrl, videoEmbedUrl } from "@/lib/content-media";

export function LessonMedia({
  kind,
  videoUrl,
  audioUrl,
  imageUrl,
  imageAlt,
  downloadUrl,
  downloadLabel,
}: {
  kind: string;
  videoUrl: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  downloadUrl: string | null;
  downloadLabel: string | null;
}) {
  const [playing, setPlaying] = useState(kind === "video" || kind === "audio");
  if ([videoUrl, audioUrl, imageUrl, downloadUrl].some(url => url && !safeContentUrl(url, true))) return <p className="text-sm text-stone-500">This media link needs to be corrected by your course team.</p>;

  if (kind === "video" && videoUrl) {
    const embedUrl = videoEmbedUrl(videoUrl);
    return (
      <div className="overflow-hidden rounded-xl border border-navy/10 bg-ink">
        {embedUrl ? (
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title="Lesson video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : (
          <video controls poster={imageUrl ?? undefined} className="aspect-video w-full bg-black" preload="metadata">
            <source src={videoUrl} />
            Your browser cannot play this video. <a href={videoUrl}>Download it instead.</a>
          </video>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <figure className="overflow-hidden rounded-xl border border-navy/10">
          <div className="relative aspect-[16/9] w-full bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={imageAlt ?? "Lesson illustration"} className="h-full w-full object-cover" loading="lazy" />
          </div>
          {imageAlt ? (
            <figcaption className="flex items-center gap-1.5 border-t border-navy/8 bg-cream/50 px-3 py-2 text-[11px] text-stone-500">
              <ImageIcon className="h-3 w-3" /> {imageAlt}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {audioUrl ? (
        <div className="rounded-xl border border-navy/10 bg-paper p-4">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            <FileAudio className="h-3.5 w-3.5" /> Audio teaching
          </p>
          {playing ? (
            <audio controls className="mt-2 w-full" src={audioUrl} preload="metadata">
              Your browser cannot play this audio.
            </audio>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-navy px-4 text-[12px] font-medium text-paper hover:bg-navy-700"
            >
              <Video className="h-3.5 w-3.5" /> Load audio player
            </button>
          )}
        </div>
      ) : null}

      {downloadUrl ? (
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-paper px-4 py-2 text-[12px] font-medium text-navy transition-colors hover:border-gold hover:text-gold-dark"
        >
          <Download className="h-3.5 w-3.5" /> {downloadLabel ?? "Download the worksheet"}
        </a>
      ) : null}
    </div>
  );
}
