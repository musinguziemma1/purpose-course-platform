import type { CSSProperties } from "react";
import { publicUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";
import { count } from "drizzle-orm";
import { ArrowDown, BookOpenText, Compass, Home, Mail, MapPin, Phone, Star, Target, User, Users, type LucideIcon } from "lucide-react";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PublicHero } from "@/components/site/public-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Odometer } from "@/components/admin/console/instruments";
import { TiltCard } from "@/components/about/tilt-card";
import { Envelope } from "@/components/about/envelope";
import { PRINCIPLES } from "@/lib/media";
import { renderRichText } from "@/lib/markdown";
import { initials } from "@/lib/utils";
import { db } from "@/db";
import { courseLevels, courseSessions } from "@/db/schema";
import { getSitePage, getSiteSettings, getTeam } from "@/db/queries";
import "../salon.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About the school",
  description:
    "Purpose Course is the publishing and learning platform of the School of Purpose and Leadership — three levels, fifteen sessions and a community of practice.",
  alternates: { canonical: publicUrl("/about") },
};

/* Same glyphs as PrincipleIcon, struck into the medal coins. */
const PRINCIPLE_GLYPHS: Record<string, LucideIcon> = { user: User, home: Home, target: Target, star: Star, compass: Compass };
function PrincipleGlyph({ icon }: { icon: string }) {
  const Glyph = PRINCIPLE_GLYPHS[icon] ?? Compass;
  return <Glyph />;
}

/* Learner and visitor accounts are not faculty; they stay off this public page. */
const NOT_FACULTY = new Set(["student", "guest"]);

async function tableCount(table: typeof courseLevels | typeof courseSessions) {
  const rows = await db.select({ value: count() }).from(table).catch(() => null);
  return rows ? Number(rows[0]?.value ?? 0) : null;
}

export default async function AboutPage() {
  const [page, team, settings, levels, sessions] = await Promise.all([
    getSitePage("about"),
    getTeam(),
    getSiteSettings().catch(() => ({}) as Record<string, string>),
    tableCount(courseLevels),
    tableCount(courseSessions),
  ]);
  const faculty = team.filter((member) => !NOT_FACULTY.has(member.roleSlug));

  const glance = [
    { label: "Purpose principles", value: PRINCIPLES.length },
    { label: "Programme levels", value: levels },
    { label: "Programme sessions", value: sessions },
    { label: "Faculty & hosts", value: faculty.length },
  ].filter((item): item is { label: string; value: number } => typeof item.value === "number" && item.value > 0);

  return (
    <>
      <PublicHero
        tone="light"
        eyebrow="About Purpose Course"
        title={page?.title ?? "We exist so that purpose is discovered, clarified and lived"}
        description={page?.subtitle ?? "The story behind Purpose Course and the School of Purpose and Leadership."}
        actions={
          <>
            <a href="#story" className="sl-key sl-key-navy">
              <BookOpenText aria-hidden /> Read our story
            </a>
            <a href="#faculty" className="sl-key">
              <Users aria-hidden /> Meet the faculty
            </a>
          </>
        }
        aside={
          <figure className="sl-frame-hang mx-auto max-w-[30rem]">
            <svg aria-hidden viewBox="0 0 200 48" preserveAspectRatio="none" className="sl-wire">
              <path d="M8 48 L100 6 L192 48" fill="none" stroke="#8a7a5a" strokeWidth="1.4" />
              <circle cx="100" cy="6" r="4.5" fill="#c9a227" stroke="#6b520f" strokeWidth="1" />
            </svg>
            <div className="sl-frame">
              <div className="sl-mat">
                <img src="/images/about-team.jpg" alt="People bringing their hands together during a collaborative workshop" className="aspect-[4/3] object-cover" />
              </div>
            </div>
            <figcaption className="mt-6 text-center">
              <span className="sl-plate">One faculty</span>
              <span className="mt-3 block font-serif text-[16px] leading-snug text-stone-700">
                Facilitators, editors and coaches — one faculty across publishing, academy and community.
              </span>
            </figcaption>
          </figure>
        }
      />

      <div className="sl-desk">
        {glance.length ? (
          <div className="shell relative z-10 -mt-10">
            <Reveal>
              <section aria-label="The school at a glance" className="sl-leather p-3 sm:p-4">
                <dl className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${glance.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                  {glance.map((item) => (
                    <div key={item.label} className="sl-well-dark flex flex-col items-center px-3 py-4 text-center">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-paper/70">{item.label}</dt>
                      <dd className="mt-2.5 text-[1.7rem] sm:text-[2rem]">
                        <Odometer value={item.value} wheels />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </Reveal>
          </div>
        ) : null}

        <section id="story" className="shell scroll-mt-28 py-16 lg:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] lg:items-start">
            <Reveal>
              <article className="sl-page px-6 pb-10 pt-12 sm:px-12 sm:pb-14 sm:pt-14">
                <span aria-hidden className="sl-ribbon" />
                <p className="eyebrow">Our story</p>
                <div className="sl-page-body mt-6 max-w-[44rem] text-[17px] leading-[1.8] text-stone-800">
                  {page ? (
                    renderRichText(page.body)
                  ) : (
                    <p>Purpose Course is the publishing and learning platform of the School of Purpose and Leadership.</p>
                  )}
                </div>
              </article>
            </Reveal>

            <div className="space-y-10">
              <Reveal delay={0.08}>
                <section aria-labelledby="principles-heading" className="sl-card p-6 sm:p-7">
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-gold-dark">The five principles</p>
                  <h2 id="principles-heading" className="mt-2 font-serif text-[1.55rem] leading-tight text-navy">
                    Five questions every life answers
                  </h2>
                  <Stagger className="mt-5 space-y-4">
                    {PRINCIPLES.map((principle) => (
                      <StaggerItem key={principle.name}>
                        <div className="group flex items-center gap-4">
                          <span aria-hidden className="sl-medal" style={{ "--tone": principle.color } as CSSProperties}>
                            <PrincipleGlyph icon={principle.icon} />
                          </span>
                          <div className="min-w-0">
                            <p className="font-serif text-[17px] text-navy">{principle.name}</p>
                            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-stone-600">{principle.question}</p>
                          </div>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </section>
              </Reveal>

              <Reveal delay={0.12}>
                <section aria-labelledby="contact-heading" className="sl-callcard px-6 py-7 sm:px-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark">Calling card</p>
                      <h2 id="contact-heading" className="sl-emboss mt-1.5 font-serif text-[1.45rem] text-navy">
                        School of Purpose &amp; Leadership
                      </h2>
                    </div>
                    <svg aria-hidden viewBox="0 0 32 32" className="h-8 w-8 shrink-0 text-gold" focusable="false">
                      <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
                    </svg>
                  </div>
                  <ul className="sl-emboss mt-5 space-y-3 border-t border-navy/10 pt-4 text-[14.5px] text-stone-800">
                    <li className="flex items-start gap-3">
                      <Mail aria-hidden className="mt-1 h-4 w-4 shrink-0 text-gold-dark" />
                      <span className="min-w-0 break-words">
                        {settings.contact_email ?? "ssenyondolex@gmail.com"}
                        <br />
                        {settings.contact_email_secondary ?? "schoolofpurposeandleadership@gmail.com"}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Phone aria-hidden className="h-4 w-4 shrink-0 text-gold-dark" />
                      {settings.contact_phone ?? "+256 708 376 997"}
                    </li>
                    <li className="flex items-center gap-3">
                      <MapPin aria-hidden className="h-4 w-4 shrink-0 text-gold-dark" />
                      {settings.location ?? "Kampala, Uganda · Online worldwide"}
                    </li>
                  </ul>
                </section>
              </Reveal>
            </div>
          </div>
        </section>

        {faculty.length ? (
          <section id="faculty" className="scroll-mt-28 border-y border-navy/10 bg-paper/60 py-16 lg:py-24">
            <div className="shell">
              <SectionHeading
                eyebrow="The faculty"
                title="Editors, facilitators and hosts"
                description="The people who write the journal, teach the sessions and hold the community together."
              />
              <Stagger className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {faculty.map((member) => (
                  <StaggerItem key={member.id} className="h-full">
                    <TiltCard className="sl-card flex h-full flex-col items-center px-6 pb-6 pt-7 text-center">
                      <span className="sl-cameo-frame">
                        <span className="sl-cameo">
                          {member.avatarUrl ? <img src={member.avatarUrl} alt="" loading="lazy" /> : initials(member.fullName)}
                        </span>
                      </span>
                      <h3 className="mt-5 font-serif text-[1.3rem] leading-snug text-navy">{member.fullName}</h3>
                      {member.title ? <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.12em] text-gold-dark">{member.title}</p> : null}
                      {member.bio ? <p className="mt-3 flex-1 text-[14px] leading-relaxed text-stone-700">{member.bio}</p> : <span className="flex-1" />}
                      <span className="sl-plate mt-5">{member.roleName}</span>
                    </TiltCard>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        ) : null}

        <section className="py-16 lg:py-24">
          <div className="shell grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Reveal>
              <Envelope title="The Purpose Letter" subtitle="One Thursday at a time" />
            </Reveal>
            <Reveal delay={0.08}>
              <div className="sl-card p-6 sm:p-8">
                <span className="sl-plate">Stay close</span>
                <h2 className="mt-4 font-serif text-[2rem] leading-tight text-navy">The Purpose Letter</h2>
                <p className="mt-2 text-[16px] leading-relaxed text-stone-700">
                  Reflections, cohort dates and new writing — one Thursday at a time. Or start with the{" "}
                  <Link href="/blog" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
                    Purpose Journal
                  </Link>
                  .
                </p>
                <div className="mt-6">
                  <NewsletterForm source="about" />
                </div>
                <a href="#story" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy hover:text-gold-dark">
                  Back to our story <ArrowDown aria-hidden className="h-3.5 w-3.5 rotate-180" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </>
  );
}
