import { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

export interface PortfolioMetric {
  label: string;
  value: string; // raw, e.g. "1.2M", "+342%", "₹4.5L"
}

function parseNumeric(value: string): { num: number; prefix: string; suffix: string } | null {
  const m = value.match(/^([^\d-]*)(-?[\d.,]+)([^\d]*)$/);
  if (!m) return null;
  const num = Number(m[2].replace(/,/g, ""));
  if (Number.isNaN(num)) return null;
  return { num, prefix: m[1] ?? "", suffix: m[3] ?? "" };
}

export function MetricCard({ metric, index = 0 }: { metric: PortfolioMetric; index?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const parsed = parseNumeric(metric.value);
  const [display, setDisplay] = useState(parsed ? `${parsed.prefix}0${parsed.suffix}` : metric.value);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShown(true)),
      { threshold: 0.3 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!shown || !parsed) return;
    const duration = 1400;
    const start = performance.now() + index * 120;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - start) / duration));
      const eased = 1 - Math.pow(1 - p, 3);
      const current = parsed.num * eased;
      const formatted =
        Math.abs(parsed.num) >= 1000
          ? Math.round(current).toLocaleString()
          : current.toFixed(parsed.num % 1 === 0 ? 0 : 1);
      setDisplay(`${parsed.prefix}${formatted}${parsed.suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, parsed, index]);

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 shadow-[var(--shadow-card)] backdrop-blur transition hover:-translate-y-0.5 hover:border-accent/40"
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[image:var(--gradient-primary)] opacity-10 blur-2xl transition group-hover:opacity-20" />
      <TrendingUp className="h-4 w-4 text-accent" />
      <div className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">{display}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{metric.label}</div>
    </div>
  );
}

export function MetricGrid({ metrics }: { metrics: PortfolioMetric[] }) {
  if (!metrics?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m, i) => (
        <MetricCard key={m.label + i} metric={m} index={i} />
      ))}
    </div>
  );
}
