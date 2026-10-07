-- migrations/001_create_users_table.sql
-- Security: RLS enabled and forced on user data table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Security: Users can only read their own data
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = auth.uid());

-- Security: Users can only update their own data
-- WITH CHECK ensures the updated row still belongs to the user
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Security: No INSERT policy means users cannot insert rows directly
-- Security: No DELETE policy means users cannot delete rows directly