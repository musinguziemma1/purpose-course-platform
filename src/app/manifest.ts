import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Purpose Course",
    short_name: "Purpose",
    description: "Discover your identity, understand your purpose, and unlock your potential.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#071F46",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    categories: ["education", "lifestyle", "productivity"],
  };
}
