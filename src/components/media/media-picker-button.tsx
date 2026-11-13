"use client";
import { useRef, useState } from "react";
import { MediaLibrary } from "@/components/media/media-library";
export function MediaPickerButton({
  inputName,
  kind,
}: {
  inputName: string;
  kind?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        className="mt-2 text-xs font-semibold text-gold-dark underline underline-offset-4"
      >
        Choose from media library
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-label="Choose a reusable media file"
        className="m-auto max-h-[90dvh] w-[min(58rem,94vw)] overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl backdrop:bg-navy/55"
      >
        <div className="mb-5 flex justify-between gap-4">
          <h2 className="font-serif text-xl text-navy">Media library</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-full border border-navy/15 px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>
        {open ? (
          <MediaLibrary
            kind={kind}
            onSelect={(asset) => {
              const input = document.getElementsByName(inputName)[0];
              if (input instanceof HTMLInputElement) {
                const setter = Object.getOwnPropertyDescriptor(
                  HTMLInputElement.prototype,
                  "value",
                )?.set;
                setter?.call(input, asset.url);
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
              dialog.current?.close();
            }}
          />
        ) : null}
      </dialog>
    </>
  );
}
