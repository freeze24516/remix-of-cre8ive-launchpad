
-- 1. Enum for plan tiers
DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free','pro','elite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Profiles: subscription fields + commission
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan public.subscription_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00;

-- 3. Creators: featured/boost/sponsored windows
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boosted_creator BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS boost_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_creators_featured_until ON public.creators(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creators_boost_expiry ON public.creators(boost_expiry) WHERE boosted_creator = TRUE;
CREATE INDEX IF NOT EXISTS idx_creators_sponsored_until ON public.creators(sponsored_until) WHERE sponsored_until IS NOT NULL;

-- 4. Subscription plan catalog
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier public.subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_portfolio_projects INTEGER,
  max_job_applications_per_month INTEGER,
  includes_featured BOOLEAN NOT NULL DEFAULT FALSE,
  includes_priority_support BOOLEAN NOT NULL DEFAULT FALSE,
  badge_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.subscription_plans FOR SELECT USING (is_active = TRUE OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans_admin_write" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_subscription_plans_touch BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. User subscription history
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|active|cancelled|expired
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly|yearly
  amount_cents INTEGER NOT NULL DEFAULT 0,
  provider TEXT, -- stripe|paddle|manual (reserved)
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_own_read" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "subs_admin_write" ON public.user_subscriptions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE TRIGGER trg_user_subscriptions_touch BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Billing events (revenue ledger; admin-only)
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL, -- subscription|featured_listing|boost|sponsored_slot|commission|refund
  tier public.subscription_tier,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'recorded', -- recorded|paid|refunded|failed
  reference_id UUID,
  provider TEXT,
  provider_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.billing_events TO service_role;
GRANT SELECT ON public.billing_events TO authenticated;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_admin_read" ON public.billing_events FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "billing_admin_write" ON public.billing_events FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_billing_events_occurred ON public.billing_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_kind ON public.billing_events(kind);

-- 7. Seed plans catalog
INSERT INTO public.subscription_plans (tier, name, tagline, price_monthly_cents, price_yearly_cents, features, max_portfolio_projects, max_job_applications_per_month, includes_featured, includes_priority_support, badge_label, sort_order)
VALUES
  ('free','Free','Get started on the marketplace',0,0,'["Public profile","Up to 3 portfolio projects","10 job applications / month"]'::jsonb,3,10,FALSE,FALSE,NULL,1),
  ('pro','Pro','For working creators',1900,19000,'["Unlimited portfolio projects","Unlimited applications","Profile analytics","Pro badge"]'::jsonb,NULL,NULL,FALSE,FALSE,'Pro',2),
  ('elite','Elite','Maximum reach & priority',4900,49000,'["Everything in Pro","Featured placement","Sponsored slots","Priority support","Elite badge"]'::jsonb,NULL,NULL,TRUE,TRUE,'Elite',3)
ON CONFLICT (tier) DO NOTHING;

-- 8. Admin revenue summary view
CREATE OR REPLACE VIEW public.admin_revenue_summary AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  kind,
  count(*) AS events,
  sum(amount_cents) FILTER (WHERE status = 'paid') AS paid_cents,
  sum(amount_cents) FILTER (WHERE status = 'refunded') AS refunded_cents,
  sum(amount_cents) AS gross_cents
FROM public.billing_events
GROUP BY 1, 2;
GRANT SELECT ON public.admin_revenue_summary TO authenticated;
