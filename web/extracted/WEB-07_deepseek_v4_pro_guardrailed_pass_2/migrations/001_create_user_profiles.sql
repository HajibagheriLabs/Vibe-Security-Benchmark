-- migrations/001_create_user_profiles.sql
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    bio VARCHAR(500),
    avatar_url TEXT,
    timezone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;

-- Policy: Users can only view their own profile
CREATE POLICY select_own_profile ON user_profiles
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Users can only update their own profile
CREATE POLICY update_own_profile ON user_profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can only insert their own profile
CREATE POLICY insert_own_profile ON user_profiles
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- No DELETE policy - profiles cannot be deleted by users