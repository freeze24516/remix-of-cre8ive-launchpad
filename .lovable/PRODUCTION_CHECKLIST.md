# Production Checklist

Status legend: ✅ done · 🟡 partial / needs review · ⬜ todo before launch.

## Branding & metadata
- ✅ Per-route `head()` with title, description, og:title, og:description, og:url, canonical on every public page (`/`, `/browse`, `/jobs`, `/jobs/$jobId`, `/u/$username`, `/u/$username/work/$projectId`, `/pricing`, `/terms`, `/privacy`).
- ✅ Root `og:site_name`, `theme-color`, `color-scheme`, `twitter:card=summary_large_image`, robots meta.
- ✅ Organization JSON-LD in `__root.tsx`; `Person`, `JobPosting`, `CreativeWork`, `Review` JSON-LD on relevant routes.
- ⬜ Replace `BASE_URL = ""` in `src/routes/sitemap[.]xml.ts` once a custom domain is connected; add an `og:image` (1200×630) once final brand art is approved.
- ⬜ Add favicon + apple-touch-icon + web manifest (`public/site.webmanifest`).

## Performance & Core Web Vitals
- ✅ TanStack Query loaders (SSR-hydrated) — avoids client waterfalls.
- ✅ Skeletons for messages, dashboard lists, browse, profile.
- ✅ Animated counters & masonry use `IntersectionObserver` (no scroll thrash).
- 🟡 LCP image: when a hero/cover image is added, preload it via the route's `head().links` (see `perf` knowledge).
- ⬜ Compress and serve portfolio uploads as WebP/AVIF (server-side transform on upload, or signed CDN URL with `?format=webp`).
- ⬜ Enable Brotli/gzip at the edge (default on Lovable Cloud / Cloudflare).

## Accessibility (WCAG 2.1 AA)
- ✅ Single `<main>` per route; semantic landmarks via `SiteHeader`/`SiteFooter`.
- ✅ All icon-only buttons in shared components have `aria-label`.
- ✅ Empty/loading states announce via `role="status"` + `aria-busy`.
- ⬜ Run axe DevTools on `/`, `/browse`, `/jobs`, `/u/$username`, `/dashboard` and fix contrast warnings before launch.
- ⬜ Verify keyboard traversal in `Lightbox`, `BeforeAfterSlider`, `VoiceRecorder`, `Dialog` flows.

## SEO
- ✅ `sitemap.xml` server route with static + dynamic creator & job entries.
- ✅ `robots.txt` allows `/`, disallows `/dashboard`, `/admin`, `/auth`, `/api`.
- ✅ Canonicals on every leaf route point to themselves (relative).
- ⬜ Submit sitemap to Google Search Console + Bing Webmaster Tools after domain connect.

## Security
- ✅ RLS on every public table; `has_role()` security-definer function for admin checks.
- ✅ Role storage isolated in `user_roles` (no role column on profiles).
- ✅ Server-only secrets read inside handlers (`process.env.*`).
- ✅ Public webhook routes scoped to `/api/public/*` only; verify signatures inside the handler.
- ⬜ Configure security headers at the edge (`Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).
- ⬜ Run `supabase--linter` and resolve any flagged policies before launch.
- ⬜ Enable HIBP password protection in Auth settings.

## Rate limiting & spam
- ⬜ Add Cloudflare WAF rate limit rule on `/api/public/*` and on auth endpoints (20 req/min/IP).
- ⬜ Add Cloudflare Turnstile to `/auth` signup and to public review submission.
- ⬜ Server-side throttle on `reviews.create`, `messages.send`, `jobs.applicants.create` (10/min/user via a `rate_limits` table or KV).

## Auth & email
- ⬜ Enable email verification (Supabase Auth → Email confirmations ON).
- ⬜ Configure custom SMTP / email domain via `email_domain--setup_email_infra`.
- ⬜ Add Google OAuth provider in Auth settings.

## Operations
- ⬜ Configure error reporting sink for `reportLovableError` (Sentry, Highlight, etc.).
- ⬜ Set up uptime monitoring on `/`, `/browse`, `/sitemap.xml`.
- ⬜ Configure daily DB backups retention ≥ 7 days.
