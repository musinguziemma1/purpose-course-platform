import Image from "next/image";
import { cn } from "@/lib/utils";

/** Local editorial photos are optimized; uploaded media keeps browser authentication. */
export function CoverImage({ src, alt = "", sizes = "100vw", eager = false, className }: {
  src: string;
  alt?: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
}) {
  const focalPoint = src === "/images/online-learning.jpg" ? "object-[center_20%]" : src === "/images/mentor-guidance.jpg" ? "object-[center_35%]" : "object-center";
  const classes = cn("object-cover", focalPoint, className);
  if (src.startsWith("/images/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} className={classes} />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- Private media endpoints require the browser's session cookie.
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} className={cn("absolute inset-0 h-full w-full", classes)} />;
}
