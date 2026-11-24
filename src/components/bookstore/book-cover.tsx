import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  navy: "from-[#071a31] via-[#12345b] to-[#071324] text-white",
  source: "from-[#075b57] via-[#0b8079] to-[#063d3a] text-white",
  potential: "from-[#5b2e72] via-[#85509c] to-[#3b1c4d] text-white",
  destiny: "from-[#233e79] via-[#4765a6] to-[#192951] text-white",
  gold: "from-[#c28d20] via-[#e8bd58] to-[#9c6813] text-[#17243b]",
  terracotta: "from-[#7e321f] via-[#bd5b3c] to-[#572014] text-white",
};

export function BookCover({ title, author, tone = "navy", size = "card", className }: { title: string; author: string; tone?: string; size?: "card" | "hero" | "mini"; className?: string }) {
  return (
    <div className={cn("group/cover relative isolate overflow-hidden rounded-r-lg rounded-l-sm bg-gradient-to-br shadow-[10px_14px_30px_-14px_rgba(7,19,36,.62)]", TONE[tone] ?? TONE.navy, size === "hero" ? "aspect-[3/4] w-full max-w-[290px]" : size === "mini" ? "h-24 w-[72px]" : "aspect-[3/4] w-full", className)} aria-label={`${title} book cover`}>
      <span className="absolute inset-y-0 left-0 w-[7%] border-r border-white/20 bg-black/15" aria-hidden />
      <span className="absolute inset-x-[7%] top-0 h-px bg-white/35" aria-hidden />
      <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/20" aria-hidden />
      <span className="absolute -right-4 top-10 h-16 w-16 rounded-full border border-white/15" aria-hidden />
      <div className={cn("relative flex h-full flex-col", size === "mini" ? "px-3 py-3 pl-4" : "px-[13%] py-[12%]")}>
        <span className={cn("font-semibold uppercase tracking-[0.18em] opacity-75", size === "mini" ? "text-[5px]" : "text-[8px]")}>Purpose library</span>
        <span className={cn("mt-auto font-serif font-semibold leading-[1.03] tracking-[-0.025em] text-balance", size === "hero" ? "text-3xl sm:text-4xl" : size === "mini" ? "text-[10px]" : "text-xl sm:text-2xl")}>{title}</span>
        <span className={cn("mt-3 border-t border-current/25 pt-3 font-medium opacity-80", size === "mini" ? "text-[5px]" : "text-[9px] uppercase tracking-[0.12em]")}>{author}</span>
      </div>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-500 group-hover/cover:opacity-100" aria-hidden />
    </div>
  );
}
