import "../desk.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, Mail } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { rise } from "@/components/site/public-hero";
import {
  DeskStack,
  RESOURCE_TYPES,
  ResourceDoc,
  ResourceFolder,
  isResourceType,
  type Resource,
  type ResourceType,
} from "@/components/resources/resource-desk";
import { getResources } from "@/db/queries";
import { resourceFileTarget } from "@/lib/resource-files";
import { publicUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resource library",
  description:
    "Free worksheets, field guides and planning canvases from the Purpose Course — the Purpose Journal, gifting audit, vision plan and more.",
  alternates: { canonical: publicUrl("/resources") },
};

const isReady = (resource: Resource) => Boolean(resourceFileTarget(resource.fileUrl));

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const activeType = isResourceType(type) ? type : null;
  const resources = await getResources(40);
  const available = resources.filter(isReady);
  const featured = available.filter((resource) => resource.isFeatured).slice(0, 3);
  const featuredIds = new Set(featured.map((resource) => resource.id));
  const totalDownloads = available.reduce((sum, resource) => sum + resource.downloadCount, 0);
  const typesPresent = (Object.keys(RESOURCE_TYPES) as ResourceType[]).filter((kind) => resources.some((resource) => resource.type === kind));
  // Ready files first; the sort is stable, so the editorial order holds within each group.
  const shelf = resources
    .filter((resource) => !activeType || resource.type === activeType)
    .sort((a, b) => Number(isReady(b)) - Number(isReady(a)));

  return (
    <div className="dk-linen">
      <section className="relative isolate overflow-hidden">
        <div className="shell grid grid-cols-1 items-center gap-14 py-14 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-20">
          <div>
            <p className="rise dk-plate" style={rise(0)}>Resource library</p>
            <h1 className="rise display mt-5 text-[2.7rem] text-navy sm:text-6xl" style={rise(1)}>
              Take the work <span className="dk-foil">home</span> with you.
            </h1>
            <p className="rise mt-6 max-w-xl text-[16px] leading-relaxed text-stone-700" style={rise(2)}>
              Practical starter worksheets, guides and planning canvases for your learning journey. Available files are free to
              download and use with your team, small group or class. More resources will be added as they are prepared.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={rise(3)}>
              <a href="#library" className="dk-btn" data-variant="navy">
                Open the library <ArrowDown aria-hidden />
              </a>
              <a href="#request" className="dk-btn">
                New resources by email <Mail aria-hidden />
              </a>
            </div>
            <ul className="rise mt-9 flex flex-wrap items-center gap-3" style={rise(4)} aria-label="The library at a glance">
              <li className="dk-dymo">{available.length === 1 ? "1 file ready" : `${available.length} files ready`}</li>
              <li className="dk-dymo">{totalDownloads === 1 ? "1 download" : `${totalDownloads.toLocaleString("en-GB")} downloads`}</li>
              <li className="dk-dymo">Free, always</li>
            </ul>
          </div>
          <DeskStack lead={featured[0] ?? available[0] ?? resources[0]} />
        </div>
      </section>

      {featured.length && !activeType ? (
        <section className="py-12 lg:py-16">
          <div className="shell">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">Start here</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-navy">The essentials</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-stone-700">Begin with these. Print them, write on them and bring them to your next session.</p>
            </Reveal>
            <ul className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((resource, index) => (
                <Reveal as="li" key={resource.id} delay={index * 0.07} className="h-full">
                  <ResourceFolder resource={resource} />
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="library" className="scroll-mt-28 pb-16 pt-6 lg:pb-20">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">Full library</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-navy">Worksheets, guides and sessions</h2>
            </Reveal>
            <p className="dk-type text-[13px] text-stone-600" aria-live="polite">
              {shelf.length === 1 ? "1 file" : `${shelf.length} files`}
              {activeType ? ` · ${RESOURCE_TYPES[activeType].label.toLowerCase()}` : ""}
            </p>
          </div>

          <nav aria-label="Filter the library by type" className="dk-tabs mt-8">
            <Link href="/resources#library" aria-current={!activeType ? "page" : undefined} className="dk-tab" data-tone="all">
              Everything <span className="dk-tab-count">{resources.length}</span>
            </Link>
            {typesPresent.map((kind) => {
              const Icon = RESOURCE_TYPES[kind].icon;
              return (
                <Link
                  key={kind}
                  href={`/resources?type=${kind}#library`}
                  aria-current={activeType === kind ? "page" : undefined}
                  className="dk-tab"
                  data-tone={kind}
                >
                  <Icon aria-hidden />
                  {RESOURCE_TYPES[kind].label}
                  <span className="dk-tab-count">{resources.filter((resource) => resource.type === kind).length}</span>
                </Link>
              );
            })}
          </nav>
          <div className="dk-drawer">
            {shelf.length ? (
              <ul className="grid gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                {shelf.map((resource, index) => (
                  <Reveal as="li" key={resource.id} delay={Math.min(index * 0.05, 0.3)} className="h-full">
                    <ResourceDoc resource={resource} starter={featuredIds.has(resource.id)} />
                  </Reveal>
                ))}
              </ul>
            ) : (
              <div className="py-10 text-center">
                <p className="font-serif text-2xl text-navy">This drawer is empty for now.</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
                  Nothing of this type has been published yet. Ask for new resources below and we will send them when they are ready.
                </p>
                <Link href="/resources#library" className="dk-btn mt-6" data-size="sm">Show everything</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="request" className="scroll-mt-28 pb-20 pt-4">
        <div className="shell">
          <Reveal>
            <div className="dk-slip mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p className="dk-type text-[12px] font-bold uppercase tracking-[0.22em] text-[#8c241c]">Request slip</p>
                <h2 className="mt-3 font-serif text-3xl leading-tight text-navy">New resources, sent when they are ready.</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
                  Join the list and we will send worksheets as they are released, plus one new article each Thursday.
                </p>
              </div>
              <NewsletterForm source="resources" />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
