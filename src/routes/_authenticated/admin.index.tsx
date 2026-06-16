import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => getAdminStats() });
  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  const cards = [
    { label: "Total users", value: data.users, to: "/admin/users" as const },
    { label: "Creators", value: data.creators, to: "/admin/users" as const },
    { label: "Open jobs", value: data.openJobs, to: "/jobs" as const },
    { label: "Open reports", value: data.openReports, to: "/admin/reports" as const, emphasis: data.openReports > 0 },
    { label: "Verification requests", value: data.pendingVerifications, to: "/admin/verifications" as const, emphasis: data.pendingVerifications > 0 },
    { label: "Pending portfolios", value: data.pendingPortfolios, to: "/admin/portfolios" as const, emphasis: data.pendingPortfolios > 0 },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Admin overview</h1>
        <p className="text-sm text-muted-foreground">Health of the marketplace at a glance.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className={`rounded-xl border bg-card p-5 transition hover:border-primary/60 ${c.emphasis ? "border-accent/60" : "border-border/70"}`}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
            <div className="mt-2 font-display text-3xl font-bold">{c.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}