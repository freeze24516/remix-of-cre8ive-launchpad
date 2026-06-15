import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createJob } from "@/lib/jobs.functions";
import { listCategories } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/new")({
  component: NewJob,
});

function NewJob() {
  const navigate = useNavigate();
  const { data: categories } = useSuspenseQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const createFn = useServerFn(createJob);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    budget_min: "",
    budget_max: "",
    currency: "USD",
    deadline: "",
    location: "",
    remote_ok: true,
    skills: "",
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: {
      title: form.title,
      description: form.description,
      category_id: form.category_id || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      currency: form.currency,
      deadline: form.deadline || null,
      location: form.location || null,
      remote_ok: form.remote_ok,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      status: "open",
    } }),
    onSuccess: (r: any) => { toast.success("Job posted"); navigate({ to: "/dashboard/jobs/$jobId", params: { jobId: r.id } }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to post"),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Post a job</h1>
        <p className="text-sm text-muted-foreground">Describe the brief — creators will apply directly.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={4} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={8} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required minLength={20} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="bmin">Budget min</Label>
            <Input id="bmin" type="number" min={0} value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="bmax">Budget max</Label>
            <Input id="bmax" type="number" min={0} value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={6} />
          </div>
          <div>
            <Label htmlFor="loc">Location</Label>
            <Input id="loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
          </div>
        </div>
        <div>
          <Label htmlFor="skills">Skills (comma separated)</Label>
          <Input id="skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="figma, after effects, branding" />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="remote" checked={form.remote_ok} onCheckedChange={(v) => setForm({ ...form, remote_ok: v })} />
          <Label htmlFor="remote">Remote OK</Label>
        </div>
        <Button type="submit" disabled={create.isPending} className="bg-[image:var(--gradient-primary)]">
          {create.isPending ? "Posting…" : "Post job"}
        </Button>
      </form>
    </div>
  );
}