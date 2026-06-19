import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload, ChevronDown, Plus, X, Image as ImageIcon, Video as VideoIcon, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard/portfolio")({
  component: PortfolioPage,
});

interface Metric { label: string; value: string }
interface BAItem { before: string; after: string; label?: string }
interface CaseStudy {
  overview?: string;
  challenge?: string;
  process?: string;
  solution?: string;
  results?: string;
  metrics?: Metric[];
  videos?: string[];
  gallery?: string[];
  before_after?: BAItem[];
}

const EMPTY_CS: CaseStudy = { metrics: [], videos: [], gallery: [], before_after: [] };

interface FormState {
  title: string;
  description: string;
  project_url: string;
  cover_image: string;
  client_name: string;
  industry: string;
  timeline: string;
  team_size: string;
  services: string;
  software: string;
  case_study: CaseStudy;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  project_url: "",
  cover_image: "",
  client_name: "",
  industry: "",
  timeline: "",
  team_size: "",
  services: "",
  software: "",
  case_study: { ...EMPTY_CS },
};

function PortfolioPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-portfolio"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: c } = await supabase.from("creators").select("id").eq("user_id", u.user!.id).maybeSingle();
      if (!c) return { creatorId: null, items: [] };
      const { data: items } = await supabase
        .from("portfolios")
        .select("*")
        .eq("creator_id", c.id)
        .order("created_at", { ascending: false });
      return { creatorId: c.id, items: items ?? [] };
    },
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadImage(file: File): Promise<string | null> {
    const { data: u } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${u.user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file);
    if (error) {
      toast.error(error.message);
      return null;
    }
    const { data: pub } = supabase.storage.from("portfolio").getPublicUrl(path);
    return pub.publicUrl;
  }

  async function uploadCover(file: File) {
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setForm((f) => ({ ...f, cover_image: url }));
  }

  async function uploadGallery(files: FileList) {
    setUploading(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const u = await uploadImage(f);
      if (u) urls.push(u);
    }
    setUploading(false);
    setForm((f) => ({
      ...f,
      case_study: { ...f.case_study, gallery: [...(f.case_study.gallery ?? []), ...urls] },
    }));
  }

  async function uploadBA(idx: number, side: "before" | "after", file: File) {
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (!url) return;
    setForm((f) => {
      const ba = [...(f.case_study.before_after ?? [])];
      ba[idx] = { ...ba[idx], [side]: url };
      return { ...f, case_study: { ...f.case_study, before_after: ba } };
    });
  }

  async function add() {
    if (!data?.creatorId || !form.title.trim()) return;
    setSaving(true);
    const services = form.services.split(",").map((s) => s.trim()).filter(Boolean);
    const software = form.software.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("portfolios").insert({
      creator_id: data.creatorId,
      title: form.title,
      description: form.description || null,
      project_url: form.project_url || null,
      cover_image: form.cover_image || null,
      client_name: form.client_name || null,
      industry: form.industry || null,
      timeline: form.timeline || null,
      team_size: form.team_size || null,
      services,
      software,
      case_study: form.case_study,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Project published");
    setForm(EMPTY_FORM);
    setShowAdvanced(false);
    qc.invalidateQueries({ queryKey: ["my-portfolio"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("portfolios").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-portfolio"] });
  }

  // case study mutators
  const cs = form.case_study;
  const setCS = (patch: Partial<CaseStudy>) => setForm((f) => ({ ...f, case_study: { ...f.case_study, ...patch } }));

  if (!data) return <div className="text-muted-foreground">Loading…</div>;
  if (!data.creatorId)
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-muted-foreground">
        Become a creator first to publish portfolio work.
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Premium case-study format. Add metrics, videos, before/after and a gallery to stand out.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Add a project</h2>

        {/* Basics */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Project title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
          </Field>
          <Field label="Client name">
            <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Fintech, D2C, SaaS" />
          </Field>
          <Field label="Timeline">
            <Input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder="e.g. 6 weeks" />
          </Field>
          <Field label="Team size">
            <Input value={form.team_size} onChange={(e) => setForm({ ...form, team_size: e.target.value })} placeholder="e.g. Solo / 3 / 5+" />
          </Field>
          <Field label="Project URL (optional)">
            <Input value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="Services provided">
            <Input value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Branding, Web Design, Motion (comma-separated)" />
          </Field>
          <Field label="Tools used">
            <Input value={form.software} onChange={(e) => setForm({ ...form, software: e.target.value })} placeholder="Figma, After Effects, Webflow (comma-separated)" />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Short description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="h-20 w-28 overflow-hidden rounded-md border border-border bg-muted">
            {form.cover_image && <img src={form.cover_image} alt="" className="h-full w-full object-cover" />}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload cover"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
            />
          </label>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <ChevronDown className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`} />
          {showAdvanced ? "Hide" : "Add"} case-study sections
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-6 border-t border-border pt-6">
            {/* Sections */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Overview">
                <Textarea rows={4} value={cs.overview ?? ""} onChange={(e) => setCS({ overview: e.target.value })} />
              </Field>
              <Field label="The Challenge">
                <Textarea rows={4} value={cs.challenge ?? ""} onChange={(e) => setCS({ challenge: e.target.value })} />
              </Field>
              <Field label="Process">
                <Textarea rows={4} value={cs.process ?? ""} onChange={(e) => setCS({ process: e.target.value })} />
              </Field>
              <Field label="Solution">
                <Textarea rows={4} value={cs.solution ?? ""} onChange={(e) => setCS({ solution: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Results">
                  <Textarea rows={3} value={cs.results ?? ""} onChange={(e) => setCS({ results: e.target.value })} />
                </Field>
              </div>
            </div>

            {/* Metrics */}
            <Subsection title="Impact metrics" hint="Animated counters on the case-study page.">
              <div className="space-y-2">
                {(cs.metrics ?? []).map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                    <Input
                      placeholder="Label (e.g. Views)"
                      value={m.label}
                      onChange={(e) => {
                        const arr = [...(cs.metrics ?? [])];
                        arr[i] = { ...arr[i], label: e.target.value };
                        setCS({ metrics: arr });
                      }}
                    />
                    <Input
                      placeholder="Value (e.g. 1.2M, +342%)"
                      value={m.value}
                      onChange={(e) => {
                        const arr = [...(cs.metrics ?? [])];
                        arr[i] = { ...arr[i], value: e.target.value };
                        setCS({ metrics: arr });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCS({ metrics: (cs.metrics ?? []).filter((_, j) => j !== i) })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCS({ metrics: [...(cs.metrics ?? []), { label: "", value: "" }] })}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add metric
                </Button>
              </div>
            </Subsection>

            {/* Videos */}
            <Subsection
              title="Videos"
              icon={VideoIcon}
              hint="Paste YouTube, Vimeo or Loom URLs — they'll render as responsive players."
            >
              <div className="space-y-2">
                {(cs.videos ?? []).map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="https://youtu.be/..."
                      value={v}
                      onChange={(e) => {
                        const arr = [...(cs.videos ?? [])];
                        arr[i] = e.target.value;
                        setCS({ videos: arr });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCS({ videos: (cs.videos ?? []).filter((_, j) => j !== i) })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCS({ videos: [...(cs.videos ?? []), ""] })}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add video URL
                </Button>
              </div>
            </Subsection>

            {/* Before / After */}
            <Subsection title="Before / After" icon={GitCompareArrows} hint="Comparison sliders for transformations.">
              <div className="space-y-3">
                {(cs.before_after ?? []).map((b, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <ImagePicker
                        label="Before"
                        url={b.before}
                        onPick={(file) => uploadBA(i, "before", file)}
                      />
                      <ImagePicker label="After" url={b.after} onPick={(file) => uploadBA(i, "after", file)} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Caption (optional)"
                        value={b.label ?? ""}
                        onChange={(e) => {
                          const arr = [...(cs.before_after ?? [])];
                          arr[i] = { ...arr[i], label: e.target.value };
                          setCS({ before_after: arr });
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCS({ before_after: (cs.before_after ?? []).filter((_, j) => j !== i) })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCS({ before_after: [...(cs.before_after ?? []), { before: "", after: "" }] })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Add before/after
                </Button>
              </div>
            </Subsection>

            {/* Gallery */}
            <Subsection title="Gallery" icon={ImageIcon} hint="Masonry layout with lightbox & keyboard navigation.">
              <div className="flex flex-wrap gap-2">
                {(cs.gallery ?? []).map((src, i) => (
                  <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCS({ gallery: (cs.gallery ?? []).filter((_, j) => j !== i) })}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-md border border-dashed border-border text-muted-foreground hover:bg-secondary">
                  <Plus className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && uploadGallery(e.target.files)}
                  />
                </label>
              </div>
            </Subsection>
          </div>
        )}

        <Button
          onClick={add}
          disabled={saving || !form.title.trim()}
          className="mt-6 bg-[image:var(--gradient-primary)]"
        >
          {saving ? "Publishing…" : "Publish project"}
        </Button>
      </div>

      <div>
        <h2 className="font-medium">Your projects ({data.items.length})</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p: any) => {
            const cs = (p.case_study as any) ?? {};
            const hasCaseStudy =
              cs.overview || cs.challenge || cs.process || cs.solution || cs.results ||
              (cs.metrics?.length ?? 0) + (cs.videos?.length ?? 0) + (cs.gallery?.length ?? 0) > 0;
            return (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {p.cover_image && (
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img src={p.cover_image} alt={p.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{p.title}</h3>
                    <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {p.client_name && <div className="mt-0.5 text-xs text-muted-foreground">for {p.client_name}</div>}
                  {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  <div className="mt-2 flex items-center gap-1.5">
                    {hasCaseStudy ? (
                      <Badge variant="secondary" className="text-[10px]">Case study</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Basic</Badge>
                    )}
                    {p.industry && <Badge variant="outline" className="text-[10px]">{p.industry}</Badge>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Subsection({
  title,
  hint,
  icon: Icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: typeof Plus;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-accent" />}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ImagePicker({ label, url, onPick }: { label: string; url?: string; onPick: (f: File) => void }) {
  return (
    <label className="block cursor-pointer">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 grid aspect-video w-full place-items-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">Click to upload</span>
        )}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  );
}
