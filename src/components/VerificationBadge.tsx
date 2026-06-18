import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerificationLevel = 0 | 1 | 2 | 3;

const META: Record<Exclude<VerificationLevel, 0>, { label: string; ticks: string; cls: string }> = {
  1: { label: "Verified", ticks: "✓", cls: "border-accent/50 text-accent bg-accent/5" },
  2: { label: "Pro Verified", ticks: "✓✓", cls: "border-primary/50 text-primary bg-primary/10" },
  3: { label: "Elite Creator", ticks: "✓✓✓", cls: "border-amber-400/60 text-amber-300 bg-amber-400/10" },
};

export function VerificationBadge({
  level,
  size = "sm",
  showLabel = true,
  className,
}: {
  level?: number | null;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const lvl = (level ?? 0) as VerificationLevel;
  if (!lvl || lvl < 1) return null;
  const meta = META[lvl as 1 | 2 | 3];
  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
  } as const;
  return (
    <span
      title={meta.label}
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizes[size],
        meta.cls,
        className,
      )}
    >
      <ShieldCheck className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
      {showLabel ? meta.label : meta.ticks}
    </span>
  );
}
