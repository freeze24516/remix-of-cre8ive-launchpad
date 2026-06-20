
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
CREATE INDEX IF NOT EXISTS msg_body_search_idx ON public.messages USING gin (to_tsvector('simple', coalesce(body,'')));
