import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listVerificationRequests, setCreatorVerification } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  component: VerificationsPage,
});

function VerificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-verifications"], queryFn: () => listVerificationRequests() });
  const act = useMutation({
    mutationFn: (vars: { creatorId: string; verified: boolean }) => setCreatorVerification({ data: vars }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Verification requests</h1>
        <p className="text-sm text-muted-foreground">Approve verified status for trusted creators.</p>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No pending requests.</div>
      ) : (
        <div className="space-y-3">
          {data.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4">
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
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate({ creatorId: c.id, verified: false })}>Reject</Button>
                <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ creatorId: c.id, verified: true })} className="gap-1">
                  <ShieldCheck className="h-4 w-4" /> Verify
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}