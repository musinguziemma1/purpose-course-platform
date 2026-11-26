"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, TrendingUp, Clock, Filter, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogBody } from "@/components/ui/dialog";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: "article" | "course" | "lesson" | "discussion" | "resource" | "event";
  url: string;
  category?: string;
  date?: Date;
  metadata?: Record<string, string>;
}

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Cmd/Ctrl + K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}${selectedType ? `&type=${selectedType}` : ""}`
        );
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedType]);

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
    setQuery("");
  };

  const popularSearches = [
    "Purpose discovery",
    "Identity assessment",
    "Vision planning",
    "Leadership development",
  ];

  const recentSearches = React.useMemo(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : [];
  }, []);

  const saveSearch = (searchQuery: string) => {
    if (typeof window === "undefined") return;
    const recent = recentSearches.filter((s: string) => s !== searchQuery);
    recent.unshift(searchQuery);
    localStorage.setItem("recentSearches", JSON.stringify(recent.slice(0, 5)));
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-2.5 transition-all hover:border-gold hover:shadow-md",
          className
        )}
      >
        <Search className="h-5 w-5 text-stone-400 transition-colors group-hover:text-gold" />
        <span className="text-sm text-stone-500">Search...</span>
        <kbd className="ml-auto hidden rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="xl" showClose={false} className="p-0">
          <div className="flex flex-col max-h-[80vh]">
            {/* Search Input */}
            <div className="border-b border-stone-200 p-4">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 shrink-0 text-stone-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles, courses, discussions..."
                  className="flex-1 bg-transparent text-lg outline-none placeholder:text-stone-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="rounded-lg p-1 transition-colors hover:bg-stone-100"
                  >
                    <X className="h-5 w-5 text-stone-400" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="hidden rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-200 sm:block"
                >
                  ESC
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                <FilterButton
                  active={!selectedType}
                  onClick={() => setSelectedType(null)}
                >
                  All
                </FilterButton>
                <FilterButton
                  active={selectedType === "article"}
                  onClick={() => setSelectedType("article")}
                >
                  Articles
                </FilterButton>
                <FilterButton
                  active={selectedType === "course"}
                  onClick={() => setSelectedType("course")}
                >
                  Courses
                </FilterButton>
                <FilterButton
                  active={selectedType === "discussion"}
                  onClick={() => setSelectedType("discussion")}
                >
                  Discussions
                </FilterButton>
                <FilterButton
                  active={selectedType === "resource"}
                  onClick={() => setSelectedType("resource")}
                >
                  Resources
                </FilterButton>
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {loading ? (
                  <SearchSkeleton key="skeleton" />
                ) : query && results.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {results.map((result, index) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        index={index}
                        onClick={() => {
                          handleResultClick(result);
                          saveSearch(query);
                        }}
                      />
                    ))}
                  </motion.div>
                ) : query && results.length === 0 ? (
                  <EmptyState key="empty" query={query} />
                ) : (
                  <DefaultState
                    key="default"
                    popularSearches={popularSearches}
                    recentSearches={recentSearches}
                    onSearchClick={(search) => setQuery(search)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
        active
          ? "bg-navy text-white shadow-sm"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      )}
    >
      {children}
    </button>
  );
}

function SearchResultItem({
  result,
  index,
  onClick,
}: {
  result: SearchResult;
  index: number;
  onClick: () => void;
}) {
  const typeIcons = {
    article: "📄",
    course: "📚",
    lesson: "📖",
    discussion: "💬",
    resource: "📎",
    event: "📅",
  };

  const typeColors = {
    article: "text-blue-600 bg-blue-50",
    course: "text-purple-600 bg-purple-50",
    lesson: "text-green-600 bg-green-50",
    discussion: "text-amber-600 bg-amber-50",
    resource: "text-pink-600 bg-pink-50",
    event: "text-teal-600 bg-teal-50",
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-gold hover:shadow-md"
    >
      <div className={cn("rounded-lg p-2 text-xl", typeColors[result.type])}>
        {typeIcons[result.type]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h4 className="font-semibold text-navy group-hover:text-gold-dark transition-colors">
            {result.title}
          </h4>
          <ArrowRight className="h-5 w-5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-gold" />
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-stone-600">{result.description}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
          <span className="capitalize">{result.type}</span>
          {result.category && (
            <>
              <span>·</span>
              <span>{result.category}</span>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function DefaultState({
  popularSearches,
  recentSearches,
  onSearchClick,
}: {
  popularSearches: string[];
  recentSearches: string[];
  onSearchClick: (search: string) => void;
}) {
  return (
    <div className="space-y-6">
      {recentSearches.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-500">
            <Clock className="h-4 w-4" />
            <span>Recent Searches</span>
          </div>
          <div className="space-y-2">
            {recentSearches.map((search: string) => (
              <button
                key={search}
                onClick={() => onSearchClick(search)}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-stone-100"
              >
                <Search className="h-4 w-4 text-stone-400" />
                <span className="text-sm text-stone-700">{search}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-500">
          <TrendingUp className="h-4 w-4" />
          <span>Popular Searches</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((search) => (
            <button
              key={search}
              onClick={() => onSearchClick(search)}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-all hover:border-gold hover:bg-gold/5"
            >
              {search}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
        <Search className="h-8 w-8 text-stone-400" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-navy">No results found</h3>
      <p className="mt-2 text-sm text-stone-600">
        We couldn't find anything for "{query}". Try different keywords or browse our categories.
      </p>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-lg bg-stone-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-stone-200" />
              <div className="h-4 w-full rounded bg-stone-200" />
              <div className="h-3 w-24 rounded bg-stone-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
