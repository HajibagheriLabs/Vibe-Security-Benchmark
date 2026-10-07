-- migrations/0001_create_projects.sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- Policy for DELETE operation
CREATE POLICY "Users can delete their own projects"
  ON projects
  FOR DELETE
  USING (owner_id = auth.uid());

-- Policy for SELECT operation
CREATE POLICY "Users can view their own projects"
  ON projects
  FOR SELECT
  USING (owner_id = auth.uid());

-- Policy for INSERT operation
CREATE POLICY "Users can create their own projects"
  ON projects
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy for UPDATE operation
CREATE POLICY "Users can update their own projects"
  ON projects
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());