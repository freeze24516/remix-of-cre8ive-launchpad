import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Star, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRE8IVE — Hire the world's best creative talent" },
      { name: "description", content: "A curated marketplace of video editors, motion designers, photographers, illustrators and 3D artists." },
      { property: "og:title", content: "CRE8IVE — Hire the world's best creative talent" },
      { property: "og:description", content: "A curated marketplace of video editors, motion designers, photographers and illustrators." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const categories = [
    "Video Editing", "Motion Design", "Photography", "Graphic Design",
    "Illustration", "3D Art", "UI / UX", "Web Design", "Sound Design", "Writing",
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 -z-10 bg-grid" />
        <div className="mx-auto max-w-7xl px-6 py-28 text-center md:py-36">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Now welcoming founding creators
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Where <span className="text-gradient">creative talent</span> meets ambitious work.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            CRE8IVE is the curated marketplace for video editors, motion designers, photographers, illustrators and 3D artists. Hire vetted talent — or get hired.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] hover:opacity-95">
              <Link to="/auth" search={{ mode: "signup" }}>Join as a creator <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "signup" }}>Hire creators</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">Browse by craft</h2>
              <p className="mt-1 text-muted-foreground">Ten disciplines, one curated network.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {categories.map((c) => (
              <div key={c} className="group rounded-xl border border-border/60 bg-card/60 px-4 py-5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[var(--shadow-glow)]">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Verified creators", body: "Every featured creator is reviewed for quality and identity before they appear." },
            { icon: Star, title: "Rated by clients", body: "Transparent ratings, reviews and response-time signals to hire with confidence." },
            { icon: Zap, title: "Built to move fast", body: "Direct messaging, fast onboarding, and a discovery engine tuned for creative work." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-[var(--shadow-card)]">
              <Icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
