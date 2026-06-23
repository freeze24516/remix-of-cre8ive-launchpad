import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonListProps {
  count?: number;
  className?: string;
  itemClassName?: string;
}

/** Generic skeleton list to standardize loading placeholders across the app. */
export function SkeletonList({ count = 6, className, itemClassName }: SkeletonListProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("h-20 w-full rounded-xl", itemClassName)} />
      ))}
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

export function SkeletonCardGrid({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
      <span className="sr-only">Loading content…</span>
    </div>
  );
}
