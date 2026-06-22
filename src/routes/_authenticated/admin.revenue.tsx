import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DollarSign, Users, Star, Megaphone, Rocket } from "lucide-react";
import { getRevenueOverview } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  head: () => ({ meta: [{ title: "Revenue — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminRevenuePage,
});

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1y", value: 365 },
];

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AdminRevenuePage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-revenue", days],
    queryFn: () => getRevenueOverview({ data: { days } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Revenue</h1>
          <p className="text-sm text-muted-foreground">Subscriptions, featured listings, and sponsored placements.</p>
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-border/70 text-sm">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              className={`px-3 py-1.5 transition ${days === r.value ? "bg-accent text-accent-foreground" : "hover:bg-secondary/60"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Gross (window)" value={money(data.grossCents)} Icon={DollarSign} />
            <StatCard label="Paid (window)" value={money(data.paidCents)} Icon={DollarSign} emphasis />
            <StatCard label="Active subscriptions" value={data.activeSubscriptions.toString()} Icon={Users} />
            <StatCard label="Active featured" value={data.featuredActive.toString()} Icon={Star} />
            <StatCard label="Active sponsored" value={data.sponsoredActive.toString()} Icon={Megaphone} />
            <StatCard label="Active boosts" value={data.boostActive.toString()} Icon={Rocket} />
            <StatCard label="Billing events" value={data.eventCount.toString()} Icon={DollarSign} />
            <StatCard label="Window" value={`${data.windowDays} days`} Icon={DollarSign} />
          </div>

          <section>
            <h2 className="font-display text-lg font-semibold">Revenue by source</h2>
            {Object.keys(data.byKind).length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No billing events yet. Once payment processing is enabled, every subscription, featured listing, boost, and sponsored slot will show up here.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Events</th>
                      <th className="px-3 py-2">Gross</th>
                      <th className="px-3 py-2">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.byKind).map(([kind, v]) => (
                      <tr key={kind} className="border-t border-border/60">
                        <td className="px-3 py-2 capitalize">{kind.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2">{v.count}</td>
                        <td className="px-3 py-2">{money(v.gross_cents)}</td>
                        <td className="px-3 py-2 text-accent">{money(v.paid_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.series.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold">Daily gross</h2>
              <DailyBars series={data.series} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, Icon, emphasis }: { label: string; value: string; Icon: any; emphasis?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${emphasis ? "border-accent/60" : "border-border/70"}`}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function DailyBars({ series }: { series: { day: string; cents: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.cents));
  return (
    <div className="mt-3 flex h-40 items-end gap-1 rounded-xl border border-border/70 bg-card p-3">
      {series.map((s) => (
        <div key={s.day} className="flex flex-1 flex-col items-center gap-1" title={`${s.day}: $${(s.cents / 100).toFixed(2)}`}>
          <div className="w-full rounded-t bg-accent/70" style={{ height: `${(s.cents / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}
