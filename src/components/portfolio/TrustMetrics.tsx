import { Clock, Award, Repeat, CheckCircle2, BriefcaseBusiness } from "lucide-react";

export interface TrustMetricsData {
  responseHours?: number | null;
  hireSuccessRate?: number | null; // 0-100
  repeatClientRate?: number | null; // 0-100
  completionRate?: number | null; // 0-100
  yearsExperience?: number | null;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
      <Icon className="h-4 w-4 text-accent" />
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export function TrustMetrics({ data }: { data: TrustMetricsData }) {
  const items: { icon: typeof Clock; label: string; value: string }[] = [];
  if (data.responseHours != null) items.push({ icon: Clock, label: "Response time", value: `~${data.responseHours}h` });
  if (data.hireSuccessRate != null)
    items.push({ icon: Award, label: "Hire success", value: `${Math.round(data.hireSuccessRate)}%` });
  if (data.repeatClientRate != null)
    items.push({ icon: Repeat, label: "Repeat clients", value: `${Math.round(data.repeatClientRate)}%` });
  if (data.completionRate != null)
    items.push({ icon: CheckCircle2, label: "Completion rate", value: `${Math.round(data.completionRate)}%` });
  if (data.yearsExperience != null)
    items.push({ icon: BriefcaseBusiness, label: "Experience", value: `${data.yearsExperience}+ yrs` });

  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <Stat key={it.label} {...it} />
      ))}
    </div>
  );
}
