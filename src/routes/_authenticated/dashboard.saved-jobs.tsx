import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bookmark, Globe2, MapPin, Clock } from "lucide-react";
import { listSavedJobs } from "@/lib/saved.functions";
import { SaveJobButton } from "@/components/SaveJobButton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard/saved-jobs")({
  head: () => ({ meta: [{ title: "Saved jobs — CRE8IVE" }] }),
  component: SavedJobsPage,
});

type Sort = "newest" | "saved" | "budget_high" | "budget_low";

function SavedJobsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["saved-jobs"], queryFn: () => listSavedJobs() });
  const [sort, setSort] = useState<Sort>("saved");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Map<string, string>();
    (data ?? []).forEach((r: any) => {
      if (r.job.category) set.set(r.job.category.slug, r.job.category.name);
    });
    return Array.from(set, ([slug, name]) => ({ slug, name }));
  }, [data]);

  const items = useMemo(() => {
    let list = data ?? [];
    if (category !== "all") list = list.filter((r: any) => r.job.category?.slug === category);
    const sorted = [...list];
    sorted.sort((a: any, b: any) => {
      if (sort === "newest") return +new Date(b.job.created_at) - +new Date(a.job.created_at);
      if (sort === "saved") return +new Date(b.saved_at) - +new Date(a.saved_at);
      if (sort === "budget_high") return (b.job.budget_max ?? 0) - (a.job.budget_max ?? 0);
      return (a.job.budget_min ?? 0) - (b.job.budget_min ?? 0);
    });
    return sorted;
  }, [data, sort, category]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Saved jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Briefs you've bookmarked.</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No saved jobs yet</p>
          <p className="text-sm text-muted-foreground">Bookmark briefs on the jobs board to find them here.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="saved">Recently saved</SelectItem>
                <SelectItem value="newest">Newest posted</SelectItem>
                <SelectItem value="budget_high">Budget: high to low</SelectItem>
                <SelectItem value="budget_low">Budget: low to high</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {items.map((r: any) => (
              <div key={r.job.id} className="relative rounded-2xl border border-border/70 bg-card p-6">
                <SaveJobButton jobId={r.job.id} className="absolute right-3 top-3" />
                <Link to="/jobs/$jobId" params={{ jobId: r.job.id }} className="block pr-12">
                  <h3 className="font-display text-lg font-semibold">{r.job.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.job.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {r.job.category && <Badge variant="secondary" className="text-[10px]">{r.job.category.name}</Badge>}
                    {r.job.remote_ok && <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />Remote</span>}
                    {r.job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.job.location}</span>}
                    {r.job.deadline && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Due {new Date(r.job.deadline).toLocaleDateString()}</span>}
                    {(r.job.budget_min || r.job.budget_max) && (
                      <span className="font-semibold text-accent">{r.job.currency} {r.job.budget_min ?? "?"}{r.job.budget_max ? `–${r.job.budget_max}` : ""}</span>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
