
ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS case_study jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS completion_rate numeric,
  ADD COLUMN IF NOT EXISTS repeat_client_rate numeric,
  ADD COLUMN IF NOT EXISTS years_experience integer;
