import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Sparkles, ShieldCheck, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { browseCreators, listCategories } from "@/lib/marketplace.functions";

type Search = { q?: string; category?: string; availability?: "available" | "limited" | "busy"; page?: number };

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse creators — CRE8IVE" },
      { name: "description", content: "Discover vetted creative talent: video, motion, photography, design, illustration and more." },
      { property: "og:title", content: "Browse creators — CRE8IVE" },
      { property: "og:description", content: "Discover vetted creative talent across categories." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    availability:
      s.availability === "available" || s.availability === "limited" || s.availability === "busy"
        ? s.availability
        : undefined,
    page: typeof s.page === "number" ? s.page : 1,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["categories"],
        queryFn: () => listCategories(),
      }),
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

  const { data: categories } = useSuspenseQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const { data: result } = useQuery({
    queryKey: ["browse", search],
    queryFn: () => browseCreators({ data: { ...search, page: search.page ?? 1 } }),
  });

  function applySearch(next: Partial<Search>) {
    navigate({ search: { ...search, ...next, page: 1 } as Search });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="bg-hero">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="font-display text-3xl font-bold md:text-5xl">Browse creative talent</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Filter by craft, availability, or search anything — find your match.</p>
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

      <section className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
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
          <div className="mx-2 h-5 w-px bg-border" />
          {(["available", "limited", "busy"] as const).map((a) => (
            <Button
              key={a}
              size="sm"
              variant={search.availability === a ? "default" : "ghost"}
              onClick={() => applySearch({ availability: search.availability === a ? undefined : a })}
              className="capitalize"
            >
              {a}
            </Button>
          ))}
        </div>

        {!result || result.creators.length === 0 ? (
          <div className="mt-16 grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No creators yet</p>
            <p className="text-sm text-muted-foreground">Be the first — set up your creator profile to appear here.</p>
            <Button asChild className="mt-4 bg-[image:var(--gradient-primary)]"><Link to="/auth" search={{ mode: "signup" }}>Join as a creator</Link></Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.creators.map((c: any) => (
              <Link
                key={c.id}
                to="/u/$username"
                params={{ username: c.profile.username }}
                className="group rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                    {c.profile.avatar_url ? <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{c.profile.display_name}</span>
                      {c.is_verified && <ShieldCheck className="h-4 w-4 text-accent" />}
                    </div>
                    <div className="text-xs text-muted-foreground">@{c.profile.username}</div>
                  </div>
                </div>
                {c.headline && <p className="mt-3 line-clamp-2 text-sm">{c.headline}</p>}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.creator_categories?.slice(0, 3).map((cc: any) => (
                    <Badge key={cc.category.id} variant="secondary" className="text-[10px]">{cc.category.name}</Badge>
                  ))}
                </div>
                {c.profile.location && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{c.profile.location}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}