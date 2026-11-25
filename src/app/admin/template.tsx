import type { ReactNode } from "react";

/**
 * Templates remount on every navigation, so each admin page's top-level
 * blocks rise in, in order (.console-enter in console.css). Server re-renders
 * after an action keep the same element and do not replay it.
 */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <div className="console-enter">{children}</div>;
}
