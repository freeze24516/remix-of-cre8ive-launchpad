import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, CheckCircle2, LayoutGrid } from "lucide-react";
import { getMarketplaceStats } from "@/lib/marketplace.functions";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export function MarketplaceStats() {
  const { data } = useQuery({ queryKey: ["marketplace-stats"], queryFn: () => getMarketplaceStats() });
  const stats = [
    { Icon: Users, label: "Creators", value: data?.creators ?? 0 },
    { Icon: Briefcase, label: "Projects posted", value: data?.projects ?? 0 },
    { Icon: CheckCircle2, label: "Hires made", value: data?.hires ?? 0 },
    { Icon: LayoutGrid, label: "Categories", value: data?.categories ?? 0 },
  ];
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4 md:py-16">
        {stats.map(({ Icon, label, value }) => (
          <div key={label} className="text-center md:text-left">
            <Icon className="mx-auto h-5 w-5 text-accent md:mx-0" />
            <div className="mt-3 font-display text-3xl font-bold md:text-4xl">
              <AnimatedCounter value={value} />
              {value >= 100 ? "+" : ""}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
