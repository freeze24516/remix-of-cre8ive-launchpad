import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listPendingPortfolios, setPortfolioApproval, setPortfolioFeatured } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/portfolios")({
  component: PortfoliosPage,
});

function PortfoliosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-pending-portfolios"], queryFn: () => listPendingPortfolios() });
  const approve = useMutation({
    mutationFn: (vars: { id: string; approved: boolean }) => setPortfolioApproval({ data: vars }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-pending-portfolios"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const feature = useMutation({
    mutationFn: (vars: { id: string; featured: boolean }) => setPortfolioFeatured({ data: vars }),
    onSuccess: () => toast.success("Featured updated"),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pending portfolios</h1>
        <p className="text-sm text-muted-foreground">Approve new portfolio uploads.</p>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">Nothing pending.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((p: any) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border/70 bg-card">
              {p.cover_image && (
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img src={p.cover_image} alt={p.title} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="space-y-3 p-4">
                <div>
                  <div className="font-medium">{p.title}</div>
                  {p.creator?.profile && (
                    <Link to="/u/$username" params={{ username: p.creator.profile.username }} className="text-xs text-muted-foreground hover:underline">
                      @{p.creator.profile.username}
                    </Link>
                  )}
                </div>
                {p.description && <p className="line-clamp-3 text-sm text-muted-foreground">{p.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => approve.mutate({ id: p.id, approved: true })} disabled={approve.isPending}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => approve.mutate({ id: p.id, approved: false })} disabled={approve.isPending}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => feature.mutate({ id: p.id, featured: true })} disabled={feature.isPending}>Feature</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}