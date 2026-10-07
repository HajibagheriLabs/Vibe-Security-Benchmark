-- supabase/migrations/20240101000001_profiles_rls.sql
-- Security: RLS enabled and forced on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Only admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Prevent users from updating their own role
CREATE TRIGGER prevent_role_update
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_update_fn();

CREATE OR REPLACE FUNCTION prevent_role_update_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only allow role changes if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot update role' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;