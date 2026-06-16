import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Briefcase, Globe2, MapPin, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getJob, applyToJob } from "@/lib/jobs.functions";
import { startConversation } from "@/lib/messaging.functions";
import { useAuth } from "@/hooks/use-auth";
import { ReportDialog } from "@/components/report-dialog";

export const Route = createFileRoute("/jobs/$jobId")({
  loader: async ({ context, params }) => {
    const job = await context.queryClient.ensureQueryData({ queryKey: ["job", params.jobId], queryFn: () => getJob({ data: { id: params.jobId } }) });
    if (!job) throw notFound();
    return job;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — CRE8IVE` : "Job — CRE8IVE";
    return { meta: [{ title }, { name: "description", content: (loaderData?.description ?? "").slice(0, 160) }] };
  },
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Job not found.</div>,
  component: JobDetail,
});

function JobDetail() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job } = useSuspenseQuery({ queryKey: ["job", params.jobId], queryFn: () => getJob({ data: { id: params.jobId } }) });
  if (!job) return null;

  const [pitch, setPitch] = useState("");
  const [rate, setRate] = useState<string>("");
  const applyFn = useServerFn(applyToJob);
  const startConvFn = useServerFn(startConversation);

  const apply = useMutation({
    mutationFn: () => applyFn({ data: { job_id: job.id, pitch, quoted_rate: rate ? Number(rate) : null, currency: job.currency } }),
    onSuccess: () => { toast.success("Application sent"); setPitch(""); setRate(""); },
    onError: (e: any) => toast.error(e.message ?? "Failed to apply"),
  });

  const dm = useMutation({
    mutationFn: () => startConvFn({ data: { otherUserId: job.client_id } }),
    onSuccess: (r) => navigate({ to: "/dashboard/messages", search: { c: r.id } }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All jobs
        </Link>
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">{job.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {job.category && <Badge variant="secondary">{job.category.name}</Badge>}
                {job.remote_ok && <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />Remote OK</span>}
                {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                {job.deadline && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Due {new Date(job.deadline).toLocaleDateString()}</span>}
              </div>
            </div>
            {(job.budget_min || job.budget_max) && (
              <div className="text-right text-lg font-semibold text-accent">
                {job.currency} {job.budget_min ?? "?"}{job.budget_max ? `–${job.budget_max}` : ""}
              </div>
            )}
          </div>
          <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{job.description}</p>
          {job.skills?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {job.skills.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}
            </div>
          )}

          <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
              {job.client?.avatar_url && <img src={job.client.avatar_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{job.client?.display_name}</div>
              <div className="text-xs text-muted-foreground">Posted {new Date(job.created_at).toLocaleDateString()}</div>
            </div>
            {user && user.id !== job.client_id && (
              <Button variant="outline" size="sm" onClick={() => dm.mutate()} disabled={dm.isPending}>Message client</Button>
            )}
            {user && user.id !== job.client_id && (
              <ReportDialog targetType="job" targetId={job.id} />
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-8">
          <h2 className="font-display text-xl font-semibold">Apply to this job</h2>
          {!user ? (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p>Sign in to apply.</p>
              <Button asChild className="mt-3 bg-[image:var(--gradient-primary)]"><Link to="/auth" search={{ mode: "signup" }}>Join CRE8IVE</Link></Button>
            </div>
          ) : user.id === job.client_id ? (
            <p className="mt-3 text-sm text-muted-foreground">This is your own job.</p>
          ) : job.status !== "open" ? (
            <p className="mt-3 text-sm text-muted-foreground">This job is no longer accepting applications.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); apply.mutate(); }} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="pitch">Your pitch</Label>
                <Textarea id="pitch" value={pitch} onChange={(e) => setPitch(e.target.value)} required minLength={20} rows={6} placeholder="Why are you the right creator for this project?" />
              </div>
              <div>
                <Label htmlFor="rate">Quoted rate ({job.currency}) — optional</Label>
                <Input id="rate" type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <Button type="submit" disabled={apply.isPending || pitch.length < 20} className="bg-[image:var(--gradient-primary)]">
                {apply.isPending ? "Sending…" : "Send application"}
              </Button>
            </form>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}