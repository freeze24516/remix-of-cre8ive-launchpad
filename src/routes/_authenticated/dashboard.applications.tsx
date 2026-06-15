import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { myApplications } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { data: apps } = useSuspenseQuery({ queryKey: ["my-apps"], queryFn: () => myApplications() });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My applications</h1>
        <p className="text-sm text-muted-foreground">Jobs you've applied to.</p>
      </div>
      {apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No applications yet.</p>
          <Link to="/jobs" className="mt-3 inline-block text-sm text-accent hover:underline">Browse jobs →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a: any) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {a.job ? (
                    <Link to="/jobs/$jobId" params={{ jobId: a.job.id }} className="font-medium hover:text-primary">{a.job.title}</Link>
                  ) : <span className="font-medium text-muted-foreground">(job removed)</span>}
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.pitch}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{a.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}