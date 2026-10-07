-- migrations/001_create_files_table.sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at DESC);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY files_select_own ON files
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY files_insert_own ON files
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY files_delete_own ON files
  FOR DELETE USING (user_id = auth.uid());