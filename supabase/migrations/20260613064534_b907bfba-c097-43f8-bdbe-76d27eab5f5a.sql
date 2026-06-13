
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.user_kind AS ENUM ('client', 'creator');
CREATE TYPE public.availability_status AS ENUM ('available', 'limited', 'booked', 'vacation');
CREATE TYPE public.experience_level AS ENUM ('entry', 'intermediate', 'expert');
CREATE TYPE public.report_target AS ENUM ('creator', 'client', 'job', 'portfolio', 'message');
CREATE TYPE public.report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  kind public.user_kind NOT NULL DEFAULT 'client',
  location TEXT,
  languages TEXT[] NOT NULL DEFAULT '{}',
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$')
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
  ('video-editing', 'Video Editing', 'Clapperboard', 1),
  ('motion-design', 'Motion Design', 'Sparkles', 2),
  ('photography', 'Photography', 'Camera', 3),
  ('graphic-design', 'Graphic Design', 'Palette', 4),
  ('illustration', 'Illustration', 'PenTool', 5),
  ('3d-art', '3D Art', 'Box', 6),
  ('ui-ux', 'UI / UX Design', 'Layers', 7),
  ('web-design', 'Web Design', 'Monitor', 8),
  ('sound-design', 'Sound Design', 'Music', 9),
  ('writing', 'Writing & Copy', 'PenLine', 10);

-- ============ CREATORS ============
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT,
  about TEXT,
  experience public.experience_level,
  availability public.availability_status NOT NULL DEFAULT 'available',
  response_hours INT NOT NULL DEFAULT 24,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  verification_requested_at TIMESTAMPTZ,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creators TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creators TO authenticated;
GRANT ALL ON public.creators TO service_role;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators public read" ON public.creators FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators self insert" ON public.creators FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Creators self update" ON public.creators FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND is_verified = (SELECT is_verified FROM public.creators WHERE user_id = auth.uid()) AND is_featured = (SELECT is_featured FROM public.creators WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage creators" ON public.creators FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ JOIN: creator_categories ============
CREATE TABLE public.creator_categories (
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (creator_id, category_id)
);
GRANT SELECT ON public.creator_categories TO anon, authenticated;
GRANT INSERT, DELETE ON public.creator_categories TO authenticated;
GRANT ALL ON public.creator_categories TO service_role;
ALTER TABLE public.creator_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator cats public read" ON public.creator_categories FOR SELECT USING (true);
CREATE POLICY "Creator cats self write" ON public.creator_categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- ============ JOIN: creator_skills ============
CREATE TABLE public.creator_skills (
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  PRIMARY KEY (creator_id, skill)
);
GRANT SELECT ON public.creator_skills TO anon, authenticated;
GRANT INSERT, DELETE ON public.creator_skills TO authenticated;
GRANT ALL ON public.creator_skills TO service_role;
ALTER TABLE public.creator_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills public read" ON public.creator_skills FOR SELECT USING (true);
CREATE POLICY "Skills self write" ON public.creator_skills FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- ============ PORTFOLIOS ============
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  project_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  software TEXT[] NOT NULL DEFAULT '{}',
  is_approved BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolios public read approved" ON public.portfolios FOR SELECT USING (is_approved = true OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Portfolios self insert" ON public.portfolios FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Portfolios self update" ON public.portfolios FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Portfolios self delete" ON public.portfolios FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins moderate portfolios" ON public.portfolios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SAVED CREATORS ============
CREATE TABLE public.saved_creators (
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, creator_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_creators TO authenticated;
GRANT ALL ON public.saved_creators TO service_role;
ALTER TABLE public.saved_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saved self read" ON public.saved_creators FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Saved self write" ON public.saved_creators FOR ALL TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter views own" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "Anyone authed reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins manage reports" ON public.reports FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER creators_touch BEFORE UPDATE ON public.creators FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER portfolios_touch BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), '[^a-z0-9_-]', '', 'g'));
  IF length(base_username) < 3 THEN base_username := 'user' || substr(NEW.id::text, 1, 6); END IF;
  IF length(base_username) > 24 THEN base_username := substr(base_username, 1, 24); END IF;
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, kind, avatar_url)
  VALUES (
    NEW.id,
    candidate,
    coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', candidate),
    coalesce((NEW.raw_user_meta_data->>'kind')::public.user_kind, 'client'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indices
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_creators_user ON public.creators(user_id);
CREATE INDEX idx_creators_featured ON public.creators(is_featured) WHERE is_featured = true;
CREATE INDEX idx_portfolios_creator ON public.portfolios(creator_id);
CREATE INDEX idx_portfolios_category ON public.portfolios(category_id);
