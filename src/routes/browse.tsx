import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Sparkles, MapPin, Filter, X } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { browseCreators, listCategories } from "@/lib/marketplace.functions";
import { reviewSummaries } from "@/lib/reviews.functions";
import { SaveCreatorButton } from "@/components/SaveCreatorButton";
import { RatingBadge } from "@/components/reviews/RatingStars";
import { VerificationBadge } from "@/components/VerificationBadge";
import { FeaturedCreatorsStrip } from "@/components/marketplace/FeaturedCreatorsStrip";

type Sort = "featured" | "rating" | "hires" | "recent" | "newest";
type Search = {
  q?: string;
  category?: string;
  availability?: "available" | "limited" | "booked" | "vacation";
  experience?: "entry" | "intermediate" | "expert";
  budget?: "5k-10k" | "10k-25k" | "25k-50k" | "50k+";
  location?: "remote" | "india" | "global";
  tool?: string;
  sort?: Sort;
  page?: number;
};

const BUDGETS = [
  { v: "5k-10k", label: "₹5k–₹10k" },
  { v: "10k-25k", label: "₹10k–₹25k" },
  { v: "25k-50k", label: "₹25k–₹50k" },
  { v: "50k+", label: "₹50k+" },
] as const;
const EXPERIENCE = [
  { v: "entry", label: "Beginner" },
  { v: "intermediate", label: "Intermediate" },
  { v: "expert", label: "Expert" },
] as const;
const LOCATIONS = [
  { v: "remote", label: "Remote" },
  { v: "india", label: "India" },
  { v: "global", label: "Global" },
] as const;
const TOOLS = ["Premiere Pro", "After Effects", "Photoshop", "Blender", "DaVinci Resolve", "Figma"] as const;
const SORTS: { v: Sort; label: string }[] = [
  { v: "featured", label: "Featured" },
  { v: "rating", label: "Highest Rated" },
  { v: "hires", label: "Most Hired" },
  { v: "recent", label: "Recently Active" },
  { v: "newest", label: "Newest" },
];

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse creators — CRE8IVE" },
      { name: "description", content: "Discover vetted creative talent: video, motion, photography, design, illustration and more." },
      { property: "og:title", content: "Browse creators — CRE8IVE" },
      { property: "og:description", content: "Discover vetted creative talent across categories." },
      { property: "og:url", content: "/browse" },
    ],
    links: [{ rel: "canonical", href: "/browse" }],
  }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const oneOf = <T extends string>(v: unknown, opts: readonly T[]): T | undefined =>
      typeof v === "string" && (opts as readonly string[]).includes(v) ? (v as T) : undefined;
    return {
      q: typeof s.q === "string" ? s.q : undefined,
      category: typeof s.category === "string" ? s.category : undefined,
      availability: oneOf(s.availability, ["available", "limited", "booked", "vacation"] as const),
      experience: oneOf(s.experience, ["entry", "intermediate", "expert"] as const),
      budget: oneOf(s.budget, ["5k-10k", "10k-25k", "25k-50k", "50k+"] as const),
      location: oneOf(s.location, ["remote", "india", "global"] as const),
      tool: typeof s.tool === "string" ? s.tool : undefined,
      sort: oneOf(s.sort, ["featured", "rating", "hires", "recent", "newest"] as const),
      page: typeof s.page === "number" ? s.page : 1,
    };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["categories"], queryFn: () => listCategories() }),
      context.queryClient.ensureQueryData({
        queryKey: ["browse", deps],
        queryFn: () => browseCreators({ data: { ...deps, page: deps.page ?? 1 } }),
      }),
    ]);
  },
  component: BrowsePage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-muted-foreground">Failed to load creators. {error.message}</div>
  ),
});

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useSuspenseQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const { data: result } = useQuery({
    queryKey: ["browse", search],
    queryFn: () => browseCreators({ data: { ...search, page: search.page ?? 1 } }),
  });
  const userIds = (result?.creators ?? []).map((c: any) => c.user_id).filter(Boolean);
  const { data: summaries } = useQuery({
    queryKey: ["review-summaries", userIds],
    queryFn: () => reviewSummaries({ data: { userIds } }),
    enabled: userIds.length > 0,
  });

  function applySearch(next: Partial<Search>) {
    navigate({ search: { ...search, ...next, page: 1 } as Search });
  }
  function clearAll() {
    navigate({ search: { sort: search.sort } as Search });
  }

  const activeFilterCount = [
    search.experience, search.budget, search.location, search.tool, search.availability,
  ].filter(Boolean).length;

  const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="bg-hero">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="font-display text-3xl font-bold md:text-5xl">Browse creative talent</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Filter by craft, budget, tools or experience.</p>
          <form
            className="mt-6 flex max-w-2xl items-center gap-2 rounded-xl border border-border/80 bg-card/60 p-2 backdrop-blur"
            onSubmit={(e) => { e.preventDefault(); applySearch({ q }); }}
          >
            <Search className="ml-2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by skill, software, headline…"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm" className="bg-[image:var(--gradient-primary)]">Search</Button>
          </form>
        </div>
      </section>

      <FeaturedCreatorsStrip limit={3} />

      <section className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {/* Top bar: category + sort + filter toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={!search.category ? "default" : "outline"} size="sm" onClick={() => applySearch({ category: undefined })}>All</Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={search.category === c.slug ? "default" : "outline"}
              onClick={() => applySearch({ category: c.slug })}
            >
              {c.name}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={search.sort ?? "featured"}
              onChange={(e) => applySearch({ sort: e.target.value as Sort })}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {SORTS.map((s) => <option key={s.v} value={s.v}>Sort: {s.label}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => setShowFilters((s) => !s)} className="gap-1">
              <Filter className="h-3.5 w-3.5" /> Filters
              {activeFilterCount > 0 && <Badge className="ml-1 h-4 px-1 text-[10px]">{activeFilterCount}</Badge>}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-5 rounded-2xl border border-border/70 bg-card/60 p-5 md:grid-cols-2 lg:grid-cols-3">
            <FilterGroup label="Budget">
              {BUDGETS.map((b) => (
                <Chip key={b.v} active={search.budget === b.v} onClick={() => applySearch({ budget: search.budget === b.v ? undefined : b.v })}>{b.label}</Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Experience">
              {EXPERIENCE.map((e) => (
                <Chip key={e.v} active={search.experience === e.v} onClick={() => applySearch({ experience: search.experience === e.v ? undefined : e.v })}>{e.label}</Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Availability">
              {(["available", "limited", "booked"] as const).map((a) => (
                <Chip key={a} active={search.availability === a} onClick={() => applySearch({ availability: search.availability === a ? undefined : a })}>
                  <span className="capitalize">{a}</span>
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Location">
              {LOCATIONS.map((l) => (
                <Chip key={l.v} active={search.location === l.v} onClick={() => applySearch({ location: search.location === l.v ? undefined : l.v })}>{l.label}</Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Tools">
              {TOOLS.map((t) => (
                <Chip key={t} active={search.tool === t} onClick={() => applySearch({ tool: search.tool === t ? undefined : t })}>{t}</Chip>
              ))}
            </FilterGroup>
            <div className="flex items-end">
              {activeFilterCount > 0 && (
                <Button size="sm" variant="ghost" onClick={clearAll} className="gap-1"><X className="h-3 w-3" /> Clear all</Button>
              )}
            </div>
          </div>
        )}

        {!result || result.creators.length === 0 ? (
          <div className="mt-16 grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No creators match these filters</p>
            <p className="text-sm text-muted-foreground">Try clearing filters or broadening your search.</p>
            {activeFilterCount > 0 && <Button onClick={clearAll} className="mt-4">Clear filters</Button>}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.creators.map((c: any) => {
              const s = summaries?.[c.user_id] ?? { average: 0, count: 0 };
              return (
                <div key={c.id} className="relative">
                  {c.is_featured && (
                    <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-primary)] px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow">
                      <Sparkles className="h-3 w-3" /> Featured
                    </div>
                  )}
                  <SaveCreatorButton creatorId={c.id} className="absolute right-3 top-3 z-10" />
                  <Link
                    to="/u/$username"
                    params={{ username: c.profile.username }}
                    className="group block rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3 pr-10 pt-4">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                        {c.profile.avatar_url ? <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{c.profile.display_name}</span>
                          <VerificationBadge level={c.verification_level} size="xs" showLabel={false} />
                        </div>
                        <div className="text-xs text-muted-foreground">@{c.profile.username}</div>
                      </div>
                    </div>
                    {c.headline && <p className="mt-3 line-clamp-2 text-sm">{c.headline}</p>}
                    <div className="mt-3 flex items-center gap-3">
                      <RatingBadge average={s.average} count={s.count} />
                      {c.hire_count > 0 && <span className="text-[11px] text-muted-foreground">{c.hire_count} hires</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.creator_categories?.slice(0, 3).map((cc: any) => (
                        <Badge key={cc.category.id} variant="secondary" className="text-[10px]">{cc.category.name}</Badge>
                      ))}
                    </div>
                    {c.profile.location && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{c.profile.location}</div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
