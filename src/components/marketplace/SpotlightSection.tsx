import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight, MapPin } from "lucide-react";
import { getSpotlightCreator } from "@/lib/marketplace.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/VerificationBadge";

export function SpotlightSection() {
  const { data } = useQuery({ queryKey: ["spotlight"], queryFn: () => getSpotlightCreator() });
  if (!data) return null;
  const c: any = data;
  return (
    <section className="border-y border-border/60 bg-gradient-to-b from-card/30 to-transparent">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Creator of the week
        </div>
        <div className="grid items-stretch gap-6 rounded-3xl border border-border/70 bg-card/60 p-6 shadow-[var(--shadow-card)] md:grid-cols-[1.1fr,1fr] md:p-10">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-muted">
                  {c.profile.avatar_url && <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-2xl font-bold">{c.profile.display_name}</h3>
                    <VerificationBadge level={c.verification_level} size="xs" showLabel={false} />
                  </div>
                  <div className="text-sm text-muted-foreground">@{c.profile.username}</div>
                </div>
              </div>
              {c.headline && <p className="mt-5 text-lg leading-snug">{c.headline}</p>}
              {c.about && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{c.about}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {c.profile.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.profile.location}</span>}
                {c.creator_categories?.slice(0, 3).map((cc: any) => (
                  <Badge key={cc.category.id} variant="secondary" className="text-[10px]">{cc.category.name}</Badge>
                ))}
              </div>
            </div>
            <Button asChild className="self-start bg-[image:var(--gradient-primary)]">
              <Link to="/u/$username" params={{ username: c.profile.username }}>
                View profile <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {c.portfolios.slice(0, 4).map((p: any) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border/70 bg-muted">
                {p.cover_image && <img src={p.cover_image} alt={p.title} className="aspect-square h-full w-full object-cover transition hover:scale-[1.03]" />}
              </div>
            ))}
            {c.portfolios.length === 0 && (
              <div className="col-span-2 grid aspect-video place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                Portfolio coming soon
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
