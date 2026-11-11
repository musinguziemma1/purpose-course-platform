import type { Metadata } from "next";
import Link from "next/link";
import { Award, BadgeCheck, Download, ShieldAlert, Sparkles } from "lucide-react";
import { getCertificateByCode } from "@/db/assessments";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Confirm the authenticity of a Purpose Course certificate of completion.",
};

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const record = await getCertificateByCode(code);

  return (
    <div className="min-h-screen bg-cream/50">
      <header className="border-b border-navy/10 bg-paper">
        <div className="shell flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-gold">
              <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" fill="currentColor" />
              </svg>
            </span>
            <span>
              <span className="block font-serif text-sm font-semibold tracking-tight text-navy">PURPOSE COURSE</span>
              <span className="block text-[8.5px] font-semibold uppercase tracking-[0.24em] text-gold-dark">Certificate register</span>
            </span>
          </Link>
          <Link href="/login" className="text-[11.5px] font-medium text-stone-600 hover:text-navy">
            Learner sign in →
          </Link>
        </div>
      </header>

      <main className="shell max-w-3xl py-14">
        {record ? (
          <div className="overflow-hidden rounded-2xl border border-gold/40 bg-paper shadow-editorial">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-6 py-4 text-paper">
              <p className="inline-flex items-center gap-2 font-serif text-sm tracking-[0.2em]">PURPOSE COURSE</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-source px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]">
                <BadgeCheck className="h-3.5 w-3.5" /> authentic
              </span>
            </div>
            <div className="p-7 text-center sm:p-10">
              <Award className="mx-auto h-10 w-10 text-gold-dark" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                {record.certificate.kind === "level" ? "Certificate of level completion" : "Certificate of course completion"}
              </p>
              <h1 className="mt-2 font-serif text-3xl text-navy">{record.studentName}</h1>
              <p className="mt-1 text-[12px] uppercase tracking-[0.1em] text-gold-dark">
                {record.certificate.levelName ? `${record.certificate.levelName} level` : "Purpose Course"}
              </p>
              <p className="mt-4 font-serif text-xl leading-snug text-navy">{record.certificate.title}</p>

              <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 text-left">
                {[
                  ["Verification code", record.certificate.code],
                  ["Issued", formatDate(record.certificate.issuedAt)],
                  ["Assessment score", record.certificate.score !== null ? `${record.certificate.score}%` : "Verified completion"],
                  ["Status", record.certificate.revokedAt ? "Revoked" : "In good standing"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-navy/10 bg-cream/40 px-3 py-2">
                    <dt className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-stone-500">{label}</dt>
                    <dd className="mt-0.5 text-[12px] font-medium text-navy">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mx-auto mt-5 max-w-md text-[11.5px] leading-relaxed text-stone-600">
                This certificate was issued automatically by the Purpose Course Academy when the holder completed every
                lesson and met the assessment pass mark for the programme.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <a
                  href={`/api/certificates/${record.certificate.code}/download`}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-[12px] font-semibold text-paper hover:bg-navy-700"
                >
                  <Download className="h-4 w-4" /> Download the certificate
                </a>
                <Link
                  href="/course"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-navy/15 px-5 text-[12px] font-medium text-navy hover:bg-cream"
                >
                  <Sparkles className="h-4 w-4 text-gold-dark" /> About the programme
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-navy/10 bg-paper p-10 text-center">
            <ShieldAlert className="mx-auto h-9 w-9 text-rose-500" />
            <h1 className="mt-3 font-serif text-2xl text-navy">No certificate matches that code</h1>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-stone-600">
              Check the code printed on the certificate. Codes look like <span className="font-mono">PC-2026-AB12C-D34E</span>.
              Only certificates issued by the Purpose Course Academy appear in this register.
            </p>
            <Link href="/" className="mt-4 inline-flex text-[12px] font-semibold text-gold-dark hover:underline">
              Return to the website →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
