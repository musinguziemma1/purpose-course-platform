import type { Metadata } from "next";
import { Download, FileAudio, FileSpreadsheet, FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import { getResources } from "@/db/queries";
import { resourceFileTarget } from "@/lib/resource-files";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resource library",
  description:
    "Free worksheets, field guides and planning canvases from the Purpose Course — the Purpose Journal, gifting audit, vision plan and more.",
  alternates: { canonical: "https://purposecourse.org/resources" },
};

const ICONS = {
  worksheet: FileSpreadsheet,
  guide: FileText,
  template: Layers,
  audio: FileAudio,
  video: FileText,
} as const;

export default async function ResourcesPage() {
  const resources = await getResources(20);
  const available = resources.filter((resource) => resourceFileTarget(resource.fileUrl));
  const featured = available.filter((resource) => resource.isFeatured);
  const featuredIds = new Set(featured.map((resource) => resource.id));
  const rest = resources.filter((resource) => !featuredIds.has(resource.id));
  const totalDownloads = available.reduce((sum, resource) => sum + resource.downloadCount, 0);

  return (
    <>
      <section className="relative overflow-hidden border-b border-navy/10 bg-cream/60">
        <div className="absolute inset-0 paper-texture opacity-50" aria-hidden />
        <div className="shell relative grid gap-8 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-20">
          <div>
            <p className="eyebrow">Resource library</p>
            <h1 className="display mt-4 text-4xl text-navy sm:text-5xl">
              Take the work home with you.
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-stone-600">
              Practical starter worksheets, guides and planning canvases for your learning journey. Available files are free to download and use with your team, small group or class. More resources will be added as they are prepared.
            </p>
          </div>
          <div className="space-y-3">
            <div className="relative hidden overflow-hidden rounded-xl border border-navy/10 sm:block">
              <img
                src="/images/student-study.jpg"
                alt="Printed worksheets and a journal on a study desk"
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
            {[
              [String(available.length), "Available resources"],
              [totalDownloads.toLocaleString(), "Download requests"],
              ["3", "Levels covered"],
              ["Free", "Always"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-navy/10 bg-paper px-4 py-3">
                <p className="font-serif text-2xl text-navy">{value}</p>
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-stone-500">{label}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="shell">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 className="mt-3 font-serif text-3xl text-navy">The essentials</h2>
            </div>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {featured.map((resource, index) => {
              const Icon = ICONS[resource.type] ?? FileText;
              return (
                <Reveal key={resource.id} delay={index * 0.07}>
                  <div className="interactive flex h-full flex-col rounded-xl border border-navy/12 bg-navy p-6 text-paper">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-gold">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-paper/50">
                        {resourceFileTarget(resource.fileUrl) ? `${resource.fileFormat} · ${resource.fileSize}` : "Coming soon"}
                      </span>
                    </div>
                    <h3 className="mt-4 font-serif text-2xl leading-snug">{resource.title}</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-paper/65">{resource.description}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-[10.5px] uppercase tracking-[0.12em] text-paper/40">
                        {resource.level ?? "All levels"}
                      </span>
                      {resourceFileTarget(resource.fileUrl) ? <a
                        download
                        href={`/api/resources/${resource.slug}/download`}
                        className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-paper"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a> : <span className="text-xs text-paper/65">Coming soon</span>}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-14">
            <p className="eyebrow">Full library</p>
            <h2 className="mt-3 font-serif text-3xl text-navy">Worksheets, guides and sessions</h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((resource, index) => {
                const Icon = ICONS[resource.type] ?? FileText;
                return (
                  <Reveal key={resource.id} delay={Math.min(index * 0.05, 0.3)}>
                    <div className="interactive flex h-full flex-col rounded-xl border border-navy/10 bg-paper p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream text-gold-dark">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <Badge variant="outline">{resource.type}</Badge>
                      </div>
                      <h3 className="mt-3.5 font-serif text-lg leading-snug text-navy">{resource.title}</h3>
                      <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-stone-600">{resource.description}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-navy/8 pt-3">
                        <span className="text-[10.5px] uppercase tracking-[0.1em] text-stone-400">
                          {resourceFileTarget(resource.fileUrl) ? `${resource.fileFormat} · ${resource.fileSize}` : "Coming soon"}
                        </span>
                        {resourceFileTarget(resource.fileUrl) ? <a
                          download
                          href={`/api/resources/${resource.slug}/download`}
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em]",
                            "text-navy hover:text-gold-dark",
                          )}
                        >
                          <Download className="h-3.5 w-3.5" /> Get it
                        </a> : <span className="text-xs text-stone-500">Coming soon</span>}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>

          <div className="mt-14 grid gap-6 rounded-2xl border border-navy/10 bg-cream/60 p-7 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="gold">The Purpose Letter</Badge>
              <h2 className="mt-3 font-serif text-2xl text-navy">New resources, sent when they are ready.</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Join the list and we will send worksheets as they are released, plus one new article each Thursday.
              </p>
            </div>
            <NewsletterForm source="resources" />
          </div>
        </div>
      </section>
    </>
  );
}
