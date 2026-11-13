"use client";
/* eslint-disable @next/next/no-img-element -- Private image requests need the signed-in browser's cookies. */
import { useEffect, useState } from "react";
import { FileText, Search, Check, Copy } from "lucide-react";
import { FileUpload, type UploadedAsset } from "@/components/media/file-upload";

type Asset = UploadedAsset & { byteSize?: number; mimeType?: string };
export function MediaLibrary({
  onSelect,
  kind,
}: {
  onSelect?: (asset: Asset) => void;
  kind?: string;
}) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [copied, setCopied] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/media?q=${encodeURIComponent(query)}&offset=${offset}&kind=${encodeURIComponent(kind ?? "")}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setAssets(
          data.assets.map((asset: Asset & { name: string | null }) => ({
            ...asset,
            name: asset.name || "Library file",
          })),
        );
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "The library could not be loaded.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, offset, revision, kind]);
  const visible = assets.filter((asset) => !kind || asset.kind === kind);
  return (
    <div className="space-y-5">
      <FileUpload
        purpose="library"
        onUploaded={() => {
          setOffset(0);
          setRevision((value) => value + 1);
        }}
      />
      <label className="flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-3">
        <Search className="h-4 w-4 shrink-0 text-stone-400" />
        <input
          aria-label="Search media files"
          placeholder="Search files by name…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOffset(0);
          }}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="text-sm text-stone-500">
          Loading your media…
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((asset) => (
            <article
              key={asset.id}
              className="overflow-hidden rounded-xl border border-navy/10 bg-paper"
            >
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-cream">
                {asset.kind === "image" ? (
                  <img
                    src={asset.url}
                    alt={asset.name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : asset.kind === "video" ? (
                  <video
                    controls
                    preload="metadata"
                    className="h-full w-full"
                    src={asset.url}
                    aria-label={asset.name}
                  />
                ) : asset.kind === "audio" ? (
                  <audio
                    controls
                    preload="none"
                    className="w-full px-3"
                    src={asset.url}
                    aria-label={asset.name}
                  />
                ) : (
                  <FileText className="h-12 w-12 text-navy/35" />
                )}
              </div>
              <div className="p-4">
                <h3 className="break-words text-sm font-semibold text-navy">
                  {asset.name}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {asset.kind}{" "}
                  {asset.byteSize
                    ? `· ${(asset.byteSize / 1024 / 1024).toFixed(2)} MB`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-navy">
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(asset)}
                      className="rounded-full bg-navy px-3 py-1.5 text-paper"
                    >
                      Use this file
                    </button>
                  ) : null}
                  <a
                    href={`/api/media/${asset.id}?download=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-navy/15 px-3 py-1.5"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(asset.url);
                        setCopied(asset.id);
                      } catch {
                        setError(
                          "Clipboard unavailable. Select the file link below to copy it.",
                        );
                      }
                    }}
                  >
                    {copied === asset.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied === asset.id ? "Copied" : "Copy reusable link"}
                  </button>
                </div>
                <input
                  aria-label={`Reusable link for ${asset.name}`}
                  readOnly
                  value={asset.url}
                  onFocus={(event) => event.target.select()}
                  className="mt-3 w-full rounded border border-navy/10 bg-cream/50 px-2 py-1.5 text-[11px] text-stone-500"
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !visible.length && !error ? (
        <p className="rounded-xl bg-cream p-6 text-center text-sm text-stone-500">
          No matching files yet. Upload a file to start your shared library.
        </p>
      ) : null}
      <div className="flex justify-between text-sm">
        <button
          type="button"
          disabled={!offset || loading}
          className="disabled:opacity-30"
          onClick={() => setOffset((value) => Math.max(0, value - 40))}
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={assets.length < 40 || loading}
          className="disabled:opacity-30"
          onClick={() => setOffset((value) => value + 40)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
