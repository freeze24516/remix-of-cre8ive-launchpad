import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listSavedCreators } from "@/lib/saved.functions";
import { SaveCreatorButton } from "@/components/SaveCreatorButton";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/saved-creators")({
  head: () => ({ meta: [{ title: "Saved creators — CRE8IVE" }] }),
  component: SavedCreatorsPage,
});

function SavedCreatorsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["saved-creators"],
    queryFn: () => listSavedCreators(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Saved creators</h1>
        <p className="mt-1 text-sm text-muted-foreground">Talent you've bookmarked for later.</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No saved creators yet</p>
          <p className="text-sm text-muted-foreground">
            Tap the heart on any creator card to save them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c: any) => (
            <div key={c.id} className="relative rounded-2xl border border-border/70 bg-card p-5">
              <SaveCreatorButton creatorId={c.id} className="absolute right-3 top-3" />
              <Link
                to="/u/$username"
                params={{ username: c.profile?.username ?? "" }}
                className="block"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                    {c.profile?.avatar_url && (
                      <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{c.profile?.display_name}</span>
                      {c.is_verified && <ShieldCheck className="h-4 w-4 text-accent" />}
                    </div>
                    <div className="text-xs text-muted-foreground">@{c.profile?.username}</div>
                  </div>
                </div>
                {c.headline && <p className="mt-3 line-clamp-2 text-sm">{c.headline}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.creator_categories?.slice(0, 3).map((cc: any) => (
                    <Badge key={cc.category.id} variant="secondary" className="text-[10px]">
                      {cc.category.name}
                    </Badge>
                  ))}
                </div>
                {c.profile?.location && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {c.profile.location}
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
