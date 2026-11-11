"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { PRINCIPLES } from "@/lib/media";
import { cn } from "@/lib/utils";

export function NewsletterForm({
  variant = "light",
  source = "website",
  className,
}: {
  variant?: "light" | "dark";
  source?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [principle, setPrinciple] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName: name || undefined, principle: principle || undefined, source }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setState("done");
      setMessage(data.message ?? "You are on the list.");
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm",
          variant === "dark" ? "border-gold/40 bg-white/5 text-paper" : "border-source/30 bg-source/5 text-source",
          className,
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-source text-paper">
          <Check className="h-4 w-4" />
        </span>
        <span>{message}</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="First name (optional)"
          className={cn("sm:max-w-40", variant === "dark" && "border-white/20 bg-white/10 text-paper placeholder:text-paper/50")}
          aria-label="First name"
        />
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          className={cn("flex-1", variant === "dark" && "border-white/20 bg-white/10 text-paper placeholder:text-paper/50")}
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark hover:text-paper disabled:opacity-60"
        >
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Subscribe
        </button>
      </div>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={principle}
          onChange={(event) => setPrinciple(event.target.value)}
          className={cn(
            "h-9 text-xs sm:max-w-60",
            variant === "dark" && "border-white/20 bg-white/10 text-paper",
          )}
          aria-label="Which principle do you want to grow in?"
        >
          <option value="">Which principle are you exploring?</option>
          {PRINCIPLES.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name} — {item.question}
            </option>
          ))}
        </Select>
        <p className={cn("text-[11px]", variant === "dark" ? "text-paper/50" : "text-stone-500")}>
          Weekly reflections. No noise. Unsubscribe anytime.
        </p>
      </div>
      {state === "error" ? <p className="mt-2 text-xs font-medium text-rose-500">{message}</p> : null}
    </form>
  );
}
