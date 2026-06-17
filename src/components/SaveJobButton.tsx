import { Bookmark } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toggleSavedJob, savedJobIds } from "@/lib/saved.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SaveJobButton({
  jobId,
  size = 18,
  className,
  variant = "icon",
}: {
  jobId: string;
  size?: number;
  className?: string;
  variant?: "icon" | "button";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: ids } = useQuery({
    queryKey: ["saved-job-ids"],
    queryFn: () => savedJobIds(),
    enabled: !!user,
  });
  const saved = (ids ?? []).includes(jobId);
  const toggleFn = useServerFn(toggleSavedJob);
  const m = useMutation({
    mutationFn: () => toggleFn({ data: { jobId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["saved-job-ids"] });
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      toast.success(r.saved ? "Job bookmarked" : "Removed");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (!user) return null;
  return (
    <button
      type="button"
      aria-label={saved ? "Remove bookmark" : "Bookmark job"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        m.mutate();
      }}
      disabled={m.isPending}
      className={cn(
        variant === "icon"
          ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur transition hover:bg-card border border-border/70"
          : "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-secondary",
        className,
      )}
    >
      <Bookmark
        style={{ width: size, height: size }}
        className={cn(saved ? "fill-accent text-accent" : "text-muted-foreground")}
      />
      {variant === "button" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
