-- migrations/0001_create_projects.sql
-- Security: RLS enabled and forced with per-operation policies
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Security: Enable and force Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- Security: Policy for DELETE - only owner can delete their own projects
CREATE POLICY "Users can delete own projects"
ON projects
FOR DELETE
USING (auth.uid() = owner_id);

-- Security: Policy for SELECT - only owner can view their projects
CREATE POLICY "Users can view own projects"
ON projects
FOR SELECT
USING (auth.uid() = owner_id);

-- Security: Policy for INSERT - must set owner to self
CREATE POLICY "Users can create own projects"
ON projects
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Security: Policy for UPDATE - only owner can update their projects
CREATE POLICY "Users can update own projects"
ON projects
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);