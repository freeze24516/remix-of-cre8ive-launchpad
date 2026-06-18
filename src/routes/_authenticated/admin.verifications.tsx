import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listVerificationRequests, setCreatorVerification } from "@/lib/admin.functions";
import { setCreatorVerificationLevel, setCreatorFeatured, setCreatorSpotlight, browseCreators } from "@/lib/marketplace.functions";
import { VerificationBadge } from "@/components/VerificationBadge";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  component: VerificationsPage,
});

function VerificationsPage() {
  const qc = useQueryClient();
  const { data: requests, isLoading } = useQuery({ queryKey: ["admin-verifications"], queryFn: () => listVerificationRequests() });
  const { data: all } = useQuery({
    queryKey: ["admin-all-creators"],
    queryFn: () => browseCreators({ data: { page: 1, sort: "featured" } }),
  });

  const inval = () => {
    qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    qc.invalidateQueries({ queryKey: ["admin-all-creators"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["featured-creators"] });
    qc.invalidateQueries({ queryKey: ["spotlight"] });
    qc.invalidateQueries({ queryKey: ["browse"] });
  };

  const reject = useMutation({
    mutationFn: (creatorId: string) => setCreatorVerification({ data: { creatorId, verified: false } }),
    onSuccess: () => { toast.success("Rejected"); inval(); },
    onError: (e: any) => toast.error(e.message),
  });
  const setLevel = useMutation({
    mutationFn: (vars: { creatorId: string; level: number }) => setCreatorVerificationLevel({ data: vars }),
    onSuccess: () => { toast.success("Updated"); inval(); },
    onError: (e: any) => toast.error(e.message),
  });
  const featured = useMutation({
    mutationFn: (vars: { creatorId: string; featured: boolean }) => setCreatorFeatured({ data: vars }),
    onSuccess: () => { toast.success("Updated"); inval(); },
    onError: (e: any) => toast.error(e.message),
  });
  const spotlight = useMutation({
    mutationFn: (vars: { creatorId: string; spotlight: boolean; untilDays?: number }) => setCreatorSpotlight({ data: vars }),
    onSuccess: () => { toast.success("Updated"); inval(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Verification requests</h1>
          <p className="text-sm text-muted-foreground">Promote trusted creators through three tiers.</p>
        </div>
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !requests || requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No pending requests.</div>
        ) : (
          <div className="space-y-3">
            {requests.map((c: any) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                    {c.profile?.avatar_url ? <img src={c.profile.avatar_url} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <Link to="/u/$username" params={{ username: c.profile.username }} className="font-medium hover:underline">
                      {c.profile.display_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">@{c.profile.username} · requested {new Date(c.verification_requested_at).toLocaleDateString()}</div>
                    {c.headline && <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">{c.headline}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => reject.mutate(c.id)}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => setLevel.mutate({ creatorId: c.id, level: 1 })}>Verify L1</Button>
                  <Button size="sm" variant="outline" onClick={() => setLevel.mutate({ creatorId: c.id, level: 2 })}>Pro L2</Button>
                  <Button size="sm" onClick={() => setLevel.mutate({ creatorId: c.id, level: 3 })}>Elite L3</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold">All creators</h2>
          <p className="text-sm text-muted-foreground">Adjust verification level, featured status and spotlight.</p>
        </div>
        <div className="space-y-2">
          {(all?.creators ?? []).map((c: any) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                  {c.profile.avatar_url ? <img src={c.profile.avatar_url} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <Link to="/u/$username" params={{ username: c.profile.username }} className="font-medium hover:underline">{c.profile.display_name}</Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    @{c.profile.username}
                    <VerificationBadge level={c.verification_level} size="xs" />
                    {c.is_featured && <Badge variant="outline" className="border-accent/60 text-accent text-[10px]">Featured</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={c.verification_level ?? 0}
                  onChange={(e) => setLevel.mutate({ creatorId: c.id, level: parseInt(e.target.value) })}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                >
                  <option value={0}>L0 — None</option>
                  <option value={1}>L1 — Verified</option>
                  <option value={2}>L2 — Pro</option>
                  <option value={3}>L3 — Elite</option>
                </select>
                <Button size="sm" variant={c.is_featured ? "default" : "outline"} onClick={() => featured.mutate({ creatorId: c.id, featured: !c.is_featured })} className="gap-1">
                  <Star className="h-3 w-3" /> {c.is_featured ? "Featured" : "Feature"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => spotlight.mutate({ creatorId: c.id, spotlight: true, untilDays: 7 })} className="gap-1">
                  <Sparkles className="h-3 w-3" /> Spotlight 7d
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
