import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShieldCheck, MapPin, Clock, Sparkles, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCreatorByUsername } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["creator", params.username],
      queryFn: () => getCreatorByUsername({ data: { username: params.username } }),
    });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const p = loaderData?.profile;
    const title = p ? `${p.display_name} (@${p.username}) — CRE8IVE` : "Creator — CRE8IVE";
    const desc = loaderData?.creator?.headline || p?.bio || "Creative talent on CRE8IVE.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(p?.avatar_url ? [{ property: "og:image", content: p.avatar_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center text-center">
      <div>
        <h1 className="text-3xl font-bold">Creator not found</h1>
        <p className="mt-2 text-muted-foreground">This profile doesn't exist or isn't public yet.</p>
        <Button asChild className="mt-6"><Link to="/browse">Back to browse</Link></Button>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  component: CreatorPage,
});

function CreatorPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery({
    queryKey: ["creator", params.username],
    queryFn: () => getCreatorByUsername({ data: { username: params.username } }),
  });
  if (!data) return null;
  const { profile, creator, portfolios } = data;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="relative bg-hero">
        <div className="absolute inset-0 -z-10 bg-grid" />
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-end">
            <div className="h-28 w-28 overflow-hidden rounded-2xl border border-border bg-muted shadow-[var(--shadow-card)]">
              {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-bold md:text-4xl">{profile.display_name}</h1>
                {creator?.is_verified && <ShieldCheck className="h-6 w-6 text-accent" />}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">@{profile.username}</div>
              {creator?.headline && <p className="mt-3 max-w-2xl text-lg">{creator.headline}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {profile.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                {creator?.availability && <span className="inline-flex items-center gap-1 capitalize"><Sparkles className="h-3.5 w-3.5 text-accent" />{creator.availability}</span>}
                {creator?.response_hours && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />replies in ~{creator.response_hours}h</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {!creator ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            This user hasn't published a creator profile yet.
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-[1fr,280px]">
            <div>
              <h2 className="text-xl font-semibold">Selected work</h2>
              {portfolios.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No published projects yet.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {portfolios.map((p: any) => (
                    <div key={p.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-card)]">
                      {p.cover_image && (
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img src={p.cover_image} alt={p.title} className="h-full w-full object-cover transition hover:scale-[1.02]" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium">{p.title}</h3>
                          {p.project_url && (
                            <a href={p.project_url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {creator.about && (
                <div className="mt-10">
                  <h2 className="text-xl font-semibold">About</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{creator.about}</p>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-xl border border-border/70 bg-card p-5">
                <h3 className="text-sm font-semibold">Crafts</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {creator.creator_categories?.map((cc: any) => (
                    <Badge key={cc.category.id} variant="secondary">{cc.category.name}</Badge>
                  ))}
                </div>
              </div>
              {creator.creator_skills?.length > 0 && (
                <div className="rounded-xl border border-border/70 bg-card p-5">
                  <h3 className="text-sm font-semibold">Skills & tools</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {creator.creator_skills.map((s: any) => (
                      <Badge key={s.skill} variant="outline">{s.skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button className="w-full bg-[image:var(--gradient-primary)]">Contact creator</Button>
              <p className="text-center text-xs text-muted-foreground">Messaging launches in a later phase.</p>
            </aside>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}