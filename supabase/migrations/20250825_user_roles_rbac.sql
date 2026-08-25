-- Migration: complete RBAC for admin/vendedor users
-- Admin users created from the panel get an internal email like username@usa.local

-- Add username column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Ensure role only accepts admin/vendedor
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'vendedor'));

-- Existing users become admins (safe for the initial admin; adjust later via Users page)
UPDATE public.profiles
SET
  username = COALESCE(username, split_part(email, '@', 1)),
  role = 'admin'
WHERE role IS NULL OR role = '' OR role = 'vendedor';

-- Helper function to avoid recursive RLS checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;

CREATE POLICY profiles_select_self ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_admin_select_all ON public.profiles
FOR SELECT USING (public.is_admin());

CREATE POLICY profiles_admin_insert ON public.profiles
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY profiles_admin_update ON public.profiles
FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trigger: create/update profile on auth.users insert, reading metadata from the frontend
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(public.profiles.role, EXCLUDED.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
