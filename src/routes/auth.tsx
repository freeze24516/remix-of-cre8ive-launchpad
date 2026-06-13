import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const search = z.object({ mode: fallback(z.enum(["signin", "signup"]), "signin").default("signin") });

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — CRE8IVE" }, { name: "description", content: "Join the CRE8IVE creative marketplace." }] }),
  validateSearch: zodValidator(search),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName } },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="relative grid min-h-[calc(100vh-4rem)] place-items-center px-6 py-16 bg-hero">
      <div className="absolute inset-0 -z-10 bg-grid" />
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/80 p-8 shadow-[var(--shadow-card)] backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[image:var(--gradient-primary)]"><Sparkles className="h-4 w-4 text-primary-foreground" /></span>
          <span className="font-display text-lg font-bold">CRE8IVE</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? "Join thousands of creators and clients." : "Sign in to continue to CRE8IVE."}
        </p>

        <Button type="button" variant="outline" className="mt-6 w-full" onClick={googleSignIn} disabled={busy}>
          Continue with Google
        </Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={60} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] hover:opacity-95">
            {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account? " : "New to CRE8IVE? "}
          <Link to="/auth" search={{ mode: isSignup ? "signin" : "signup" }} className="font-medium text-foreground underline-offset-4 hover:underline">
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </div>
  );
}