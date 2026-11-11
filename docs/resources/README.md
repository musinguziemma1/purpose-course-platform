# Starter learning resources

These three resources were created at the owner's request on 12 November 2026,
using the platform's five principles and existing lesson download links. They
are starter teaching materials and can be replaced with the owner's media later.

| File | Pages | Purpose |
| --- | --- | --- |
| [Five Purpose Principles](../../public/resources/five-principles-overview.pdf) | 1 | Questions, reflection prompts and one next step |
| [Gifting Audit Worksheet](../../public/resources/gifting-audit-worksheet.pdf) | 2 | Six evidence prompts, peer feedback and a two-week experiment |
| [Twelve-Month Vision Plan](../../public/resources/vision-plan-12-months.pdf) | 2 | Outcome, quarterly milestones, weekly time budget and review |

Editable HTML sources and shared print CSS live beside this README. Open an HTML
source in Chrome, select A4, enable background graphics, disable browser headers
and footers, and save as PDF. Preserve the filenames under `public/resources`.
The checked PDFs are tagged, include document titles/outlines, and contain
selectable text. They were visually inspected and checked for page overflow.

For reproducible command-line rendering, use the isolated authoring tool with
installed Chrome. It is not a production dependency:

```text
npm install --prefix .local/resource-tools --save-exact playwright@1.65.0
npm run resources:render
npm run resources:check
```

The committed editions were generated with `page.pdf({ format: "A4",
printBackground: true, preferCSSPageSize: true, tagged: true, outline: true })`.
Keep tagging enabled when regenerating; `npm run resources:check` verifies page
counts, a valid PDF envelope and tagging before every application build. Update
displayed sizes when replacing files.

The public library marks listings with no usable file as **Coming soon**.
Unavailable endpoints return 404 and record no download. Available endpoints
record a download request and redirect to the actual PDF or a configured HTTPS
file URL. These counts are requests, not unique people or confirmed receipt.
Request insertion and counter increment commit together. Email addresses from
query strings are not stored.

Migration `20261111210602_connect_starter_resources.sql` attaches only listings
whose file URL is still null. It preserves uploaded files and their counters.
It resets fabricated demonstration counters for the six known empty listings,
retaining their original request history and the pre-migration backup. The
Purpose Journal, career guide and audio are still pending real files; no content
or recording has been invented for those listings.

Public files are suitable for free, non-confidential resources. A future media
upload interface should write validated files to object storage, then update
the resource's HTTPS URL; Vercel's deployed filesystem is not persistent upload
storage. No Supabase Storage upload credential is configured yet.
