import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";

/*
 * Baseline response headers. The CSP deliberately limits framing, base URLs,
 * plugins and form targets only; script restrictions would need per-request
 * nonces for Next's inline runtime and are left for a dedicated change.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Development review tooling frames the app; production never allows framing (clickjacking).
  ...(production ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
  { key: "Content-Security-Policy", value: `${production ? "frame-ancestors 'none'; " : ""}base-uri 'self'; form-action 'self'; object-src 'none'` },
  // The live classroom needs camera, microphone and screen sharing on this origin only.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()" },
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
