"use client";
import { useId, useRef, useState } from "react";
import { MediaLibrary } from "@/components/media/media-library";
import { Input } from "@/components/ui/field";
export function MediaField({
  name,
  defaultValue = "",
  kind,
  placeholder,
  id,
  ...inputProps
}: {
  name: string;
  defaultValue?: string;
  kind?: string;
  placeholder?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue),
    [open, setOpen] = useState(false),
    dialog = useRef<HTMLDialogElement>(null),
    heading = useId();
  return (
    <div className="space-y-2">
      <Input
        {...inputProps}
        id={id}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder ?? "Choose a library file or enter its URL"}
        className="text-[12px]"
      />
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        className="text-xs font-semibold text-gold-dark underline underline-offset-4"
      >
        Choose from media library
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-labelledby={heading}
        className="m-auto max-h-[90dvh] w-[min(58rem,94vw)] overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl backdrop:bg-navy/55"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id={heading} className="font-serif text-2xl text-navy">
            Choose a reusable file
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-full border border-navy/15 px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </div>
        {open ? (
          <MediaLibrary
            kind={kind}
            onSelect={(asset) => {
              setValue(asset.url);
              dialog.current?.close();
            }}
          />
        ) : null}
      </dialog>
    </div>
  );
}
