import { Compass, Home, Star, Target, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  user: User,
  home: Home,
  target: Target,
  star: Star,
  compass: Compass,
};

const ACCENTS: Record<string, { bg: string; fg: string; soft: string; border: string }> = {
  navy: { bg: "bg-[#122a4d]", fg: "text-[#122a4d]", soft: "bg-[#eaeef5]", border: "border-[#122a4d]" },
  green: { bg: "bg-[#2f6b40]", fg: "text-[#2f6b40]", soft: "bg-[#e8f1e8]", border: "border-[#2f6b40]" },
  gold: { bg: "bg-[#b98a1f]", fg: "text-[#b98a1f]", soft: "bg-[#f7eecf]", border: "border-[#b98a1f]" },
  purple: { bg: "bg-[#5a3a8a]", fg: "text-[#5a3a8a]", soft: "bg-[#eee9f6]", border: "border-[#5a3a8a]" },
  teal: { bg: "bg-[#155e63]", fg: "text-[#155e63]", soft: "bg-[#e3eff0]", border: "border-[#155e63]" },
  stone: { bg: "bg-stone-700", fg: "text-stone-700", soft: "bg-stone-100", border: "border-stone-400" },
};

export function accentClasses(accent: string | null | undefined) {
  return ACCENTS[accent ?? "navy"] ?? ACCENTS.navy;
}

export function PrincipleIcon({
  icon,
  accent = "navy",
  className,
  size = "md",
}: {
  icon: string;
  accent?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = ICONS[icon] ?? Compass;
  const dimensions =
    size === "sm" ? "h-9 w-9 rounded-full" : size === "lg" ? "h-16 w-16 rounded-full" : "h-12 w-12 rounded-full";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-paper ring-4 ring-white/20",
        accentClasses(accent).bg,
        dimensions,
        className,
      )}
    >
      <Icon className={iconSize} strokeWidth={1.7} />
    </span>
  );
}
