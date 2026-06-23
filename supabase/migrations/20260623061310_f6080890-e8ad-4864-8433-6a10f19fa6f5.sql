
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'yshreyash1012@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (id, username, display_name)
SELECT id, 'admin', 'Admin' FROM auth.users WHERE email = 'yshreyash1012@gmail.com'
ON CONFLICT (id) DO UPDATE SET username = 'admin', display_name = COALESCE(public.profiles.display_name, 'Admin');

CREATE OR REPLACE FUNCTION public.grant_admin_if_designated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'yshreyash1012@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_designated_admin ON auth.users;
CREATE TRIGGER trg_grant_designated_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_if_designated();
