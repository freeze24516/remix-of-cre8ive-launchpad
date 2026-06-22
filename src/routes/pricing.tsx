import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { listSubscriptionPlans } from "@/lib/billing.functions";

const plansQuery = {
  queryKey: ["subscription-plans"],
  queryFn: () => listSubscriptionPlans(),
} as const;

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CRE8IVE" },
      { name: "description", content: "Choose a CRE8IVE membership: Free, Pro, or Elite. Boost your reach with featured placement and sponsored slots." },
      { property: "og:title", content: "CRE8IVE — Membership plans" },
      { property: "og:description", content: "Free, Pro, and Elite plans for creators on CRE8IVE." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  component: PricingPage,
  errorComponent: () => <div className="p-10 text-center text-muted-foreground">Couldn't load plans.</div>,
  notFoundComponent: () => <div className="p-10 text-center text-muted-foreground">Not found.</div>,
});

function PricingPage() {
  const { data: plans } = useSuspenseQuery(plansQuery);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3 text-accent" /> Memberships
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold md:text-5xl">Grow your creative business</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Pick the plan that fits where you are now. Upgrade anytime — billing launches soon.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p: any) => {
            const isElite = p.tier === "elite";
            const features: string[] = Array.isArray(p.features) ? p.features : [];
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-6 ${isElite ? "border-accent/60 bg-gradient-to-b from-accent/10 to-transparent" : "border-border bg-card"}`}
              >
                {p.badge_label && (
                  <div className="absolute -top-3 left-6 rounded-full border border-accent/60 bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {p.badge_label}
                  </div>
                )}
                <div className="font-display text-xl font-bold">{p.name}</div>
                {p.tagline && <div className="text-sm text-muted-foreground">{p.tagline}</div>}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">
                    {p.price_monthly_cents === 0 ? "Free" : `$${(p.price_monthly_cents / 100).toFixed(0)}`}
                  </span>
                  {p.price_monthly_cents > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                </div>
                {p.price_yearly_cents > 0 && (
                  <div className="text-xs text-muted-foreground">or ${(p.price_yearly_cents / 100).toFixed(0)}/yr</div>
                )}
                <ul className="mt-6 space-y-2 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <Link
                    to="/dashboard/membership"
                    className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                      isElite
                        ? "bg-accent text-accent-foreground hover:opacity-90"
                        : "border border-border hover:bg-secondary/60"
                    }`}
                  >
                    {p.tier === "free" ? "Get started" : "Coming soon"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Payment processing rolls out soon. Your current plan is Free — no credit card required.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
