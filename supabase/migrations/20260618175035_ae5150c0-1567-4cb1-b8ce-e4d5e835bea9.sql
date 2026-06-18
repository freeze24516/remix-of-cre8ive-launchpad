
-- Add columns to creators
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS verification_level smallint NOT NULL DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS is_spotlight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spotlight_until timestamptz,
  ADD COLUMN IF NOT EXISTS budget_tier text CHECK (budget_tier IN ('5k-10k','10k-25k','25k-50k','50k+')),
  ADD COLUMN IF NOT EXISTS location_scope text CHECK (location_scope IN ('remote','india','global')),
  ADD COLUMN IF NOT EXISTS hire_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS tools text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vacation_from date,
  ADD COLUMN IF NOT EXISTS vacation_to date;

-- Backfill verification_level from existing is_verified
UPDATE public.creators SET verification_level = 1 WHERE is_verified = true AND verification_level = 0;

-- Unavailable dates table
CREATE TABLE IF NOT EXISTS public.creator_unavailable_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, date)
);

GRANT SELECT ON public.creator_unavailable_dates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.creator_unavailable_dates TO authenticated;
GRANT ALL ON public.creator_unavailable_dates TO service_role;

ALTER TABLE public.creator_unavailable_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read unavailable dates"
  ON public.creator_unavailable_dates FOR SELECT
  USING (true);

CREATE POLICY "Creators manage their own unavailable dates"
  ON public.creator_unavailable_dates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS creator_unavailable_dates_creator_idx ON public.creator_unavailable_dates(creator_id, date);
CREATE INDEX IF NOT EXISTS creators_spotlight_idx ON public.creators(is_spotlight) WHERE is_spotlight = true;
CREATE INDEX IF NOT EXISTS creators_featured_idx ON public.creators(is_featured) WHERE is_featured = true;
