# Testing Checklist

Run through this before every release. Mobile = 375×812, Tablet = 768×1024, Desktop = 1440×900.

## Smoke flows
- [ ] Anonymous visitor: `/` → `/browse` → creator profile → `/jobs` → job detail. No console errors, no hydration warnings.
- [ ] Sign up (email + password). Receives verification email. Email link opens app and signs user in.
- [ ] Google sign-in completes round trip.
- [ ] Onboarding flow assigns username + kind (`creator`/`client`).

## Creator flows
- [ ] Edit profile (avatar upload, bio, skills, services, availability).
- [ ] Create/edit portfolio case study with metrics, gallery, before/after, video embed.
- [ ] Receive review → notification appears in real time.
- [ ] Apply to job → message thread opens with client.

## Client flows
- [ ] Post job → appears in `/jobs` and in dashboard.
- [ ] Receive applications → accept/reject changes status; notification fires.
- [ ] Save creator + saved-creators page lists it; unsave removes it.
- [ ] Leave 1–5★ review → visible on creator profile + aggregate updates.

## Messaging
- [ ] Send text → recipient sees Delivered, then Seen after open.
- [ ] Typing indicator shows/hides via broadcast.
- [ ] Voice message records, uploads, plays, downloads.
- [ ] Search inside a thread highlights matches; global search finds people.

## Admin
- [ ] `/admin/users` lists users; role changes persist.
- [ ] `/admin/verifications` promotes verification tiers and badges update on profile.
- [ ] `/admin/revenue` renders without errors (even with empty data).

## Edge cases
- [ ] Empty states render on: browse with no filter match, dashboard with zero jobs, notifications with zero items, messages with no thread selected.
- [ ] Skeletons render on cold loads (throttle to Slow 3G in devtools).
- [ ] 404 page shown for unknown route.
- [ ] Error boundary shown for forced render error (temporarily throw inside a component).
- [ ] Auth-protected route redirects to `/auth` when signed out.

## Accessibility
- [ ] Keyboard-only walkthrough of `/`, sign-in, post job, send message.
- [ ] Lighthouse → Accessibility ≥ 95 on `/`, `/browse`, creator profile.
- [ ] axe DevTools: 0 critical issues on the same pages.
- [ ] Screen reader (VoiceOver / NVDA) announces empty states & loading.

## Performance
- [ ] Lighthouse mobile: Performance ≥ 85, SEO ≥ 95, Best Practices ≥ 95.
- [ ] LCP < 2.5 s, CLS < 0.1, INP < 200 ms on creator profile (the heaviest public page).

## Cross-browser
- [ ] Chrome (latest), Safari (latest), Firefox (latest), Edge.
- [ ] iOS Safari 16+, Android Chrome.

## Dark mode
- [ ] No hardcoded `text-white`, `bg-black`, or arbitrary hex grays in component diffs.
- [ ] Hover/focus/disabled states visible against `bg-background` and `bg-card`.
