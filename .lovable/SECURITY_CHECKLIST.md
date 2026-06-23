# Security Checklist

## Database
- [ ] Every table in `public` has RLS enabled.
- [ ] Every table in `public` has explicit `GRANT` statements scoped to roles its policies allow.
- [ ] No table grants `SELECT` to `anon` unless a policy explicitly allows public reads.
- [ ] Roles live in `public.user_roles`; **never** on `profiles`.
- [ ] All admin checks use `public.has_role(auth.uid(), 'admin')` (security-definer, `search_path = public`).
- [ ] Run `supabase--linter` — resolve every error/warning, or document why it's accepted.

## Auth
- [ ] Email verification ON.
- [ ] HIBP leaked-password protection ON.
- [ ] Password minimum length ≥ 10.
- [ ] Anonymous sign-ins OFF unless explicitly required.
- [ ] OAuth providers configured with redirect allow-list scoped to production + preview origins only.
- [ ] Session JWT expiry sensible (default 1 h) with refresh rotation enabled.

## Server functions & routes
- [ ] Every `createServerFn` that touches user data either uses `requireSupabaseAuth` or explicitly verifies the caller.
- [ ] `supabaseAdmin` is loaded **inside** handlers via dynamic import — never at module scope in `*.functions.ts` or route files.
- [ ] Public routes under `/api/public/*` verify webhook signatures (HMAC + timing-safe compare) before doing any work.
- [ ] All inputs validated with Zod (or equivalent) on the server.
- [ ] No PII in logs.

## Secrets
- [ ] Service role key, DB URL, third-party API keys: stored via `add_secret`, never committed.
- [ ] `LOVABLE_API_KEY` rotated if leaked (use `lovable_api_key--rotate_lovable_api_key`).
- [ ] `.env` does not contain production secrets.

## Edge / network
- [ ] HTTPS enforced (HSTS with `max-age=31536000; includeSubDomains; preload`).
- [ ] Security headers configured at the edge:
  - `Content-Security-Policy` (script-src self + analytics origins; img-src self data: https:; connect-src self + Supabase + Lovable AI Gateway)
  - `Strict-Transport-Security`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (or `Content-Security-Policy: frame-ancestors 'none'`)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(self), geolocation=()` (mic needed for voice messages)
- [ ] CORS: server functions are same-origin; explicit allow-list on any cross-origin `/api/public/*` endpoint.

## Rate limiting & abuse
- [ ] WAF rule: `/auth/*` capped at 20 req/min/IP.
- [ ] WAF rule: `/api/public/*` capped at 60 req/min/IP.
- [ ] App-level throttle on review creation, messages, job applications, file uploads.
- [ ] Turnstile (or hCaptcha) on signup and public review submission.
- [ ] Storage uploads validate MIME + size server-side (avatars ≤ 5 MB, portfolio ≤ 25 MB, voice ≤ 10 MB).

## Data hygiene
- [ ] No customer data in client console logs.
- [ ] Soft-delete or anonymize on user account deletion.
- [ ] Daily backups; verified restore at least once.

## Incident response
- [ ] On-call contact documented.
- [ ] Process for revoking sessions (`auth.admin.signOut(user_id)`) and rotating keys documented.
- [ ] Status page or notification channel ready before launch.
