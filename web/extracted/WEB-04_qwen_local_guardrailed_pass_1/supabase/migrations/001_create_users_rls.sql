-- Rule 2: Enable RLS and Force RLS on the custom users table (if separate from auth.users)
-- Or apply to auth.users if using a view. Here we assume a public.users table that mirrors auth.users.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    last_sign_in_at TIMESTAMPTZ
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Rule 2: No USING (true). Bind to session.
-- Policy: Admins can see all users
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policy: Users can see themselves
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
    auth.uid() = id
);