import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, FolderKanban, Mail, Briefcase, Send } from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getMyAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CRE8IVE" }] }),
  component: AnalyticsPage,
});

const KIND_META = {
  profile_view: { label: "Profile views", Icon: Eye, color: "hsl(var(--primary))" },
  portfolio_view: { label: "Portfolio views", Icon: FolderKanban, color: "hsl(var(--accent))" },
  contact_request: { label: "Contact requests", Icon: Mail, color: "#38bdf8" },
  hire_request: { label: "Hire requests", Icon: Briefcase, color: "#a855f7" },
  job_application: { label: "Applications sent", Icon: Send, color: "#22c55e" },
} as const;

type Kind = keyof typeof KIND_META;
const KINDS = Object.keys(KIND_META) as Kind[];

function pct(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics", "me"], queryFn: () => getMyAnalytics() });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last 30 days of activity on your profile.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {KINDS.map((k) => {
          const meta = KIND_META[k];
          const total = (data.totals as any)[k] as number;
          const w = pct(data.weekly.this[k] ?? 0, data.weekly.prev[k] ?? 0);
          const m = pct(data.monthly.this[k] ?? 0, data.monthly.prev[k] ?? 0);
          return (
            <div key={k} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs uppercase tracking-wider">{meta.label}</span>
                <meta.Icon className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{total}</div>
              <div className="mt-2 flex gap-3 text-[11px]">
                <span className={w >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {w >= 0 ? "+" : ""}{w}% wk
                </span>
                <span className={m >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {m >= 0 ? "+" : ""}{m}% mo
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Daily activity (last 30 days)</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {KINDS.map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={KIND_META[k].label}
                  stroke={KIND_META[k].color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
