import { publicOrigin } from "@/lib/site-url";
import { getCertificateByCode } from "@/db/assessments";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const record = await getCertificateByCode(code);
  if (!record || record.certificate.revokedAt) {
    return new Response("Certificate not found or revoked.", { status: 404 });
  }

  const { certificate, studentName } = record;
  const issued = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    certificate.issuedAt,
  );
  const scoreLine = certificate.score !== null ? `Assessment score ${certificate.score}% · ` : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1130" viewBox="0 0 1600 1130" role="img" aria-label="Purpose Course certificate of completion">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fffdf8"/>
      <stop offset="55%" stop-color="#faf6ec"/>
      <stop offset="100%" stop-color="#f2e9d6"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e3c463"/>
      <stop offset="45%" stop-color="#c9a227"/>
      <stop offset="100%" stop-color="#9c7a12"/>
    </linearGradient>
    <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#162f52"/>
      <stop offset="100%" stop-color="#0a1a30"/>
    </linearGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.4" cy="1.4" r="1.1" fill="#122a4d" opacity="0.07"/>
    </pattern>
  </defs>

  <rect width="1600" height="1130" fill="url(#navy)"/>
  <rect x="30" y="30" width="1540" height="1070" rx="18" fill="url(#paper)"/>
  <rect x="30" y="30" width="1540" height="1070" rx="18" fill="url(#dots)"/>
  <rect x="52" y="52" width="1496" height="1026" rx="12" fill="none" stroke="url(#gold)" stroke-width="3"/>
  <rect x="70" y="70" width="1460" height="990" rx="8" fill="none" stroke="#122a4d" stroke-opacity="0.22" stroke-width="1.2"/>

  <rect x="30" y="30" width="1540" height="18" fill="url(#gold)"/>
  <rect x="30" y="1082" width="1540" height="18" fill="url(#gold)"/>

  <g transform="translate(800 168)">
    <circle r="54" fill="url(#navy)"/>
    <path d="M0 -30l8.2 20.7L29 -1.6 5.2 6.3 0 28l-5.2-21.7L-29-1.6l20.8-7.7z" fill="url(#gold)"/>
  </g>

  <text x="800" y="282" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" letter-spacing="7" fill="#122a4d">PURPOSE COURSE</text>
  <text x="800" y="318" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="7" fill="#a5811a">DISCOVER · CLARIFY · LIVE · IMPACT</text>
  <line x1="600" y1="348" x2="1000" y2="348" stroke="url(#gold)" stroke-width="2"/>

  <text x="800" y="424" text-anchor="middle" font-family="Georgia, serif" font-size="30" letter-spacing="10" fill="#57534e">${escapeXml(
    certificate.kind === "level" ? "CERTIFICATE OF LEVEL COMPLETION" : "CERTIFICATE OF COURSE COMPLETION",
  )}</text>

  <text x="800" y="500" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="19" letter-spacing="4" fill="#78716c">THIS CERTIFICATE IS PROUDLY PRESENTED TO</text>

  <text x="800" y="606" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="78" fill="#0a1a30">${escapeXml(
    studentName,
  )}</text>
  <line x1="420" y1="642" x2="1180" y2="642" stroke="url(#gold)" stroke-width="2.5"/>

  <text x="800" y="700" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="19" fill="#57534e">for the verified completion of</text>
  <text x="800" y="752" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#122a4d">${escapeXml(
    certificate.title,
  )}</text>
  <text x="800" y="792" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" letter-spacing="3" fill="#a5811a">${escapeXml(
    [certificate.levelName ? `${certificate.levelName} Level` : null, certificate.hours ? `${certificate.hours} learning hours` : null]
      .filter(Boolean)
      .join(" · "),
  )}</text>

  <g transform="translate(800 940)">
    <circle r="78" fill="none" stroke="url(#gold)" stroke-width="4"/>
    <circle r="64" fill="none" stroke="#122a4d" stroke-opacity="0.25" stroke-width="1.5"/>
    <text y="-10" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" letter-spacing="3" fill="#a5811a">VERIFIED</text>
    <text y="12" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#122a4d">AWARD OF</text>
    <text y="34" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#122a4d">COMPLETION</text>
  </g>

  <g font-family="Helvetica, Arial, sans-serif">
    <text x="230" y="940" font-size="14" letter-spacing="2" fill="#a8a29e">ISSUED</text>
    <text x="230" y="972" font-family="Georgia, serif" font-size="24" fill="#122a4d">${escapeXml(issued)}</text>
    <line x1="230" y1="996" x2="470" y2="996" stroke="#d6cdb8" stroke-width="1.5"/>

    <text x="230" y="1030" font-size="13" fill="#78716c">${escapeXml(scoreLine)}Scope: ${certificate.kind === "level" ? "Named level" : "Named course"}</text>

    <text x="1370" y="940" text-anchor="end" font-size="14" letter-spacing="2" fill="#a8a29e">VERIFICATION CODE</text>
    <text x="1370" y="972" text-anchor="end" font-family="'Courier New', monospace" font-size="22" fill="#122a4d">${escapeXml(
      certificate.code,
    )}</text>
    <line x1="1130" y1="996" x2="1370" y2="996" stroke="#d6cdb8" stroke-width="1.5"/>
    <text x="1370" y="1030" text-anchor="end" font-size="13" fill="#78716c">Verify at ${escapeXml(new URL(publicOrigin()).host)}/verify</text>
  </g>

  <text x="800" y="1050" text-anchor="middle" font-family="Georgia, serif" font-size="17" font-style="italic" fill="#57534e">From purpose discovery to kingdom impact — you were born for significance.</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="purpose-course-certificate-${certificate.code}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
