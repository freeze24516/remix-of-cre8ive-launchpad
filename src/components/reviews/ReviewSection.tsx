import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listReviewsFor, createReview } from "@/lib/reviews.functions";
import { useAuth } from "@/hooks/use-auth";
import { RatingStars, RatingBadge } from "./RatingStars";

export function ReviewSection({
  revieweeId,
  direction = "client_to_creator",
}: {
  revieweeId: string;
  direction?: "client_to_creator" | "creator_to_client";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["reviews", revieweeId],
    queryFn: () => listReviewsFor({ data: { userId: revieweeId } }),
  });
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const createFn = useServerFn(createReview);
  const submit = useMutation({
    mutationFn: () =>
      createFn({ data: { revieweeId, rating, body: body.trim() || null, direction } }),
    onSuccess: () => {
      toast.success("Review submitted");
      setBody("");
      qc.invalidateQueries({ queryKey: ["reviews", revieweeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const showForm = !!user && user.id !== revieweeId;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <RatingBadge average={data?.summary.average ?? 0} count={data?.summary.count ?? 0} />
      </div>
      {data?.summary.completedProjects ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {data.summary.completedProjects} completed project{data.summary.completedProjects === 1 ? "" : "s"}
        </p>
      ) : null}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
          className="mt-4 rounded-xl border border-border/70 bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your rating:</span>
            <RatingStars value={rating} size={20} onChange={setRating} />
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Share your experience (optional)"
          />
          <Button type="submit" size="sm" disabled={submit.isPending} className="bg-[image:var(--gradient-primary)]">
            {submit.isPending ? "Submitting…" : "Submit review"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Reviews are only accepted after a completed project together.
          </p>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {(data?.reviews ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          data!.reviews.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                  {r.reviewer?.avatar_url && (
                    <img src={r.reviewer.avatar_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.reviewer?.display_name ?? "User"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <RatingStars value={r.rating} size={14} />
              </div>
              {r.body && <p className="mt-3 whitespace-pre-wrap text-sm">{r.body}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
