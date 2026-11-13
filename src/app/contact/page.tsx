import { publicUrl } from "@/lib/site-url";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { CoverImage } from "@/components/site/cover-image";
import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getSitePage, getSiteSettings } from "@/db/queries";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { workspaceLabelForRole } from "@/lib/roles";
import { renderRichText } from "@/lib/markdown";
import { ContactForm } from "@/components/platform/contact-form";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the Purpose Course team about the programme, cohorts, partnerships or the journal.",
  alternates: { canonical: publicUrl("/contact") },
};

export default async function ContactPage() {
  const [user, page, settings] = await Promise.all([
    getSessionUser(),
    getSitePage("contact"),
    getSiteSettings().catch(() => ({}) as Record<string, string>),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        user={user ? { fullName: user.fullName, roleSlug: user.roleSlug, profileId: user.profileId } : null}
        dashboardHref={user ? homePathForRole(user.roleSlug) : "/login"}
        dashboardLabel={workspaceLabelForRole(user?.roleSlug)}
      />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-navy/10 bg-cream/50">
          <HeroBackdrop src="/images/learner-support.jpg" />
          <div className="shell relative py-12 lg:py-16">
            <p className="eyebrow">Contact</p>
            <h1 className="display mt-3 max-w-3xl text-4xl text-navy sm:text-5xl">
              {page?.title ?? "Talk to us"}
            </h1>
            <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-stone-600">
              {page?.subtitle ??
                "Questions about the course, the journal or partnership? Write to us and a member of the faculty will reply."}
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="shell grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="relative mb-7 aspect-[16/7] overflow-hidden rounded-2xl bg-cream">
                <CoverImage src="/images/learner-support.jpg" alt="A support professional listening through a headset while using a laptop" sizes="(min-width: 1024px) 50vw, 100vw" />
              </div>
              {page ? (
                <div className="max-w-[44rem]">{renderRichText(page.body)}</div>
              ) : (
                <p className="text-stone-600">Email ssenyondolex@gmail.com or call +256 708 376 997.</p>
              )}
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Mail, label: "Email", value: settings.contact_email ?? "ssenyondolex@gmail.com" },
                  { icon: Phone, label: "Phone", value: settings.contact_phone ?? "+256 708 376 997" },
                  { icon: MapPin, label: "Location", value: settings.location ?? "Kampala, Uganda · Online worldwide" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-navy/10 bg-paper p-3.5">
                    <item.icon className="h-4 w-4 text-gold-dark" />
                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-500">{item.label}</p>
                    <p className="text-[11.5px] leading-snug text-navy">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11.5px] text-stone-500">
                Looking for cohort dates?{" "}
                <Link href="/course#enrol" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
                  Join the interest list
                </Link>{" "}
                or read the{" "}
                <Link href="/blog" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
                  Purpose Journal
                </Link>
                .
              </p>
            </div>

            <Card className="p-5 shadow-lift">
              <p className="font-serif text-xl text-navy">Send a message</p>
              <p className="mt-1 text-[12px] leading-relaxed text-stone-600">
                Your message lands in the faculty inbox inside the platform, so it is tracked rather than lost.
              </p>
              <div className="mt-4">
                <ContactForm submissionId={randomUUID()} defaultName={user?.fullName ?? ""} defaultEmail={user?.email ?? ""} />
              </div>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
