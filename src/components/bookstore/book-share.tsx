"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function BookShare() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch { setCopied(false); }
  };
  return <button type="button" onClick={copy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-navy/15 bg-paper px-4 py-2.5 text-xs font-semibold text-navy transition hover:border-gold hover:bg-white">{copied ? <Check className="h-4 w-4 text-source" /> : <Copy className="h-4 w-4" />}<span aria-live="polite">{copied ? "Link copied" : "Copy product link"}</span></button>;
}
