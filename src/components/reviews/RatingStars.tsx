import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = 14,
  className,
  onChange,
}: {
  value: number;
  size?: number;
  className?: string;
  onChange?: (v: number) => void;
}) {
  const interactive = !!onChange;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(i)}
            className={cn(
              "rounded transition",
              interactive && "hover:scale-110 cursor-pointer",
              !interactive && "cursor-default",
            )}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(filled ? "fill-accent text-accent" : "text-muted-foreground/40")}
            />
          </button>
        );
      })}
    </div>
  );
}

export function RatingBadge({ average, count }: { average: number; count: number }) {
  if (!count) return <span className="text-xs text-muted-foreground">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <RatingStars value={average} size={12} />
      <span className="font-medium text-foreground">{average.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}
