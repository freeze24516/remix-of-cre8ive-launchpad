import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, ExternalLink, Users, Calendar, Briefcase, Wrench } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPortfolioProject } from "@/lib/marketplace.functions";
import { MetricGrid, type PortfolioMetric } from "@/components/portfolio/MetricCard";
import { VideoEmbed } from "@/components/portfolio/VideoEmbed";
import { BeforeAfterSlider } from "@/components/portfolio/BeforeAfterSlider";
import { MasonryGallery } from "@/components/portfolio/MasonryGallery";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useServerFn } from "@tanstack/react-start";
import { recordEvent } from "@/lib/analytics.functions";

export const Route = createFileRoute("/u/$username/work/$projectId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["portfolio-project", params.username, params.projectId],
      queryFn: () => getPortfolioProject({ data: { username: params.username, projectId: params.projectId } }),
    });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.project;
    const pr = loaderData?.profile;
    const title = p ? `${p.title} — ${pr?.display_name ?? "Case Study"}` : "Project — CRE8IVE";
    const desc =
      (p?.case_study as any)?.overview ||
      p?.description ||
      (pr ? `Case study by ${pr.display_name}` : "Premium case study on CRE8IVE.");
    const path = `/u/${params.username}/work/${params.projectId}`;
    const cover = p?.cover_image ?? pr?.avatar_url ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: path },
        ...(cover
          ? [
              { property: "og:image", content: cover },
              { name: "twitter:image", content: cover },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: p
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "CreativeWork",
                name: p.title,
                description: desc,
                image: cover,
                url: path,
                creator: pr
                  ? { "@type": "Person", name: pr.display_name, alternateName: pr.username, url: `/u/${pr.username}` }
                  : undefined,
                about: p.industry ?? undefined,
                keywords: p.services?.join(", ") || undefined,
              }),
            },
          ]
        : [],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center text-center">
      <div>
        <h1 className="text-3xl font-bold">Project not found</h1>
        <Button asChild className="mt-6">
          <Link to="/browse">Back to browse</Link>
        </Button>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  component: ProjectPage,
});

function ProjectPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery({
    queryKey: ["portfolio-project", params.username, params.projectId],
    queryFn: () => getPortfolioProject({ data: { username: params.username, projectId: params.projectId } }),
  });
  if (!data) return null;
  const { profile, creator, project } = data as any;
  const cs = (project.case_study as any) ?? {};
  const metrics: PortfolioMetric[] = Array.isArray(cs.metrics) ? cs.metrics : [];
  const videos: string[] = Array.isArray(cs.videos) ? cs.videos : [];
  const gallery: string[] = Array.isArray(cs.gallery) ? cs.gallery : [];
  const beforeAfter: { before: string; after: string; label?: string }[] = Array.isArray(cs.before_after)
    ? cs.before_after
    : [];

  const recordFn = useServerFn(recordEvent);
  useEffect(() => {
    recordFn({ data: { subjectId: project.id, kind: "portfolio_view" } }).catch(() => {});
  }, [project.id, recordFn]);

  const meta: { icon: typeof Users; label: string; value: string }[] = [];
  if (project.client_name) meta.push({ icon: Briefcase, label: "Client", value: project.client_name });
  if (project.industry) meta.push({ icon: Briefcase, label: "Industry", value: project.industry });
  if (project.timeline) meta.push({ icon: Calendar, label: "Timeline", value: project.timeline });
  if (project.team_size) meta.push({ icon: Users, label: "Team size", value: project.team_size });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-hero">
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Link
            to="/u/$username"
            params={{ username: profile.username }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to {profile.display_name}
          </Link>
          <div className="mt-6 grid gap-3">
            {project.industry && (
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{project.industry}</div>
            )}
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">{project.title}</h1>
            {project.description && (
              <p className="max-w-3xl text-base text-muted-foreground md:text-lg">{project.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                to="/u/$username"
                params={{ username: profile.username }}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs backdrop-blur hover:border-accent/40"
              >
                {profile.avatar_url && (
                  <img src={profile.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                )}
                <span className="font-medium">{profile.display_name}</span>
                <VerificationBadge level={creator.verification_level} />
              </Link>
              {project.project_url && (
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs backdrop-blur hover:border-accent/40"
                >
                  Visit live <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cover */}
      {project.cover_image && (
        <div className="mx-auto w-full max-w-6xl px-6 pt-10">
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-muted shadow-[var(--shadow-card)]">
            <img src={project.cover_image} alt={project.title} className="w-full object-cover" />
          </div>
        </div>
      )}

      <article className="mx-auto w-full max-w-6xl flex-1 space-y-16 px-6 py-14">
        {/* Project facts */}
        {(meta.length > 0 || project.services?.length > 0 || project.software?.length > 0) && (
          <section className="grid gap-6 rounded-2xl border border-border/70 bg-card/40 p-6 backdrop-blur md:grid-cols-2 lg:grid-cols-4">
            {meta.map((m) => (
              <div key={m.label}>
                <m.icon className="h-4 w-4 text-accent" />
                <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div className="mt-0.5 font-medium">{m.value}</div>
              </div>
            ))}
            {project.services?.length > 0 && (
              <div className="md:col-span-2 lg:col-span-2">
                <Briefcase className="h-4 w-4 text-accent" />
                <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">Services</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.services.map((s: string) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {project.software?.length > 0 && (
              <div className="md:col-span-2 lg:col-span-2">
                <Wrench className="h-4 w-4 text-accent" />
                <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">Tools used</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.software.map((t: string) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <Section title="Overview" body={cs.overview} />
        <Section title="The Challenge" body={cs.challenge} />
        <Section title="Process" body={cs.process} />
        <Section title="Solution" body={cs.solution} />

        {metrics.length > 0 && (
          <section>
            <SectionTitle eyebrow="Impact" title="Results & Metrics" />
            <div className="mt-6">
              <MetricGrid metrics={metrics} />
            </div>
            {cs.results && (
              <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">{cs.results}</p>
            )}
          </section>
        )}
        {metrics.length === 0 && cs.results && <Section title="Results" body={cs.results} />}

        {videos.length > 0 && (
          <section>
            <SectionTitle eyebrow="Watch" title="Video" />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {videos.map((u, i) => (
                <VideoEmbed key={u + i} url={u} />
              ))}
            </div>
          </section>
        )}

        {beforeAfter.length > 0 && (
          <section>
            <SectionTitle eyebrow="Transformations" title="Before / After" />
            <div className="mt-6 space-y-6">
              {beforeAfter.map((b, i) => (
                <div key={i}>
                  <BeforeAfterSlider before={b.before} after={b.after} />
                  {b.label && <div className="mt-2 text-xs text-muted-foreground">{b.label}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section>
            <SectionTitle eyebrow="Gallery" title="Visual library" />
            <div className="mt-6">
              <MasonryGallery images={gallery} />
            </div>
          </section>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div>
      {eyebrow && <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{eyebrow}</div>}
      <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function Section({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return (
    <section>
      <SectionTitle title={title} />
      <p className="mt-5 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">{body}</p>
    </section>
  );
}
