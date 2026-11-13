"use client";
import { useId, useRef, useState } from "react";
import { MediaLibrary } from "@/components/media/media-library";
import { mediaBlock } from "@/lib/content-media";
import { renderRichText } from "@/lib/markdown";
type Props = {
  name: string;
  defaultValue?: string;
  id?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  "aria-describedby"?: string;
};
export function MediaEditor({
  defaultValue = "",
  id,
  rows = 12,
  className = "",
  ...props
}: Props) {
  const generated = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    textarea = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue),
    [open, setOpen] = useState(false),
    [preview, setPreview] = useState(false);
  function close() {
    dialog.current?.close();
    setOpen(false);
  }
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-t-lg border border-navy/15 bg-cream/40 p-2">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            dialog.current?.showModal();
          }}
          className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-paper"
        >
          Insert media
        </button>
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
          className="rounded-full border border-navy/20 px-3 py-2 text-xs font-semibold text-navy"
        >
          {preview ? "Hide preview" : "Preview content"}
        </button>
        <span className="text-xs text-stone-500">
          Headings, lists, links, images, video, audio and files
        </span>
      </div>
      <textarea
        {...props}
        id={id ?? generated}
        ref={textarea}
        rows={rows}
        value={value}
        maxLength={props.maxLength ?? 200000}
        onChange={(event) => setValue(event.target.value)}
        className={`w-full min-w-0 rounded-lg border border-navy/20 bg-white p-3 text-sm leading-relaxed text-navy focus:border-gold focus:outline-none ${className}`}
      />
      {preview ? (
        <div
          aria-label="Content preview"
          className="min-h-40 rounded-lg border border-navy/15 p-5"
        >
          {value ? (
            renderRichText(value)
          ) : (
            <p className="text-sm text-stone-500">
              Add some content to preview it.
            </p>
          )}
        </div>
      ) : null}
      <p className="text-xs text-stone-500">
        Select a position in your text, then insert a file from the shared
        library. Add descriptive captions for images and transcripts for audio
        or video.
      </p>
      <dialog
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        aria-label="Insert media into content"
        className="m-auto max-h-[85dvh] w-[min(94vw,64rem)] overflow-y-auto rounded-2xl bg-paper p-5 backdrop:bg-ink/60"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-navy">
            Insert media into content
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-navy/20 px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>
        {open ? (
          <MediaLibrary
            onSelect={(asset) => {
              const start = textarea.current?.selectionStart ?? value.length,
                end = textarea.current?.selectionEnd ?? start;
              const insert = `\n\n${mediaBlock(asset)}\n\n`;
              setValue(value.slice(0, start) + insert + value.slice(end));
              setPreview(false);
              close();
              requestAnimationFrame(() => {
                textarea.current?.focus();
                textarea.current?.setSelectionRange(
                  start + insert.length,
                  start + insert.length,
                );
              });
            }}
          />
        ) : null}
      </dialog>
    </div>
  );
}
