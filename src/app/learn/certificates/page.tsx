import Link from "next/link";
import { Award, Download, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { getCertificates } from "@/db/assessments";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Certificates" };

export default async function StudentCertificatesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const rows = await getCertificates(user.profileId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Certificates</h1>
        <p className="text-[12.5px] text-stone-600">
          Course awards require the published lessons and required course assessments. Level awards additionally require the level examination.
          Each award covers its named course or level. The self-reported programme checklist does not issue certificates.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <Award className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-2 font-serif text-lg text-navy">Your first certificate is close.</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-stone-600">
            Finish every lesson in a course and pass its assessment. The certificate is generated automatically — no
            request needed.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href="/learn/courses" className="inline-flex h-9 items-center rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper">
              Continue the course
            </Link>
            <Link href="/learn/assessments" className="inline-flex h-9 items-center rounded-full border border-navy/15 px-4 text-[11.5px] font-medium text-navy">
              Take an assessment
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map(({ certificate }) => (
            <div key={certificate.id} className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-cream via-paper to-paper shadow-lift">
              <div className="border-b border-gold/30 bg-navy px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-serif text-[13px] tracking-[0.2em] text-paper">PURPOSE COURSE</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ink">
                    <ShieldCheck className="h-2.5 w-2.5" /> verified
                  </span>
                </div>
              </div>
              <div className="p-5 text-center">
                <Award className="mx-auto h-8 w-8 text-gold-dark" />
                <p className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {certificate.kind === "level" ? "Level completion" : "Course completion"}
                </p>
                <p className="mt-1 font-serif text-xl leading-snug text-navy">{certificate.title}</p>
                <p className="text-[11px] uppercase tracking-[0.08em] text-gold-dark">
                  {[certificate.levelName ? `${certificate.levelName} level` : null, certificate.hours ? `${certificate.hours} hours` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-2 text-[12px] text-stone-700">{user.fullName}</p>
                <p className="text-[10.5px] text-stone-500">
                  Issued {formatDate(certificate.issuedAt)}
                  {certificate.score !== null ? ` · score ${certificate.score}%` : ""}
                </p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-stone-600">
                  {certificate.code}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <a
                    href={`/api/certificates/${certificate.code}/download`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 text-[11.5px] font-semibold text-paper hover:bg-navy-700"
                  >
                    <Download className="h-3.5 w-3.5" /> Download certificate
                  </a>
                  <Link
                    href={`/verify/${certificate.code}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-navy/15 bg-paper px-4 text-[11.5px] font-medium text-navy hover:bg-cream"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Public verification
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-[11.5px] leading-relaxed text-stone-700">
        <p className="inline-flex items-center gap-1.5 font-semibold text-gold-dark">
          <Sparkles className="h-3.5 w-3.5" /> Share it well
        </p>
        <p className="mt-1">
          The downloaded file is a high-resolution vector certificate, suitable for print. Anyone can verify it at{" "}
          <span className="font-mono text-navy">/verify/&lt;code&gt;</span>, which confirms the holder, the programme and
          the issue date.
        </p>
      </div>
    </div>
  );
}
