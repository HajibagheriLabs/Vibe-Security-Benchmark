-- Security: RLS policies for documents table
-- Run this migration to secure the documents table

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Users can only select their own documents
CREATE POLICY "Users can view own documents"
ON documents
FOR SELECT
USING (owner_id = auth.uid());

-- Users can only insert their own documents
CREATE POLICY "Users can insert own documents"
ON documents
FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Users can only update their own documents
CREATE POLICY "Users can update own documents"
ON documents
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Users can only delete their own documents
CREATE POLICY "Users can delete own documents"
ON documents
FOR DELETE
USING (owner_id = auth.uid());