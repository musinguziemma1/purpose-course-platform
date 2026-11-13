import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  MessagesSquare,
  Search,
  UserRound,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getSearchFacets, searchPlatform, type SearchType } from "@/db/search";
import { getSessionUser, homePathForRole } from "@/lib/auth";
import { workspaceLabelForRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { HeroBackdrop } from "@/components/site/hero-backdrop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Purpose Course",
  description: "Search articles, courses, lessons, resources, discussions, people and events across Purpose Course.",
};

const ICONS: Record<SearchType, typeof BookOpen> = {
  article: FileText,
  course: GraduationCap,
  lesson: BookOpen,
  resource: Download,
  discussion: MessagesSquare,
  person: UserRound,
  event: CalendarDays,
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const params = await searchParams;
  const query = params.q ?? "";
  const activeType = (params.type ?? "") as SearchType | "";
  const [user, result, facets] = await Promise.all([
    getSessionUser(),
    searchPlatform(query, { types: activeType ? [activeType] : undefined }),
    getSearchFacets(),
  ]);
  const facetByType = new Map(facets.map((facet) => [facet.type, facet.value]));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        user={user ? { fullName: user.fullName, roleSlug: user.roleSlug, profileId: user.profileId } : null}
        dashboardHref={user ? homePathForRole(user.roleSlug) : "/login"}
        dashboardLabel={workspaceLabelForRole(user?.roleSlug)}
      />
      <main className="flex-1 bg-cream/40">
        <div className="shell max-w-5xl py-10">
          <header className="relative isolate -mx-1 overflow-hidden rounded-2xl border border-navy/10 bg-paper p-6 sm:p-9">
          <HeroBackdrop src="/images/learning-materials.jpg" />
          <div className="relative"><p className="eyebrow">Search Purpose Course</p>
          <h1 className="display mt-3 text-3xl text-navy sm:text-4xl">One search across the whole platform.</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-600">Find your next insight, lesson or conversation.</p></div>
          </header>

          <form action="/search" className="mt-6 flex flex-wrap items-center gap-2">
            {activeType ? <input type="hidden" name="type" value={activeType} /> : null}
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                name="q"
                defaultValue={query}
                autoFocus
                placeholder="Search articles, courses, lessons, resources, discussions, people, events…"
                className="h-12 w-full rounded-full border border-navy/15 bg-paper pl-11 pr-4 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
              />
            </div>
            <button type="submit" className="h-12 rounded-full bg-navy px-6 text-sm font-semibold text-paper hover:bg-navy-700">
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Link
              href={query ? `/search?q=${encodeURIComponent(query)}` : "/search"}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11.5px] font-medium",
                !activeType ? "border-navy bg-navy text-paper" : "border-navy/15 bg-paper text-navy hover:border-navy/40",
              )}
            >
              All results
              {result.total > 0 ? <span className="ml-1.5 text-[10px] opacity-70">{result.total}</span> : null}
            </Link>
            {facets.map((facet) => (
              <Link
                key={facet.type}
                href={`/search?${new URLSearchParams({ ...(query ? { q: query } : {}), type: facet.type }).toString()}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11.5px] font-medium capitalize",
                  activeType === facet.type ? "border-navy bg-navy text-paper" : "border-navy/15 bg-paper text-navy hover:border-navy/40",
                )}
              >
                {facet.type}s <span className="ml-1 text-[10px] opacity-60">{facetByType.get(facet.type) ?? 0}</span>
              </Link>
            ))}
          </div>

          {query.length < 2 ? (
            <div className="mt-8 rounded-2xl border border-navy/10 bg-paper p-8 text-center shadow-xs">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-cream text-gold-dark">
                <Search className="h-5 w-5" />
              </span>
              <p className="mt-2 font-serif text-lg text-navy">Start typing to search the platform</p>
              <p className="mx-auto mt-1 max-w-lg text-[12.5px] leading-relaxed text-stone-600">
                Try “identity”, “purpose statement”, “clarity”, “cohort”, “gifting audit” or the name of a mentor. Results
                come from the journal, academy, resource library, communities, people directory and event schedule.
              </p>
            </div>
          ) : result.total === 0 ? (
            <div className="mt-8 rounded-2xl border border-navy/10 bg-paper p-8 text-center">
              <p className="font-serif text-xl text-navy">No matches for “{query}”.</p>
              <p className="mt-1 text-[12.5px] text-stone-600">Try a broader word, or browse the journal and academy directly.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link href="/blog" className="rounded-full bg-navy px-4 py-2 text-[11.5px] font-semibold text-paper">Purpose Journal</Link>
                <Link href="/course" className="rounded-full border border-navy/15 px-4 py-2 text-[11.5px] font-medium text-navy">The programme</Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <p className="text-[12.5px] text-stone-600">
                <strong className="text-navy">{result.total}</strong> results for “{query}”
              </p>
              {result.groups
                .filter((group) => group.hits.length > 0)
                .map((group) => {
                  const Icon = ICONS[group.type];
                  return (
                    <section key={group.type} className="rounded-2xl border border-navy/10 bg-paper">
                      <div className="flex items-center justify-between border-b border-navy/10 px-5 py-2.5">
                        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy">
                          <Icon className="h-3.5 w-3.5 text-gold-dark" /> {group.label}
                        </p>
                        <span className="text-[10.5px] text-stone-500">{group.hits.length}</span>
                      </div>
                      <ul className="divide-y divide-navy/8">
                        {group.hits.map((hit) => (
                          <li key={`${hit.type}-${hit.id}`}>
                            <Link href={hit.href} className="block px-5 py-3 transition-colors hover:bg-cream/40">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="font-serif text-[15px] text-navy">{hit.title}</p>
                                <span className="text-[9.5px] uppercase tracking-[0.08em] text-stone-400">{hit.meta}</span>
                              </div>
                              {hit.snippet ? <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-stone-600">{hit.snippet}</p> : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
