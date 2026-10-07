-- schema.sql
-- Multi-tenant documents table for Supabase (PostgreSQL)

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create the documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    file_path TEXT,
    file_type TEXT,
    file_size BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_created_at ON public.documents(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_title ON public.documents(tenant_id, title);
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin ON public.documents USING GIN (metadata);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trg_documents_set_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies for multi-tenant isolation

-- Policy: Users can view documents belonging to their tenant
CREATE POLICY "tenant_select_own_documents" ON public.documents
    FOR SELECT
    USING (tenant_id = auth.uid());

-- Policy: Users can insert documents for their own tenant
CREATE POLICY "tenant_insert_own_documents" ON public.documents
    FOR INSERT
    WITH CHECK (tenant_id = auth.uid());

-- Policy: Users can update documents belonging to their tenant
CREATE POLICY "tenant_update_own_documents" ON public.documents
    FOR UPDATE
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- Policy: Users can delete documents belonging to their tenant
CREATE POLICY "tenant_delete_own_documents" ON public.documents
    FOR DELETE
    USING (tenant_id = auth.uid());

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;