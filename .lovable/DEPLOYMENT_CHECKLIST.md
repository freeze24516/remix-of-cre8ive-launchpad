# Deployment Checklist

## Pre-deploy
- [ ] All migrations applied; `supabase--linter` returns no errors.
- [ ] `bun run build` succeeds locally (the harness runs this automatically here).
- [ ] No `console.log` of sensitive data in server functions.
- [ ] All `add_secret`-managed values are present for the target environment.
- [ ] Email provider configured; verification email previewed end to end.
- [ ] `BASE_URL` in `src/routes/sitemap[.]xml.ts` set to the production origin once domain is live.
- [ ] Final review of `.lovable/PRODUCTION_CHECKLIST.md` — every ⬜ is either resolved or explicitly deferred.

## Deploy
1. Click **Publish** in Lovable. Frontend changes deploy after Publish; backend (migrations, server functions) deploy immediately on save.
2. Wait for the published URL to return 200 on `/` and `/sitemap.xml`.
3. Connect custom domain in *Project Settings → Domains*. Verify DNS, TLS, and that canonical URLs resolve correctly.

## Post-deploy smoke
- [ ] `/`, `/browse`, `/jobs`, a creator profile, a job detail — all render with correct `<title>` and `og:*` tags (use a link debugger e.g. https://www.opengraph.xyz).
- [ ] Sign up + sign in work on the published URL.
- [ ] Trigger one real notification (review or message) end to end.
- [ ] Submit `https://<domain>/sitemap.xml` to Google Search Console.
- [ ] Confirm robots.txt is served (`curl https://<domain>/robots.txt`).

## Rollback
- Use the Lovable **History** panel to revert to the last known-good commit.
- DB schema rollbacks: write a forward-only "fix" migration; never edit applied migrations.

## Monitoring (first 24 h)
- [ ] Watch error reporting dashboard for spikes.
- [ ] Watch Auth dashboard for failed sign-ins / bounced emails.
- [ ] Watch DB → slow-queries; index any > 200 ms repeat offenders.
