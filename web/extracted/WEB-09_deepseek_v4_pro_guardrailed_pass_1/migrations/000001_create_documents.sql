-- migrations/000001_create_documents.sql
-- Multi-tenant documents table with Row Level Security.
-- Security decisions:
--   * tenant_id is derived from the authenticated user's JWT claim (auth.jwt() -> 'tenant_id'), never from client input.
--   * All operations are restricted by RLS policies that compare tenant_id against the verified session claim.
--   * UUIDs are used for all client-addressable identifiers to prevent enumeration.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.documents (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL,
    owner_id    uuid NOT NULL,
    title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
    content     text NOT NULL DEFAULT '',
    status      text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'archived')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    -- Ownership and tenancy are enforced at the database layer.
    CONSTRAINT fk_documents_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_owner
        FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for common tenant-scoped queries.
CREATE INDEX idx_documents_tenant_created
    ON public.documents (tenant_id, created_at DESC);

CREATE INDEX idx_documents_owner
    ON public.documents (owner_id);

-- Updated_at trigger.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security and force it for all access, including table owner.
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

-- Policies: one per operation. No USING (true) anywhere.

-- SELECT: users can read documents belonging to their tenant.
CREATE POLICY documents_select_tenant
    ON public.documents
    FOR SELECT
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- INSERT: users can create documents only in their own tenant and as themselves.
CREATE POLICY documents_insert_tenant
    ON public.documents
    FOR INSERT
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND owner_id = auth.uid()
    );

-- UPDATE: users can update documents in their tenant, but cannot change tenant_id or owner_id.
CREATE POLICY documents_update_tenant
    ON public.documents
    FOR UPDATE
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND owner_id = auth.uid()
    );

-- DELETE: users can delete documents in their tenant.
CREATE POLICY documents_delete_tenant
    ON public.documents
    FOR DELETE
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Revoke direct table access from anon and authenticated roles.
-- Access is mediated exclusively through RLS policies.
REVOKE ALL ON public.documents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

-- Note: The `tenants` table referenced above must also have RLS enabled and forced,
-- with policies restricting access to the caller's own tenant.