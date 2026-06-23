import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Reusable empty state for lists, search results, and dashboards.
 * Use whenever a query returns zero results so users aren't met with a blank screen.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-3 text-muted-foreground" aria-hidden>{icon}</div> : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
