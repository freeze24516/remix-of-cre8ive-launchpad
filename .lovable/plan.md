## Scope

Seven launch features for the existing CRE8IVE marketplace. Keep dark theme, routing, auth, and existing Supabase patterns. Ship in one batch with DB migrations, server functions, UI, and SEO updates.

---

## 1. Database migrations (single migration file)

New tables (all with GRANTs + RLS + policies + updated_at triggers where relevant):

- `reviews` — `id`, `reviewer_id` (auth.users), `reviewee_id` (auth.users), `job_id` (FK jobs, nullable), `rating` smallint 1-5, `body` text, `direction` enum(`client_to_creator`,`creator_to_client`), unique(`reviewer_id`,`reviewee_id`,`job_id`).
- `saved_jobs` — `user_id`, `job_id`, unique pair.
- `analytics_events` — `id`, `subject_id` (the creator/profile being measured), `actor_id` nullable, `kind` enum(`profile_view`,`portfolio_view`,`contact_request`,`hire_request`), `meta` jsonb, `created_at`. Indexed on (`subject_id`,`kind`,`created_at`).
- Extend `messages`: add `attachments` jsonb (array of `{path, name, size, mime}`).
- Extend `creators` (or `profiles`): add cached `rating_avg` numeric, `rating_count` int, `completed_projects` int — maintained by trigger on `reviews` and on `job_applications.status='completed'`.

Storage:
- New bucket `message-attachments` (private). RLS on `storage.objects` so only conversation participants can read/write under `conversation_id/...`.

`saved_creators` already exists — reused.

## 2. Reviews & Ratings

- `src/lib/reviews.functions.ts` — `createReview`, `listReviewsFor(userId)`, `canReview(jobId)` (only after job marked completed and only the two parties).
- `src/components/reviews/RatingStars.tsx` — display + input variants.
- `src/components/reviews/ReviewList.tsx`, `ReviewForm.tsx`.
- Surface average + count badge on creator cards, creator profile pages, and search result rows.
- New section on creator profile route: reviews list + form (visible when eligible).

## 3. Saved Creators

- Heart toggle component `SaveCreatorButton.tsx` using existing `saved_creators` table.
- New route `src/routes/_authenticated/dashboard.saved-creators.tsx` listing saved creators with remove action.
- Add link in dashboard sidebar.

## 4. Saved Jobs

- `SaveJobButton.tsx` on job cards/pages.
- Route `src/routes/_authenticated/dashboard.saved-jobs.tsx` with filter (category, budget) and sort (newest, budget high→low).
- Sidebar link.

## 5. Messaging attachments

- Extend message composer with file input (PDF/ZIP/JPG/PNG/MP4/DOCX, 25MB cap).
- Upload to `message-attachments/{conversation_id}/{uuid}-{filename}` with progress bar (XHR-based upload to capture progress).
- Persist metadata in `messages.attachments`.
- Message bubble renders download links via signed URLs (1-hour TTL) fetched through a server fn `getAttachmentUrl`.

## 6. Creator Analytics

- Server fn `recordEvent(kind, subjectId)` — fire from profile view, portfolio view, contact button, hire button (best-effort, no PII).
- Server fn `getCreatorAnalytics()` returning aggregates: totals, last-7-day series, last-30-day series, weekly + monthly growth %.
- New route `src/routes/_authenticated/dashboard.analytics.tsx` with stat cards + Recharts line/bar charts (Recharts already in stack — verify, add if missing).
- Sidebar link (creators only).

## 7. Dynamic SEO + Structured Data

- Update `head()` on:
  - `creators/$username` (or equivalent) → Person schema, dynamic title/description/OG/Twitter.
  - `portfolio/$id` → CreativeWork schema.
  - `jobs/$id` → JobPosting schema (datePosted, validThrough, hiringOrganization, baseSalary).
- Root `__root.tsx` already carries Organization JSON-LD — keep, do not duplicate.
- Add Review schema entries inside Person schema (aggregateRating + sample reviews) when available.

---

## Technical notes

- All new server fns follow existing `*.functions.ts` + `requireSupabaseAuth` patterns; admin client only used for trigger maintenance (none needed — triggers run in DB).
- Cache: TanStack Query keys `['reviews', userId]`, `['saved-creators']`, `['saved-jobs', filters]`, `['analytics','me']`, `['attachment-url', path]`.
- Rating aggregates maintained by SQL trigger on `reviews` so reads stay cheap.
- All new pages use existing `DashboardShell` and shadcn primitives — no new design tokens.
- Mobile: reuse existing responsive grid/card patterns.

## Out of scope (will not touch)

- Routing structure beyond new files listed.
- Auth, theme, design tokens, existing migrations.
- Edge functions (none needed).
