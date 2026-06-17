import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// TODO: replace with your project URL once a custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/browse", changefreq: "daily", priority: "0.9" },
          { path: "/jobs", changefreq: "daily", priority: "0.9" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
        ];

        const dynamic: SitemapEntry[] = [];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [{ data: creators }, { data: jobs }] = await Promise.all([
            supabaseAdmin
              .from("creators")
              .select("updated_at, profile:profiles!creators_user_id_profiles_fkey(username)")
              .eq("is_approved", true)
              .limit(5000),
            supabaseAdmin
              .from("jobs")
              .select("id, updated_at")
              .eq("status", "open")
              .limit(5000),
          ]);
          for (const c of creators ?? []) {
            const u = (c as any).profile?.username;
            if (u) dynamic.push({ path: `/u/${u}`, changefreq: "weekly", priority: "0.7", lastmod: (c as any).updated_at?.slice(0, 10) });
          }
          for (const j of jobs ?? []) {
            dynamic.push({ path: `/jobs/${(j as any).id}`, changefreq: "daily", priority: "0.6", lastmod: (j as any).updated_at?.slice(0, 10) });
          }
        } catch (e) {
          // fail open with static entries only
          console.error("[sitemap] dynamic fetch failed", e);
        }

        const entries = [...staticEntries, ...dynamic];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});