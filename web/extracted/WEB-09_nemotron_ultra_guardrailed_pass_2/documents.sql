-- Multi-tenant documents table with Row Level Security
-- Requires: pgcrypto extension for gen_random_uuid()

-- Enable required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Enable and force Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can read documents in their tenant
CREATE POLICY documents_select_tenant
    ON documents
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- INSERT: Users can create documents in their tenant, owner_id bound to session user
CREATE POLICY documents_insert_tenant
    ON documents
    FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND owner_id = auth.uid()
    );

-- UPDATE: Users can update their own documents within their tenant
CREATE POLICY documents_update_own
    ON documents
    FOR UPDATE
    USING (owner_id = auth.uid() AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (owner_id = auth.uid() AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- DELETE: Users can delete their own documents within their tenant
CREATE POLICY documents_delete_own
    ON documents
    FOR DELETE
    USING (owner_id = auth.uid() AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();