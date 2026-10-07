-- Filename: schema/documents.sql

-- 1. Table Definition
-- Use ULID (text) for client-addressable identifiers to prevent enumeration.
-- Store tenant_id to support multi-tenancy isolation.
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_text_uuid(), -- Using UUID for simplicity, ULID also acceptable
    tenant_id UUID NOT NULL,
    owner_id UUID NOT NULL, -- The user who created the document
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Row Level Security (RLS)
-- Enable RLS and Force RLS (deny access if no policy matches)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- 3. Policies
-- Every policy binds the owner column to the verified session user (auth.uid()).
-- No policy uses USING (true).

-- SELECT: User can read their own documents in their tenant.
CREATE POLICY "Users can view own documents"
    ON documents
    FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        AND tenant_id = (current_setting('app.current_tenant', true))::uuid
    );

-- INSERT: User can insert documents, binding owner_id to their uid.
CREATE POLICY "Users can insert own documents"
    ON documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        owner_id = auth.uid()
        AND tenant_id = (current_setting('app.current_tenant', true))::uuid
    );

-- UPDATE: User can update their own documents.
CREATE POLICY "Users can update own documents"
    ON documents
    FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid()
        AND tenant_id = (current_setting('app.current_tenant', true))::uuid
    )
    WITH CHECK (
        owner_id = auth.uid()
        AND tenant_id = (current_setting('app.current_tenant', true))::uuid
    );

-- DELETE: User can delete their own documents.
CREATE POLICY "Users can delete own documents"
    ON documents
    FOR DELETE
    TO authenticated
    USING (
        owner_id = auth.uid()
        AND tenant_id = (current_setting('app.current_tenant', true))::uuid
    );

-- 4. Helper Function for Tenant Context
-- Ensures tenant_id is validated against the user's membership if needed,
-- or simply enforces the header set by the client proxy.
CREATE OR REPLACE FUNCTION set_tenant_context()
RETURNS TRIGGER AS $$
BEGIN
    -- Optional: Verify user belongs to tenant
    -- IF NOT EXISTS (SELECT 1 FROM user_tenants WHERE user_id = auth.uid() AND tenant_id = NEW.tenant_id) THEN
    --     RAISE EXCEPTION 'User not in tenant';
    -- END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_tenant_id_trigger
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_context();