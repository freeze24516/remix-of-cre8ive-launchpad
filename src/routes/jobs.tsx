import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Briefcase, MapPin, Globe2, Clock } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listJobs } from "@/lib/jobs.functions";
import { listCategories } from "@/lib/marketplace.functions";

type Search = { q?: string; category?: string; remote?: boolean; page?: number };

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Creative jobs — CRE8IVE" },
      { name: "description", content: "Browse open creative briefs and projects from vetted clients." },
      { property: "og:title", content: "Creative jobs — CRE8IVE" },
      { property: "og:description", content: "Find your next creative project on CRE8IVE." },
      { property: "og:url", content: "/jobs" },
    ],
    links: [{ rel: "canonical", href: "/jobs" }],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    remote: s.remote === true || s.remote === "true" ? true : undefined,
    page: typeof s.page === "number" ? s.page : 1,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["categories"], queryFn: () => listCategories() }),
      context.queryClient.ensureQueryData({ queryKey: ["jobs", deps], queryFn: () => listJobs({ data: { ...deps, page: deps.page ?? 1 } }) }),
    ]);
  },
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">No jobs found.</div>,
  component: JobsPage,
});

function JobsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(search.q ?? "");
  const { data: categories } = useSuspenseQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const { data: result } = useSuspenseQuery({ queryKey: ["jobs", search], queryFn: () => listJobs({ data: { ...search, page: search.page ?? 1 } }) });

  const apply = (next: Partial<Search>) => navigate({ search: { ...search, ...next, page: 1 } as Search });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="bg-hero">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="font-display text-3xl font-bold md:text-5xl">Creative jobs</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Briefs from clients looking for talent — apply directly.</p>
          <form
            className="mt-6 flex max-w-2xl items-center gap-2 rounded-xl border border-border/80 bg-card/60 p-2 backdrop-blur"
            onSubmit={(e) => { e.preventDefault(); apply({ q }); }}
          >
            <Search className="ml-2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search briefs…" className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
            <Button type="submit" size="sm" className="bg-[image:var(--gradient-primary)]">Search</Button>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={!search.category ? "default" : "outline"} size="sm" onClick={() => apply({ category: undefined })}>All</Button>
          {categories.map((c) => (
            <Button key={c.id} size="sm" variant={search.category === c.slug ? "default" : "outline"} onClick={() => apply({ category: c.slug })}>{c.name}</Button>
          ))}
          <div className="mx-2 h-5 w-px bg-border" />
          <Button size="sm" variant={search.remote ? "default" : "ghost"} onClick={() => apply({ remote: search.remote ? undefined : true })}>
            <Globe2 className="mr-1 h-3.5 w-3.5" /> Remote
          </Button>
        </div>

        {result.jobs.length === 0 ? (
          <div className="mt-16 grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No open jobs yet</p>
            <p className="text-sm text-muted-foreground">Be the first to post a brief.</p>
            <Button asChild className="mt-4 bg-[image:var(--gradient-primary)]"><Link to="/dashboard/jobs/new">Post a job</Link></Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {result.jobs.map((j: any) => (
              <Link key={j.id} to="/jobs/$jobId" params={{ jobId: j.id }} className="group block rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold group-hover:text-primary">{j.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {j.category && <Badge variant="secondary" className="text-[10px]">{j.category.name}</Badge>}
                      {j.remote_ok && <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />Remote</span>}
                      {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                      {j.deadline && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Due {new Date(j.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {(j.budget_min || j.budget_max) && (
                      <div className="font-semibold text-accent">{j.currency} {j.budget_min ?? "?"}{j.budget_max ? `–${j.budget_max}` : ""}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}