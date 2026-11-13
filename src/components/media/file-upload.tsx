"use client";
import { useRef, useState, useEffect } from "react";
import { UploadCloud } from "lucide-react";
import { MEDIA_ACCEPT, mediaFileError } from "@/lib/media-files";

export type UploadedAsset = {
  id: string;
  url: string;
  name: string;
  kind: string;
};

export function FileUpload({
  purpose,
  onUploaded,
  onBusyChange,
}: {
  purpose: "library" | "submission";
  onUploaded: (asset: UploadedAsset) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState("");
  const request = useRef<XMLHttpRequest | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function upload(files: File[]) {
    setBusy(true);
    onBusyChange?.(true);
    setMessage("");
    try {
      for (const file of files) {
        const invalid = mediaFileError(file.name, file.size);
        if (invalid) throw new Error(invalid);
        setProgress(0);
        setMessage(`Preparing ${file.name}…`);
        const response = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            byteSize: file.size,
            purpose,
          }),
        });
        const reserved = await response.json();
        if (!response.ok || !reserved.ok)
          throw new Error(reserved.error ?? "The upload could not be started.");
        setMessage(`Uploading ${file.name}…`);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          request.current = xhr;
          xhr.open("PUT", reserved.signedUrl);
          xhr.timeout = 600000;
          xhr.setRequestHeader("Content-Type", reserved.mimeType);
          xhr.setRequestHeader("apikey", reserved.publicKey);
          xhr.setRequestHeader("x-upsert", "false");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable)
              setProgress(Math.round((100 * event.loaded) / event.total));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(
                  new Error(
                    "The file upload failed. Choose the file again to retry.",
                  ),
                );
          xhr.onerror = xhr.ontimeout = () =>
            reject(
              new Error(
                "The upload was interrupted. Check your connection and choose the file again.",
              ),
            );
          xhr.onabort = () => reject(new Error("Upload cancelled."));
          xhr.send(file);
        });
        setMessage(`Checking ${file.name}…`);
        const completed = await fetch(`/api/media/${reserved.id}`, {
          method: "POST",
        });
        const result = await completed.json();
        if (!completed.ok || !result.ok)
          throw new Error(
            result.error ?? "The uploaded file could not be verified.",
          );
        onUploaded(result);
        setMessage(`${file.name} is ready.`);
        setProgress(100);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The file could not be uploaded.",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      request.current = null;
    }
  }
  return (
    <div className="rounded-xl border border-dashed border-navy/25 bg-cream/40 p-4">
      <label
        className={`flex cursor-pointer items-center gap-3 text-sm font-semibold text-navy ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <UploadCloud className="h-6 w-6 text-gold-dark" />
        <span>
          {purpose === "library"
            ? "Upload media files"
            : "Attach a file to your response"}
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Images, videos, audio, PDF, Office documents and more · up to 50 MB
            per file
          </span>
        </span>
        <input
          type="file"
          aria-label={
            purpose === "library"
              ? "Upload media files"
              : "Assignment attachment"
          }
          className="sr-only"
          accept={MEDIA_ACCEPT}
          multiple={purpose === "library"}
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void upload(files);
          }}
        />
      </label>
      {busy ? (
        <div className="mt-3">
          <progress
            max={100}
            value={progress}
            aria-label="Upload progress"
            className="h-2 w-full accent-gold"
          />
          <p className="mt-1 text-xs text-stone-500">{progress}%</p>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="mt-2 break-words text-xs text-stone-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
