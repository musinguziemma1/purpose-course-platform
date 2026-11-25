import type { ReactNode } from "react";

/**
 * Templates remount on every navigation between learner sections, so each
 * page's top-level blocks rise in once, in order (.lk-page in learn-kit.css).
 * Server re-renders after an action keep the same element and do not replay it.
 */
export default function LearnTemplate({ children }: { children: ReactNode }) {
  return <div className="lk-page">{children}</div>;
}
