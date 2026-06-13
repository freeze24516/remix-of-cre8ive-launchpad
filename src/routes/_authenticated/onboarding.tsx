import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — CRE8IVE" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<"client" | "creator" | null>(null);
  const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  async function commit() {
    if (!kind || !uid) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ kind }).eq("id", uid);
      if (error) throw error;
      if (kind === "creator") {
        const { error: cErr } = await supabase.from("creators").insert({ user_id: uid }).select().single();
        // Ignore unique violation if already exists.
        if (cErr && !cErr.message.toLowerCase().includes("duplicate")) throw cErr;
        navigate({ to: "/dashboard/creator" });
      } else {
        navigate({ to: "/dashboard" });
      }
      toast.success("Welcome to CRE8IVE");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl font-bold md:text-4xl">How will you use CRE8IVE?</h1>
        <p className="mt-2 text-muted-foreground">You can change this later in settings.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {([
            { id: "creator", label: "I'm a creator", desc: "Build a portfolio, get discovered and hired.", Icon: Palette },
            { id: "client", label: "I'm hiring", desc: "Browse vetted talent and start projects.", Icon: Briefcase },
          ] as const).map((o) => (
            <button
              key={o.id}
              onClick={() => setKind(o.id)}
              className={`rounded-2xl border bg-card p-6 text-left transition hover:border-primary/60 ${kind === o.id ? "border-primary shadow-[var(--shadow-glow)]" : "border-border/70"}`}
            >
              <o.Icon className="h-6 w-6 text-accent" />
              <div className="mt-4 font-semibold">{o.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{o.desc}</div>
            </button>
          ))}
        </div>
        <Button onClick={commit} disabled={!kind || busy} className="mt-8 bg-[image:var(--gradient-primary)]">
          {busy ? "Saving…" : "Continue"}
        </Button>
      </main>
    </div>
  );
}