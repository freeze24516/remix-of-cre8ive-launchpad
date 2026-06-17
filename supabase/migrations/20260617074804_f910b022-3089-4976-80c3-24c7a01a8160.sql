
-- Trigger to fire handle_new_user on signup (was missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profile + default role for any existing auth users missing one
INSERT INTO public.profiles (id, username, display_name, kind)
SELECT
  u.id,
  'user' || substr(u.id::text, 1, 8),
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'User'),
  'client'::public.user_kind
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'user'
WHERE r.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
