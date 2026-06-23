import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;
      const [{ data: profile }, { data: creator }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("creators").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      let portfolioCount = 0;
      if (creator) {
        const { count } = await supabase.from("portfolios").select("id", { count: "exact", head: true }).eq("creator_id", creator.id);
        portfolioCount = count ?? 0;
      }
      return { profile, creator, portfolioCount };
    },
  });

  useEffect(() => {
    if (data && !data.profile?.kind) navigate({ to: "/onboarding", replace: true });
  }, [data, navigate]);

  if (!data) return <div className="text-muted-foreground">Loading…</div>;
  const { profile, creator, portfolioCount } = data;

  if (!profile?.kind || profile.kind === null) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-2 text-xl font-semibold">Finish setting up your account</h2>
        <Button asChild className="mt-4 bg-[image:var(--gradient-primary)]"><Link to="/onboarding">Continue <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Welcome back, {profile.display_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your CRE8IVE dashboard.</p>
      </div>

      {profile.kind === "creator" && !creator && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium">Set up your creator profile</h3>
          <Button asChild className="mt-3"><Link to="/onboarding">Continue setup</Link></Button>
        </div>
      )}

      {creator && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Profile views" value={creator.view_count ?? 0} Icon={Eye} />
          <Stat label="Portfolio items" value={portfolioCount} Icon={Sparkles} />
          <Stat label="Status" value={creator.is_verified ? "Verified" : "Unverified"} Icon={ShieldCheck} />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-medium">Quick actions</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/profile">Edit account</Link></Button>
          {profile.kind === "creator" && (
            <>
              <Button asChild variant="outline"><Link to="/dashboard/creator">Edit creator profile</Link></Button>
              <Button asChild className="bg-[image:var(--gradient-primary)]"><Link to="/dashboard/portfolio">Manage portfolio</Link></Button>
            </>
          )}
          {profile.username && (
            <Button asChild variant="ghost"><Link to="/u/$username" params={{ username: profile.username }}>View public profile</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, Icon }: { label: string; value: string | number; Icon: typeof Eye }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}