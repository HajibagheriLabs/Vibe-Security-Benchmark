-- prisma/migrations/20240101000000_add_user_management/migration.sql
-- User table with RLS policies

-- Enable RLS on users table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON "User" FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own metadata (but not role)
CREATE POLICY "Users can update own metadata"
ON "User" FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM "User" WHERE id = auth.uid())
);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
ON "User" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- Policy: Admins can update users
CREATE POLICY "Admins can update users"
ON "User" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid() AND role = 'ADMIN'
  )
);