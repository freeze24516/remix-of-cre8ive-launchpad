import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/jobs")({
  component: () => {
    const { pathname } = useLocation();
    const isIndex = pathname === "/dashboard/jobs";
    return isIndex ? <JobsIndex /> : <Outlet />;
  },
});

import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { myJobs, updateJobStatus } from "@/lib/jobs.functions";

function JobsIndex() {
  const qc = useQueryClient();
  const { data: jobs } = useSuspenseQuery({ queryKey: ["my-jobs"], queryFn: () => myJobs() });
  const updateStatusFn = useServerFn(updateJobStatus);
  const update = useMutation({
    mutationFn: (v: { id: string; status: "open" | "closed" | "filled" | "draft" | "in_review" }) => updateStatusFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-jobs"] }); toast.success("Updated"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My jobs</h1>
          <p className="text-sm text-muted-foreground">Briefs you've posted.</p>
        </div>
        <Button asChild className="bg-[image:var(--gradient-primary)]"><Link to="/dashboard/jobs/new"><Plus className="mr-1 h-4 w-4" />Post a job</Link></Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 font-medium">No jobs yet</p>
          <Button asChild className="mt-4 bg-[image:var(--gradient-primary)]"><Link to="/dashboard/jobs/new">Post your first job</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to="/dashboard/jobs/$jobId" params={{ jobId: j.id }} className="font-medium hover:text-primary">{j.title}</Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="capitalize">{j.status}</Badge>
                    <span>{new Date(j.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {j.status !== "closed" && (
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: j.id, status: "closed" })}>Close</Button>
                  )}
                  {j.status === "closed" && (
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: j.id, status: "open" })}>Reopen</Button>
                  )}
                  <Button asChild size="sm"><Link to="/dashboard/jobs/$jobId" params={{ jobId: j.id }}>Manage</Link></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}