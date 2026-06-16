import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, ShieldCheck } from "lucide-react";
import { requestVerification } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/creator")({
  component: CreatorEditPage,
});

const AVAILABILITY = ["available", "limited", "booked", "vacation"] as const;
const EXPERIENCE = ["entry", "intermediate", "expert"] as const;

function CreatorEditPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-creator"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;
      const [{ data: creator }, { data: categories }, { data: cats }, { data: skills }] = await Promise.all([
        supabase.from("creators").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("categories").select("*").order("sort_order"),
        (async () => {
          const { data: c } = await supabase.from("creators").select("id").eq("user_id", userId).maybeSingle();
          if (!c) return { data: [] };
          return supabase.from("creator_categories").select("category_id").eq("creator_id", c.id);
        })(),
        (async () => {
          const { data: c } = await supabase.from("creators").select("id").eq("user_id", userId).maybeSingle();
          if (!c) return { data: [] };
          return supabase.from("creator_skills").select("skill").eq("creator_id", c.id);
        })(),
      ]);
      return { creator, categories: categories ?? [], selectedCats: (cats ?? []).map((x: any) => x.category_id), skills: (skills ?? []).map((x: any) => x.skill) };
    },
  });

  const [form, setForm] = useState({ headline: "", about: "", availability: "available" as typeof AVAILABILITY[number], experience: "intermediate" as typeof EXPERIENCE[number], response_hours: 24 });
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [busy, setBusy] = useState(false);

  const verifyReq = useMutation({
    mutationFn: () => requestVerification(),
    onSuccess: () => { toast.success("Verification requested"); qc.invalidateQueries({ queryKey: ["my-creator"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  useEffect(() => {
    if (data?.creator) {
      setForm({
        headline: data.creator.headline ?? "",
        about: data.creator.about ?? "",
        availability: data.creator.availability ?? "available",
        experience: data.creator.experience ?? "intermediate",
        response_hours: data.creator.response_hours ?? 24,
      });
      setSelectedCats(data.selectedCats);
      setSkills(data.skills);
    }
  }, [data]);

  async function save() {
    if (!data?.creator) return;
    setBusy(true);
    const cid = data.creator.id;
    const { error } = await supabase.from("creators").update({
      headline: form.headline || null,
      about: form.about || null,
      availability: form.availability,
      experience: form.experience,
      response_hours: form.response_hours,
    }).eq("id", cid);
    if (error) { setBusy(false); return toast.error(error.message); }

    await supabase.from("creator_categories").delete().eq("creator_id", cid);
    if (selectedCats.length) {
      await supabase.from("creator_categories").insert(selectedCats.map((category_id) => ({ creator_id: cid, category_id })));
    }
    await supabase.from("creator_skills").delete().eq("creator_id", cid);
    if (skills.length) {
      await supabase.from("creator_skills").insert(skills.map((skill) => ({ creator_id: cid, skill })));
    }
    setBusy(false);
    toast.success("Creator profile saved");
    qc.invalidateQueries({ queryKey: ["my-creator"] });
  }

  if (!data) return <div className="text-muted-foreground">Loading…</div>;
  if (!data.creator) return <div className="rounded-xl border border-dashed border-border p-6 text-muted-foreground">Set your role to “creator” in onboarding first.</div>;

  const c = data.creator;
  const verifBlock = c.is_verified ? (
    <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">
      <ShieldCheck className="h-5 w-5 text-accent" />
      <span>You're a verified creator.</span>
    </div>
  ) : c.verification_requested_at ? (
    <div className="rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground">
      Verification requested on {new Date(c.verification_requested_at).toLocaleDateString()} — under review.
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4">
      <div className="text-sm">
        <div className="font-medium">Request verification</div>
        <div className="text-muted-foreground">Stand out with a verified badge after our team reviews your portfolio.</div>
      </div>
      <Button size="sm" variant="outline" onClick={() => verifyReq.mutate()} disabled={verifyReq.isPending}>Request</Button>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Creator profile</h1>
        <p className="text-sm text-muted-foreground">How clients discover and evaluate you.</p>
      </div>

      {verifBlock}

      <div className="space-y-1.5">
        <Label>Headline</Label>
        <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={120} placeholder="e.g. Motion designer for premium brands" />
      </div>
      <div className="space-y-1.5">
        <Label>About</Label>
        <Textarea rows={6} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} maxLength={2000} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Availability</Label>
          <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as any })}>
            {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Experience</Label>
          <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value as any })}>
            {EXPERIENCE.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Response hours</Label>
          <Input type="number" min={1} max={168} value={form.response_hours} onChange={(e) => setForm({ ...form, response_hours: parseInt(e.target.value) || 24 })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Crafts</Label>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c: any) => {
            const active = selectedCats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCats((s) => active ? s.filter((x) => x !== c.id) : [...s, c.id])}
                className={`rounded-full border px-3 py-1 text-sm transition ${active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Skills & tools</Label>
        <div className="flex gap-2">
          <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="e.g. After Effects" onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); const v = skillInput.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setSkillInput(""); }
          }} />
          <Button type="button" variant="outline" onClick={() => { const v = skillInput.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setSkillInput(""); }}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              {s}<button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={busy} className="bg-[image:var(--gradient-primary)]">{busy ? "Saving…" : "Save creator profile"}</Button>
    </div>
  );
}