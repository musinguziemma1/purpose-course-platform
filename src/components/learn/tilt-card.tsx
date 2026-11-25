"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionStyle } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Tilts its card towards a fine pointer, like a certificate lifted off the desk.
 * Decorative only: springs give it weight, touch and reduced-motion users get a
 * still card, and the content stays fully interactive.
 */
export function TiltCard({ children, className, max = 4 }: { children: ReactNode; className?: string; max?: number }) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const spring = { stiffness: 170, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [max, -max]), spring);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-max, max]), spring);
  const glareX = useTransform(pointerX, [-0.5, 0.5], ["15%", "85%"]);
  const glareY = useTransform(pointerY, [-0.5, 0.5], ["10%", "90%"]);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function reset() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <motion.div
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1100 }}
      className={cn("lk-tilt relative", className)}
    >
      {children}
      {reduceMotion ? null : <motion.span aria-hidden className="lk-glare" style={{ "--gx": glareX, "--gy": glareY } as MotionStyle} />}
    </motion.div>
  );
}
