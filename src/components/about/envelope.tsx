"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

/**
 * Decorative envelope for the newsletter: when it scrolls into view the
 * letter slides up out of the pocket. Hidden from assistive tech; the form
 * beside it carries the meaning. Reduced motion (MotionConfig in the root
 * layout) shows the letter already out. Styles: .sl-envelope-* in salon.css.
 */
export function Envelope({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div aria-hidden className="sl-envelope">
      <div className="sl-envelope-body">
        <div className="sl-envelope-back" />
        <div className="sl-envelope-flap" />
        <motion.div
          className="sl-envelope-letter"
          initial={{ y: "46%" }}
          whileInView={{ y: "0%" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          <p className="font-serif text-[1.2rem] leading-tight text-navy">{title}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">{subtitle}</p>
        </motion.div>
        <div className="sl-envelope-front" />
        <span className="sl-seal sl-seal-lg sl-envelope-seal">
          <Star />
        </span>
      </div>
    </div>
  );
}
