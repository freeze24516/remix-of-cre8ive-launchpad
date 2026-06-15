
-- JOBS
CREATE TYPE public.job_status AS ENUM ('draft','open','in_review','closed','filled');

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  deadline DATE,
  location TEXT,
  remote_ok BOOLEAN NOT NULL DEFAULT true,
  skills TEXT[] NOT NULL DEFAULT '{}',
  status public.job_status NOT NULL DEFAULT 'open',
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX jobs_status_idx ON public.jobs(status, created_at DESC);
CREATE INDEX jobs_client_idx ON public.jobs(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open jobs viewable by all" ON public.jobs FOR SELECT
  USING (status IN ('open','in_review','filled') OR client_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Clients create own jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "Clients update own jobs" ON public.jobs FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (client_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Clients delete own jobs" ON public.jobs FOR DELETE TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER touch_jobs BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- APPLICATIONS
CREATE TYPE public.application_status AS ENUM ('pending','shortlisted','accepted','rejected','withdrawn');

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pitch TEXT NOT NULL,
  quoted_rate NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, creator_id)
);
CREATE INDEX ja_job_idx ON public.job_applications(job_id);
CREATE INDEX ja_creator_idx ON public.job_applications(creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants & job owners view applications" ON public.job_applications FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Creators apply" ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Owner or applicant updates" ON public.job_applications FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));
CREATE POLICY "Applicant deletes own" ON public.job_applications FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

CREATE TRIGGER touch_ja BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX conv_a_idx ON public.conversations(user_a, last_message_at DESC);
CREATE INDEX conv_b_idx ON public.conversations(user_b, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view conv" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Participants create conv" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (user_a, user_b));
CREATE POLICY "Participants update conv" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() IN (user_a, user_b))
  WITH CHECK (auth.uid() IN (user_a, user_b));

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX msg_conv_idx ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)));
CREATE POLICY "Recipient marks read" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notifications(user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Helper to get/create a DM conversation (normalized pair)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_other UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  a UUID; b UUID; cid UUID;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other = me THEN RAISE EXCEPTION 'cannot DM yourself'; END IF;
  IF me < _other THEN a := me; b := _other; ELSE a := _other; b := me; END IF;
  SELECT id INTO cid FROM public.conversations WHERE user_a = a AND user_b = b;
  IF cid IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b) VALUES (a, b) RETURNING id INTO cid;
  END IF;
  RETURN cid;
END;
$$;

-- Trigger: bump conversation.last_message_at and notify recipient
CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c RECORD; recipient UUID; sender_name TEXT;
BEGIN
  SELECT user_a, user_b INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END;
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (recipient, 'message', 'New message from ' || coalesce(sender_name,'someone'), left(NEW.body, 140), '/dashboard/messages?c=' || NEW.conversation_id::text);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_message_insert AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();

-- Trigger: notify job owner on new application
CREATE OR REPLACE FUNCTION public.on_application_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; jtitle TEXT; cname TEXT;
BEGIN
  SELECT client_id, title INTO owner, jtitle FROM public.jobs WHERE id = NEW.job_id;
  SELECT display_name INTO cname FROM public.profiles WHERE id = NEW.creator_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (owner, 'application', 'New application: ' || jtitle, coalesce(cname,'A creator') || ' applied', '/dashboard/jobs/' || NEW.job_id::text);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_application_insert AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.on_application_insert();

-- Trigger: notify applicant on status change
CREATE OR REPLACE FUNCTION public.on_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE jtitle TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT title INTO jtitle FROM public.jobs WHERE id = NEW.job_id;
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.creator_id, 'application_status', 'Application ' || NEW.status::text, jtitle, '/dashboard/applications');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_application_status AFTER UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.on_application_status();
