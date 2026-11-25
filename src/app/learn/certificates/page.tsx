import Link from "next/link";
import { Award, Download, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { getCertificates } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { EmptyDesk, Flourish, LeatherFigures, LearnHero, Stamp, WaxSeal, btn } from "@/components/learn/kit";
import { TiltCard } from "@/components/learn/tilt-card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Certificates" };

export default async function StudentCertificatesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const rows = await getCertificates(user.profileId);

  return (
    <div className="space-y-7">
      <LearnHero
        eyebrow="Verified awards"
        title="Certificates"
        description={
          <>
            Course awards require the published lessons and required course assessments. Level awards additionally require the level examination. Each award covers its named course
            or level. The self-reported programme checklist does not issue certificates.
          </>
        }
        aside={
          <LeatherFigures
            items={[
              { label: "Awarded", value: rows.length },
              { label: "Level awards", value: rows.filter(({ certificate }) => certificate.kind === "level").length },
            ]}
          />
        }
      />

      {rows.length === 0 ? (
        <EmptyDesk
          icon={Award}
          title="Your first certificate is close."
          description="Finish every lesson in a course and pass its assessment. The certificate is generated automatically — no request needed."
          action={
            <>
              <Link href="/learn/courses" className={btn.navy}>
                Continue the course
              </Link>
              <Link href="/learn/assessments" className={btn.paper}>
                Take an assessment
              </Link>
            </>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {rows.map(({ certificate }) => (
            <TiltCard key={certificate.id}>
              <article className="lk-certificate px-7 pb-8 pt-9 text-center sm:px-10">
                <p className="font-serif text-[13px] font-semibold uppercase tracking-[0.32em] text-[#6f540b]">Purpose Course</p>
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-stone-600">Academy</p>
                <Flourish className="mx-auto mt-3" />
                <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                  {certificate.kind === "level" ? "Level completion" : "Course completion"}
                </p>
                <p className="mt-4 font-serif text-[14px] italic text-stone-600">This certifies that</p>
                <p className="mt-1 font-serif text-[1.9rem] italic leading-tight text-navy">{user.fullName}</p>
                <p className="mt-2 font-serif text-[14px] italic text-stone-600">has completed</p>
                <h2 className="mx-auto mt-1 max-w-md font-serif text-[1.35rem] leading-snug text-navy">{certificate.title}</h2>
                {certificate.levelName || certificate.hours ? (
                  <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6f540b]">
                    {[certificate.levelName ? `${certificate.levelName} level` : null, certificate.hours ? `${certificate.hours} hours` : null].filter(Boolean).join(" · ")}
                  </p>
                ) : null}

                <div className="mt-6 flex items-end justify-between gap-4 text-left">
                  <div className="min-w-0">
                    <p className="border-b border-[rgba(18,42,77,0.35)] pb-1 font-serif text-[15px] text-navy">{formatDate(certificate.issuedAt)}</p>
                    <p className="mt-1 text-[12px] uppercase tracking-[0.12em] text-stone-600">
                      Date of issue{certificate.score !== null ? ` · score ${certificate.score}%` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="inline-flex rounded-md border border-[rgba(120,96,52,0.25)] bg-[rgba(255,253,246,0.7)] px-2.5 py-1 font-mono text-[12px] text-stone-700">
                        {certificate.code}
                      </p>
                      <Stamp tone="navy">
                        <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> Verified
                      </Stamp>
                    </div>
                  </div>
                  <WaxSeal ribbons size={76} className="-mb-3" />
                </div>

                <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                  <a href={`/api/certificates/${certificate.code}/download`} className={cn(btn.navy, btn.sm)}>
                    <Download aria-hidden className="h-4 w-4" /> Download certificate
                  </a>
                  <Link href={`/verify/${certificate.code}`} className={cn(btn.paper, btn.sm)}>
                    <ExternalLink aria-hidden className="h-4 w-4" /> Public verification
                  </Link>
                </div>
              </article>
            </TiltCard>
          ))}
        </div>
      )}

      <div className="lk-note lk-note-r max-w-3xl">
        <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#6b4a05]">
          <Sparkles aria-hidden className="h-4 w-4" /> Share it well
        </p>
        <p className="mt-2 text-[14px] leading-relaxed">
          The downloaded file is a high-resolution vector certificate, suitable for print. Anyone can verify it at{" "}
          <span className="font-mono text-navy">/verify/&lt;code&gt;</span>, which confirms the holder, the programme and the issue date.
        </p>
      </div>
    </div>
  );
}
