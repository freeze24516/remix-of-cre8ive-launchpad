
-- 1. Reviews ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.review_direction AS ENUM ('client_to_creator','creator_to_client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  direction public.review_direction NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_no_self CHECK (reviewer_id <> reviewee_id),
  UNIQUE (reviewer_id, reviewee_id, job_id)
);
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS reviews_job_idx ON public.reviews(job_id);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create own reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);

CREATE TRIGGER reviews_touch_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Saved jobs ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
CREATE INDEX IF NOT EXISTS saved_jobs_user_idx ON public.saved_jobs(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saved jobs self read" ON public.saved_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Saved jobs self write" ON public.saved_jobs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Analytics events ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.analytics_kind AS ENUM (
    'profile_view','portfolio_view','contact_request','hire_request','job_application'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  subject_id UUID NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.analytics_kind NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_subject_idx
  ON public.analytics_events(subject_id, kind, created_at DESC);

GRANT INSERT, SELECT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record analytics" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Subjects read own analytics" ON public.analytics_events
  FOR SELECT TO authenticated USING (auth.uid() = subject_id);

-- 4. Message attachments column ----------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 5. Storage policies for the message-attachments bucket ----------------------
CREATE OR REPLACE FUNCTION public.user_in_conversation(_conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = _conv_id
      AND (user_a = auth.uid() OR user_b = auth.uid())
  );
$$;

DROP POLICY IF EXISTS "Message attachments read for participants" ON storage.objects;
DROP POLICY IF EXISTS "Message attachments upload for participants" ON storage.objects;
DROP POLICY IF EXISTS "Message attachments delete own" ON storage.objects;

CREATE POLICY "Message attachments read for participants"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND public.user_in_conversation(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Message attachments upload for participants"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND public.user_in_conversation(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Message attachments delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'message-attachments' AND owner = auth.uid());
