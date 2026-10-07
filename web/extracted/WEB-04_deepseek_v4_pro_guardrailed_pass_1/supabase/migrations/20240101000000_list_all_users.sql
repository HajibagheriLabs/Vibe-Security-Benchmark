-- supabase/migrations/20240101000000_list_all_users.sql
-- Security: RPC enforces admin check inside PostgreSQL, preventing privilege escalation
CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin from profiles table
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(p.role, 'user') as role
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- Revoke direct execution from public, grant only to authenticated users
REVOKE ALL ON FUNCTION public.list_all_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_all_users() TO authenticated;