"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Arms a scroll reveal for the atelier surfaces (see app/(site)/atelier.css).
 *
 * After hydration, an element still below the fold gets data-reveal="armed"
 * (its .at-* children take their hidden pose), then "shown" once it scrolls
 * into view, so the CSS transitions play exactly once. Anything already on
 * screen, every reduced-motion visitor and every no-JS visitor simply sees
 * the finished state: nothing is hidden before JavaScript runs.
 */
export function InView({
  children,
  className,
  style,
  as: Tag = "div",
  id,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "article" | "ul" | "ol";
  id?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const show = () => node.setAttribute("data-reveal", "shown");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      show();
      return;
    }
    if (node.getBoundingClientRect().top < window.innerHeight * 0.85) {
      show();
      return;
    }
    node.setAttribute("data-reveal", "armed");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          // One frame in the armed pose first, so the transition has a start state.
          requestAnimationFrame(show);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      id={id}
      aria-labelledby={labelledBy}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
