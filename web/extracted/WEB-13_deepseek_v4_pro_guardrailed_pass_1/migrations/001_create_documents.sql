-- Security: Database schema with RLS for documents table
-- migrations/001_create_documents.sql

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security: Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Security: Users can only select their own documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (owner_id = auth.uid());

-- Security: Users can only insert their own documents
CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Security: Users can only update their own documents
CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Security: Users can only delete their own documents
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (owner_id = auth.uid());

-- Security: No policy for other operations means they are denied by default