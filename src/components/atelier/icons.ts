import { createElement } from "react";
import { Compass, Home, Star, Target, User, type LucideIcon, type LucideProps } from "lucide-react";

/** Icon for each principle's `icon` key (see PRINCIPLES in lib/media). */
const PRINCIPLE_ICONS: Record<string, LucideIcon> = { user: User, home: Home, target: Target, star: Star, compass: Compass };

/** Renders the icon for a principle key; unknown keys fall back to a compass. */
export function PrincipleGlyph({ icon, ...props }: { icon: string } & LucideProps) {
  return createElement(PRINCIPLE_ICONS[icon] ?? Compass, props);
}
