import { Download, FileAudio, FileSpreadsheet, FileText, Film, Layers, type LucideIcon } from "lucide-react";
import { CoverImage } from "@/components/site/cover-image";
import type { getResources } from "@/db/queries";
import { resourceFileTarget } from "@/lib/resource-files";

/* Desk materials for the public /resources page. Styles: app/(site)/desk.css. */

export type Resource = Awaited<ReturnType<typeof getResources>>[number];

export const RESOURCE_TYPES = {
  worksheet: { label: "Worksheets", single: "Worksheet", icon: FileSpreadsheet },
  guide: { label: "Guides", single: "Guide", icon: FileText },
  template: { label: "Templates", single: "Template", icon: Layers },
  audio: { label: "Audio", single: "Audio", icon: FileAudio },
  video: { label: "Video", single: "Video", icon: Film },
} satisfies Record<string, { label: string; single: string; icon: LucideIcon }>;

export type ResourceType = keyof typeof RESOURCE_TYPES;

export function isResourceType(value: string | undefined): value is ResourceType {
  return Boolean(value) && Object.hasOwn(RESOURCE_TYPES, value as string);
}

function typeOf(resource: Resource) {
  return RESOURCE_TYPES[resource.type as ResourceType] ?? RESOURCE_TYPES.guide;
}

function DownloadButton({ resource }: { resource: Resource }) {
  return (
    <a
      download
      href={`/api/resources/${resource.slug}/download`}
      className="dk-btn"
      data-size="sm"
      data-variant="navy"
      aria-label={`Download ${resource.title} (${resource.fileFormat}, ${resource.fileSize})`}
    >
      <Download aria-hidden />
      Download
    </a>
  );
}

/** Decorative hero still life: three fanned worksheets, a paperclip and a taped snapshot. */
export function DeskStack({ lead }: { lead?: Resource }) {
  const kind = lead ? typeOf(lead).single : "Worksheet";
  return (
    <div aria-hidden className="dk-stack">
      <div className="dk-sheet" data-pos="back" />
      <div className="dk-sheet" data-pos="mid" />
      <div className="dk-sheet" data-pos="top">
        <svg viewBox="0 0 24 66" className="dk-clip">
          <defs>
            <linearGradient id="dk-clip-metal" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#6b7078" />
              <stop offset="0.45" stopColor="#f3f4f6" />
              <stop offset="1" stopColor="#8a9099" />
            </linearGradient>
          </defs>
          <path
            d="M8 20 V50 A4 4 0 0 0 16 50 V10 A6 6 0 0 0 4 10 V54 A8 8 0 0 0 20 54 V16"
            fill="none"
            stroke="url(#dk-clip-metal)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        <p className="dk-type text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#8c241c]">
          {kind} · {lead?.fileFormat ?? "PDF"}
        </p>
        <p className="mt-2 font-serif text-[1.35rem] leading-tight text-navy">{lead?.title ?? "Purpose Course worksheet"}</p>
        <span className="dk-sheet-lines flex flex-col">
          {[78, 60, 70, 46].map((width) => (
            <span key={width} className="flex h-[1.6rem] items-end gap-2 pb-[3px]">
              <span className="dk-sheet-box shrink-0" />
              <svg viewBox="0 0 120 10" preserveAspectRatio="none" style={{ width: `${width}%` }} className="h-2.5 text-navy/50">
                <path d="M1 6 C 10 1, 18 9, 28 5 S 46 2, 56 6 S 76 9, 86 4 S 106 3, 119 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          ))}
        </span>
      </div>
      <div className="dk-polaroid">
        <span className="dk-tape" />
        <div className="dk-polaroid-photo">
          <CoverImage src="/images/learning-materials.jpg" sizes="(min-width: 1024px) 12rem, 40vw" eager />
        </div>
        <p className="mt-2 text-center font-serif text-[13px] italic text-stone-600">Take it home</p>
      </div>
    </div>
  );
}

/** Featured resource as a manila folder; the sheet inside slides up on hover or focus. */
export function ResourceFolder({ resource }: { resource: Resource }) {
  const kind = typeOf(resource);
  const Icon = kind.icon;
  return (
    <div className="dk-folder">
      <span aria-hidden className="dk-folder-back" />
      <span aria-hidden className="dk-folder-tab">{kind.single}</span>
      <span aria-hidden className="dk-folder-sheet">{resource.title}</span>
      <article className="dk-folder-front">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="dk-chip">
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {kind.single}
          </span>
          <span className="dk-type text-[12px] text-[#5a4410]">
            {resource.fileFormat} · {resource.fileSize}
          </span>
        </div>
        <h3 className="mt-4 font-serif text-2xl leading-snug text-navy">{resource.title}</h3>
        {resource.description ? <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[#4d4128]">{resource.description}</p> : <span className="flex-1" />}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#b8964a]/45 pt-4">
          <span className="dk-type text-[12px] text-[#5a4410]">{resource.level ?? "All levels"}</span>
          <DownloadButton resource={resource} />
        </div>
      </article>
    </div>
  );
}

/** Library entry as a punched, dog-eared document resting on a second sheet. */
export function ResourceDoc({ resource, starter = false }: { resource: Resource; starter?: boolean }) {
  const kind = typeOf(resource);
  const Icon = kind.icon;
  const ready = Boolean(resourceFileTarget(resource.fileUrl));
  return (
    <div className="dk-doc-wrap">
      <article className="dk-doc">
        <span aria-hidden className="dk-holes" />
        <div className="flex items-start justify-between gap-3">
          <span className="dk-chip">
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {kind.single}
          </span>
          {starter ? <span className="dk-sticker -mt-2 mr-4">Start here</span> : null}
        </div>
        <h3 className="mt-4 font-serif text-xl leading-snug text-navy">{resource.title}</h3>
        {resource.description ? <p className="mt-2 flex-1 text-[14px] leading-relaxed text-stone-600">{resource.description}</p> : <span className="flex-1" />}
        <p className="dk-type mt-4 text-[12px] text-stone-600">{resource.level ?? "All levels"}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-navy/20 pt-4">
          {ready ? (
            <>
              <span className="dk-type text-[12px] text-stone-600">
                {resource.fileFormat} · {resource.fileSize}
              </span>
              <DownloadButton resource={resource} />
            </>
          ) : (
            <span className="dk-stamp my-2" data-ink="rust">In preparation</span>
          )}
        </div>
      </article>
    </div>
  );
}
