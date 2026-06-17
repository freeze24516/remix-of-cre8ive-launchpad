import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { ShieldCheck, MapPin, Clock, Sparkles, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCreatorByUsername } from "@/lib/marketplace.functions";
import { startConversation } from "@/lib/messaging.functions";
import { useAuth } from "@/hooks/use-auth";
import { ReportDialog } from "@/components/report-dialog";
import { SaveCreatorButton } from "@/components/SaveCreatorButton";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import { RatingBadge } from "@/components/reviews/RatingStars";
import { reviewSummaries } from "@/lib/reviews.functions";
import { recordEvent } from "@/lib/analytics.functions";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["creator", params.username],
      queryFn: () => getCreatorByUsername({ data: { username: params.username } }),
    });
    if (!data) throw notFound();
    const summaries = await context.queryClient.ensureQueryData({
      queryKey: ["review-summary", data.profile.id],
      queryFn: () => reviewSummaries({ data: { userIds: [data.profile.id] } }),
    });
    return { ...data, summary: summaries[data.profile.id] ?? { average: 0, count: 0 } };
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.profile;
    const c = loaderData?.creator;
    const title = p ? `${p.display_name} (@${p.username}) — CRE8IVE` : "Creator — CRE8IVE";
    const desc = c?.headline || p?.bio || "Creative talent on CRE8IVE.";
    const path = `/u/${params.username}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: path },
        ...(p?.avatar_url ? [{ property: "og:image", content: p.avatar_url }, { name: "twitter:image", content: p.avatar_url }] : []),
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: p
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Person",
                name: p.display_name,
                alternateName: p.username,
                description: desc,
                image: p.avatar_url ?? undefined,
                jobTitle: c?.headline ?? undefined,
                address: p.location ?? undefined,
                url: path,
                aggregateRating:
                  loaderData?.summary && loaderData.summary.count > 0
                    ? {
                        "@type": "AggregateRating",
                        ratingValue: loaderData.summary.average,
                        reviewCount: loaderData.summary.count,
                        bestRating: 5,
                        worstRating: 1,
                      }
                    : undefined,
              }),
            },
          ]
        : [],
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data } = useSuspenseQuery({
    queryKey: ["creator", params.username],
    queryFn: () => getCreatorByUsername({ data: { username: params.username } }),
  });
  if (!data) return null;
  const { profile, creator, portfolios } = data;
  const startConvFn = useServerFn(startConversation);
  const recordFn = useServerFn(recordEvent);
  useEffect(() => {
    recordFn({ data: { subjectId: profile.id, kind: "profile_view" } }).catch(() => {});
  }, [profile.id, recordFn]);
  const { data: summary } = useQuery({
    queryKey: ["review-summary", profile.id],
    queryFn: () => reviewSummaries({ data: { userIds: [profile.id] } }),
  });
  const s = summary?.[profile.id] ?? { average: 0, count: 0 };
  const dm = useMutation({
    mutationFn: async () => {
      await recordFn({ data: { subjectId: profile.id, kind: "contact_request" } });
      return startConvFn({ data: { otherUserId: profile.id } });
    },
    onSuccess: (r) => navigate({ to: "/dashboard/messages", search: { c: r.id } }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

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
              <div className="mt-3"><RatingBadge average={s.average} count={s.count} /></div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {profile.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                {creator?.availability && <span className="inline-flex items-center gap-1 capitalize"><Sparkles className="h-3.5 w-3.5 text-accent" />{creator.availability}</span>}
                {creator?.response_hours && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />replies in ~{creator.response_hours}h</span>}
              </div>
            </div>
            {creator && (
              <div className="mt-2 md:mt-0"><SaveCreatorButton creatorId={creator.id} variant="button" /></div>
            )}
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

              <ReviewSection revieweeId={profile.id} direction="client_to_creator" />
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
              {user && user.id !== profile.id ? (
                <Button className="w-full bg-[image:var(--gradient-primary)]" onClick={() => dm.mutate()} disabled={dm.isPending}>
                  {dm.isPending ? "Opening…" : "Contact creator"}
                </Button>
              ) : !user ? (
                <Button asChild className="w-full bg-[image:var(--gradient-primary)]"><Link to="/auth" search={{ mode: "signup" }}>Sign in to contact</Link></Button>
              ) : null}
              {user && user.id !== profile.id && creator && (
                <div className="flex justify-center">
                  <ReportDialog targetType="creator" targetId={creator.id} />
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}