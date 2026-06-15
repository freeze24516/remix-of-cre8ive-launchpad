import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { jobApplications, setApplicationStatus } from "@/lib/jobs.functions";
import { startConversation } from "@/lib/messaging.functions";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId")({
  component: JobManage,
});

function JobManage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({ queryKey: ["job-apps", jobId], queryFn: () => jobApplications({ data: { jobId } }) });
  const setStatusFn = useServerFn(setApplicationStatus);
  const startConvFn = useServerFn(startConversation);

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: any }) => setStatusFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-apps", jobId] }); toast.success("Updated"); },
  });
  const dm = useMutation({
    mutationFn: (otherUserId: string) => startConvFn({ data: { otherUserId } }),
    onSuccess: (r) => navigate({ to: "/dashboard/messages", search: { c: r.id } }),
  });

  return (
    <div className="space-y-6">
      <Link to="/dashboard/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold">{data.job.title}</h1>
        <p className="text-sm text-muted-foreground">{data.applications.length} application{data.applications.length === 1 ? "" : "s"}</p>
      </div>
      {data.applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No applications yet.</div>
      ) : (
        <div className="space-y-3">
          {data.applications.map((a: any) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                  {a.creator?.avatar_url && <img src={a.creator.avatar_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link to="/u/$username" params={{ username: a.creator?.username ?? "" }} className="font-medium hover:text-primary">
                      {a.creator?.display_name ?? "Unknown"}
                    </Link>
                    <Badge variant="secondary" className="capitalize">{a.status}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.pitch}</p>
                  {a.quoted_rate != null && (
                    <div className="mt-2 text-sm font-medium text-accent">{a.currency} {a.quoted_rate}</div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => dm.mutate(a.creator.id)}>
                      <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
                    </Button>
                    {a.status !== "shortlisted" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "shortlisted" })}>Shortlist</Button>}
                    {a.status !== "accepted" && <Button size="sm" className="bg-[image:var(--gradient-primary)]" onClick={() => setStatus.mutate({ id: a.id, status: "accepted" })}>Accept</Button>}
                    {a.status !== "rejected" && <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: a.id, status: "rejected" })}>Decline</Button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}