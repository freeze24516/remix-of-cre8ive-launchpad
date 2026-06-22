import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Crown, Rocket, Star } from "lucide-react";
import { getMyMembership, listSubscriptionPlans } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/dashboard/membership")({
  head: () => ({ meta: [{ title: "Membership — CRE8IVE" }] }),
  component: MembershipPage,
});

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function tierIcon(tier: string) {
  if (tier === "elite") return <Crown className="h-4 w-4 text-accent" />;
  if (tier === "pro") return <Rocket className="h-4 w-4 text-accent" />;
  return <Star className="h-4 w-4 text-muted-foreground" />;
}

function MembershipPage() {
  const { data: mem, isLoading } = useQuery({ queryKey: ["my-membership"], queryFn: () => getMyMembership() });
  const { data: plans } = useQuery({ queryKey: ["subscription-plans"], queryFn: () => listSubscriptionPlans() });

  if (isLoading || !mem) return <div className="text-muted-foreground">Loading…</div>;

  const now = Date.now();
  const featuredActive = mem.creator?.featured_until && new Date(mem.creator.featured_until).getTime() > now;
  const boostActive = mem.creator?.boosted_creator && mem.creator?.boost_expiry && new Date(mem.creator.boost_expiry).getTime() > now;
  const sponsoredActive = mem.creator?.sponsored_until && new Date(mem.creator.sponsored_until).getTime() > now;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Membership</h1>
        <p className="text-sm text-muted-foreground">Your plan, perks, and billing history.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</div>
          <div className="mt-2 flex items-center gap-2">
            {tierIcon(mem.plan)}
            <span className="font-display text-2xl font-bold capitalize">{mem.plan}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Renews: {fmtDate(mem.plan_expiry)}</div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Marketplace commission</div>
          <div className="mt-2 font-display text-2xl font-bold">{Number(mem.commission_rate).toFixed(1)}%</div>
          <div className="mt-1 text-xs text-muted-foreground">Applied to paid projects.</div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Active boosts</div>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="flex items-center justify-between">
              <span>Featured</span>
              <span className={featuredActive ? "text-accent" : "text-muted-foreground"}>
                {featuredActive ? `until ${fmtDate(mem.creator!.featured_until)}` : "—"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Boosted search</span>
              <span className={boostActive ? "text-accent" : "text-muted-foreground"}>
                {boostActive ? `until ${fmtDate(mem.creator!.boost_expiry)}` : "—"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Sponsored slot</span>
              <span className={sponsoredActive ? "text-accent" : "text-muted-foreground"}>
                {sponsoredActive ? `until ${fmtDate(mem.creator!.sponsored_until)}` : "—"}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold">Plans</h2>
        <p className="text-xs text-muted-foreground">Billing launches soon — your plan stays Free until then.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(plans ?? []).map((p: any) => {
            const current = p.tier === mem.plan;
            const features: string[] = Array.isArray(p.features) ? p.features : [];
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-5 ${current ? "border-accent/60 bg-accent/5" : "border-border/70 bg-card"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-lg font-bold capitalize">
                    {tierIcon(p.tier)} {p.name}
                  </div>
                  {current && <span className="text-[10px] uppercase tracking-wide text-accent">Current</span>}
                </div>
                <div className="mt-2 text-2xl font-display font-bold">
                  {p.price_monthly_cents === 0 ? "Free" : `$${(p.price_monthly_cents / 100).toFixed(0)}/mo`}
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {features.slice(0, 5).map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <button
                  disabled
                  className="mt-4 w-full cursor-not-allowed rounded-lg border border-border/70 px-3 py-1.5 text-xs text-muted-foreground"
                  title="Billing coming soon"
                >
                  {current ? "Current plan" : "Upgrade (coming soon)"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Billing history</h2>
        {mem.history.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            No billing events yet. When payment processing launches, your invoices will appear here.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Cycle</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {mem.history.map((h: any) => (
                  <tr key={h.id} className="border-t border-border/60">
                    <td className="px-3 py-2 capitalize">{h.tier}</td>
                    <td className="px-3 py-2 capitalize">{h.status}</td>
                    <td className="px-3 py-2 capitalize">{h.billing_cycle}</td>
                    <td className="px-3 py-2">{fmtDate(h.started_at)}</td>
                    <td className="px-3 py-2">${((h.amount_cents ?? 0) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-secondary/30 p-4 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        Payment processing isn't live yet. Plans, featured placements, and sponsored slots are visible and ready — billing will be enabled in a future update.
      </div>
    </div>
  );
}
