"use client";

import { motion, useReducedMotion, useSpring } from "framer-motion";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A card that leans toward a mouse pointer, with a soft glare that follows
 * it (styles: .sl-tilt / .sl-glare in salon.css). Touch and pen input and
 * reduced-motion preferences leave it flat, so nothing moves under a finger.
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 240, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 240, damping: 22 });

  function move(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (reduce || event.pointerType !== "mouse" || !node) return;
    const box = node.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    rotateY.set((x - 0.5) * 9);
    rotateX.set((0.5 - y) * 9);
    node.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    node.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
  }

  function leave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn("sl-tilt", className)}
    >
      {children}
      <span aria-hidden className="sl-glare" />
    </motion.div>
  );
}
