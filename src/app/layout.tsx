import { publicOrigin } from "@/lib/site-url";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { serializeStructuredData } from "@/lib/structured-data";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin()),
  title: {
    default: "Purpose Course — Discover. Clarify. Live. Impact.",
    template: "%s · Purpose Course",
  },
  description:
    "Purpose Course helps you discover why you were born, clarify your assignment and live it with impact. Three levels, fifteen sessions and a growing learning community.",
  keywords: [
    "purpose course",
    "purpose discovery",
    "identity",
    "calling",
    "mentorship",
    "online school",
    "Christian leadership",
  ],
  openGraph: {
    title: "Purpose Course — Discover. Clarify. Live. Impact.",
    description:
      "A 15-week journey through Identity, Source, Purpose, Potential and Destiny — with articles, resources and a learning community.",
    siteName: "Purpose Course",
    type: "website",
    images: [{ url: "/images/hero-workshop.jpg", width: 1600, height: 1068, alt: "Participants attending a facilitated workshop" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/hero-workshop.jpg"],
    title: "Purpose Course — Discover. Clarify. Live. Impact.",
    description:
      "Three levels, fifteen sessions, five purpose principles. Build a life that expresses your God-given assignment.",
  },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..700&family=Inter:wght@300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <div id="main">{children}</div>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: serializeStructuredData({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "Purpose Course",
              description:
                "Purpose Course is a 15-week journey of purpose discovery in three levels: Foundation, Intermediate and Advanced.",
              email: "schoolofpurposeandleadership@gmail.com",
              telephone: "+256708376997",
              address: { "@type": "PostalAddress", addressCountry: "UG" },
            }),
          }}
        />
      </body>
    </html>
  );
}
