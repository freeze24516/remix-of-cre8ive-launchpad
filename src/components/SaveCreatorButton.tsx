import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toggleSavedCreator, savedCreatorIds } from "@/lib/saved.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SaveCreatorButton({
  creatorId,
  size = 18,
  className,
  variant = "icon",
}: {
  creatorId: string;
  size?: number;
  className?: string;
  variant?: "icon" | "button";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: ids } = useQuery({
    queryKey: ["saved-creator-ids"],
    queryFn: () => savedCreatorIds(),
    enabled: !!user,
  });
  const saved = (ids ?? []).includes(creatorId);
  const toggleFn = useServerFn(toggleSavedCreator);
  const m = useMutation({
    mutationFn: () => toggleFn({ data: { creatorId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["saved-creator-ids"] });
      qc.invalidateQueries({ queryKey: ["saved-creators"] });
      toast.success(r.saved ? "Saved creator" : "Removed");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (!user) return null;
  return (
    <button
      type="button"
      aria-label={saved ? "Unsave creator" : "Save creator"}
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
      <Heart
        style={{ width: size, height: size }}
        className={cn(saved ? "fill-red-500 text-red-500" : "text-muted-foreground")}
      />
      {variant === "button" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
