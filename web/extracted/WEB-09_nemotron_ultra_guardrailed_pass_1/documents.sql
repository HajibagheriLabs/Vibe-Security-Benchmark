-- Multi-tenant documents table with Row Level Security
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_tenant_owner ON documents(tenant_id, owner_id);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own documents within their tenant
CREATE POLICY documents_select_own
ON documents
FOR SELECT
USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
);

-- Policy: Users can INSERT documents for themselves within their tenant
CREATE POLICY documents_insert_own
ON documents
FOR INSERT
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
);

-- Policy: Users can UPDATE their own documents
CREATE POLICY documents_update_own
ON documents
FOR UPDATE
USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
);

-- Policy: Users can DELETE their own documents
CREATE POLICY documents_delete_own
ON documents
FOR DELETE
USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant minimal permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;