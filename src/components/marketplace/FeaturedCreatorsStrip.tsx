import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { getFeaturedCreators } from "@/lib/marketplace.functions";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/VerificationBadge";

export function FeaturedCreatorsStrip({ limit = 6 }: { limit?: number }) {
  const { data } = useQuery({ queryKey: ["featured-creators", limit], queryFn: () => getFeaturedCreators({ data: { limit } }) });
  if (!data || data.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Featured
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Featured creators</h2>
        </div>
        <Link to="/browse" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline-flex md:items-center md:gap-1">
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((c: any) => (
          <Link
            key={c.id}
            to="/u/$username"
            params={{ username: c.profile.username }}
            className="group block rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                {c.profile.avatar_url && <img src={c.profile.avatar_url} className="h-full w-full object-cover" alt="" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate font-medium">
                  {c.profile.display_name}
                  <VerificationBadge level={c.verification_level} size="xs" showLabel={false} />
                </div>
                <div className="text-xs text-muted-foreground">@{c.profile.username}</div>
              </div>
            </div>
            {c.headline && <p className="mt-3 line-clamp-2 text-sm">{c.headline}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.creator_categories?.slice(0, 3).map((cc: any) => (
                <Badge key={cc.category.id} variant="secondary" className="text-[10px]">{cc.category.name}</Badge>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
