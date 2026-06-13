import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dashboard/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-portfolio"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: c } = await supabase.from("creators").select("id").eq("user_id", u.user!.id).maybeSingle();
      if (!c) return { creatorId: null, items: [] };
      const { data: items } = await supabase.from("portfolios").select("*").eq("creator_id", c.id).order("created_at", { ascending: false });
      return { creatorId: c.id, items: items ?? [] };
    },
  });

  const [form, setForm] = useState({ title: "", description: "", project_url: "", cover_image: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadCover(file: File) {
    if (!data?.creatorId) return;
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${u.user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file);
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("portfolio").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image: pub.publicUrl }));
  }

  async function add() {
    if (!data?.creatorId || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("portfolios").insert({
      creator_id: data.creatorId,
      title: form.title,
      description: form.description || null,
      project_url: form.project_url || null,
      cover_image: form.cover_image || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Project added");
    setForm({ title: "", description: "", project_url: "", cover_image: "" });
    qc.invalidateQueries({ queryKey: ["my-portfolio"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("portfolios").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-portfolio"] });
  }

  if (!data) return <div className="text-muted-foreground">Loading…</div>;
  if (!data.creatorId) return <div className="rounded-xl border border-dashed border-border p-6 text-muted-foreground">Become a creator first to publish portfolio work.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">Showcase your best projects. Cover image strongly recommended.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Add a project</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Project URL (optional)</Label>
            <Input value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} placeholder="https://" />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-20 w-28 overflow-hidden rounded-md border border-border bg-muted">
            {form.cover_image && <img src={form.cover_image} alt="" className="h-full w-full object-cover" />}
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary">
            <Upload className="h-4 w-4" />{uploading ? "Uploading…" : "Upload cover"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
          </label>
        </div>
        <Button onClick={add} disabled={saving || !form.title.trim()} className="mt-5 bg-[image:var(--gradient-primary)]">{saving ? "Adding…" : "Add project"}</Button>
      </div>

      <div>
        <h2 className="font-medium">Your projects ({data.items.length})</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p: any) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
              {p.cover_image && <div className="aspect-[4/3] w-full overflow-hidden bg-muted"><img src={p.cover_image} alt={p.title} className="h-full w-full object-cover" /></div>}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{p.title}</h3>
                  <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}