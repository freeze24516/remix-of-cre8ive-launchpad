import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).single();
      return data;
    },
  });

  const [form, setForm] = useState({ display_name: "", username: "", bio: "", location: "", avatar_url: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setForm({
      display_name: profile.display_name ?? "",
      username: profile.username ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  async function uploadAvatar(file: File) {
    const { data: u } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${u.user!.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f) => ({ ...f, avatar_url: pub.publicUrl }));
  }

  async function save() {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name,
      username: form.username.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      bio: form.bio || null,
      location: form.location || null,
      avatar_url: form.avatar_url || null,
    }).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
  }

  if (!profile) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Account</h1>
        <p className="text-sm text-muted-foreground">Public profile basics shown across CRE8IVE.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
          {form.avatar_url && <img src={form.avatar_url} className="h-full w-full object-cover" alt="" />}
        </div>
        <label className="cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary">
          Upload avatar
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label>Username</Label>
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} maxLength={24} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Location</Label>
        <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
      </div>
      <div className="space-y-1.5">
        <Label>Bio</Label>
        <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} />
      </div>

      <Button onClick={save} disabled={busy} className="bg-[image:var(--gradient-primary)]">{busy ? "Saving…" : "Save changes"}</Button>
    </div>
  );
}