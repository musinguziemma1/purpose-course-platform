import { publicUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { PRINCIPLES } from "@/lib/media";
import { PrincipleIcon } from "@/components/site/principle-icon";
import { renderRichText } from "@/lib/markdown";
import { getSitePage, getSiteSettings, getTeam } from "@/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About the school",
  description:
    "Purpose Course is the publishing and learning platform of the School of Purpose and Leadership — three levels, fifteen sessions and a community of practice.",
  alternates: { canonical: publicUrl("/about") },
};

export default async function AboutPage() {
  const [page, team, settings] = await Promise.all([
    getSitePage("about"),
    getTeam(),
    getSiteSettings().catch(() => ({}) as Record<string, string>),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy/10 bg-cream/60">
        <div className="absolute inset-0 paper-texture opacity-50" aria-hidden />
        <div className="shell relative py-14 lg:py-20">
          <p className="eyebrow">About Purpose Course</p>
          <h1 className="display mt-4 max-w-4xl text-4xl text-navy sm:text-5xl lg:text-[3.6rem]">
            {page?.title ?? "We exist so that purpose is discovered, clarified and lived"}
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-stone-600">
            {page?.subtitle ??
              "The story behind Purpose Course and the School of Purpose and Leadership."}
          </p>
        </div>
      </section>

      <div className="shell -mt-2">
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 shadow-lift">
          <img
            src="/images/about-team.jpg"
            alt="The Purpose Course faculty team"
            className="h-56 w-full object-cover sm:h-72"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
          <p className="absolute bottom-4 left-5 max-w-md font-serif text-lg leading-snug text-paper sm:text-xl">
            Facilitators, editors and coaches — one faculty across publishing, academy and community.
          </p>
        </div>
      </div>

      <section className="py-14">
        <div className="shell grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <Reveal>
            <div className="max-w-[44rem]">
              {page ? (
                renderRichText(page.body)
              ) : (
                <p className="text-stone-600">
                  Purpose Course is the publishing and learning platform of the School of Purpose and Leadership.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="space-y-5">
            <div className="rounded-2xl border border-navy/10 bg-paper p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-dark">The five principles</p>
              <ul className="mt-3 space-y-2.5">
                {PRINCIPLES.map((principle) => (
                  <li key={principle.name} className="flex items-center gap-3">
                    <PrincipleIcon icon={principle.icon} accent={principle.accent} size="sm" />
                    <div>
                      <p className="text-[13px] font-medium text-navy">{principle.name}</p>
                      <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-500">{principle.question}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-navy p-5 text-paper">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">Contact</p>
              <ul className="mt-3 space-y-3 text-[12.5px] text-paper/75">
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>
                    {settings.contact_email ?? "ssenyondolex@gmail.com"}
                    <br />
                    {settings.contact_email_secondary ?? "schoolofpurposeandleadership@gmail.com"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-gold" />
                  {settings.contact_phone ?? "+256 708 376 997"}
                </li>
                <li className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-gold" />
                  {settings.location ?? "Kampala, Uganda · Online worldwide"}
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-navy/10 bg-cream/50 py-14">
        <div className="shell">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">The team</p>
              <h2 className="mt-3 font-serif text-3xl text-navy">Editors, facilitators and hosts</h2>
              <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-stone-600">
                The people who write the journal, teach the sessions and hold the community together.
              </p>
            </div>
            <Badge variant="outline">{team.length} profiles</Badge>
          </div>
          <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <StaggerItem key={member.id}>
                <div className="flex h-full flex-col rounded-2xl border border-navy/10 bg-paper p-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy font-serif text-base text-paper">
                    {member.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <p className="mt-3.5 font-serif text-lg text-navy">{member.fullName}</p>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-dark">{member.title}</p>
                  <p className="mt-2 flex-1 text-[12px] leading-relaxed text-stone-600">{member.bio}</p>
                  <p className="mt-3 border-t border-navy/8 pt-2.5 text-[10px] uppercase tracking-[0.1em] text-stone-400">
                    {member.roleName}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-16">
        <div className="shell grid gap-6 rounded-2xl border border-navy/10 bg-paper p-7 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <Badge variant="gold">Stay close</Badge>
            <h2 className="mt-3 font-serif text-2xl text-navy">The Purpose Letter</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Reflections, cohort dates and new writing — one Thursday at a time. Or start with the{" "}
              <Link href="/blog" className="font-medium text-navy underline decoration-gold decoration-2 underline-offset-2">
                Purpose Journal
              </Link>
              .
            </p>
          </div>
          <NewsletterForm source="about" />
        </div>
      </section>
    </>
  );
}
