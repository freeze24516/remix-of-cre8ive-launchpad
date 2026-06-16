import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listReports, updateReportStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

const STATUSES = ["open", "reviewing", "resolved", "dismissed", "all"] as const;

function ReportsPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("open");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => listReports({ data: { status } }),
  });
  const update = useMutation({
    mutationFn: (vars: { id: string; status: "open" | "reviewing" | "resolved" | "dismissed" }) =>
      updateReportStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Triage user-submitted reports.</p>
        </div>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No reports.</div>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border/70 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.target_type}</Badge>
                    <Badge variant="secondary" className="capitalize">{r.status}</Badge>
                  </div>
                  <div className="mt-2 font-medium">{r.reason}</div>
                  {r.details && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.details}</p>}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Target ID <code className="font-mono">{r.target_id}</code>
                    {r.reporter && <> · by @{r.reporter.username}</>}
                    {" · "}{new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: "reviewing" })}>Reviewing</Button>
                  <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: "resolved" })}>Resolve</Button>
                  <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, status: "dismissed" })}>Dismiss</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}