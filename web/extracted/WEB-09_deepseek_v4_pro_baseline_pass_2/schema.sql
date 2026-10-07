-- schema.sql
-- Multi-tenant documents table for Supabase (PostgreSQL)

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;

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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT title_not_empty CHECK (length(title) > 0)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_created ON public.documents(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_archived ON public.documents(tenant_id, is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin ON public.documents USING GIN (metadata);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_documents_updated_at();

-- Row Level Security Policies

-- Policy: Users can view their own documents (including soft-deleted for recovery)
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
    ON public.documents
    FOR SELECT
    USING (auth.uid() = tenant_id);

-- Policy: Users can insert their own documents
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (auth.uid() = tenant_id);

-- Policy: Users can update their own documents
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
    ON public.documents
    FOR UPDATE
    USING (auth.uid() = tenant_id)
    WITH CHECK (auth.uid() = tenant_id);

-- Policy: Users can delete their own documents (soft delete recommended)
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents"
    ON public.documents
    FOR DELETE
    USING (auth.uid() = tenant_id);

-- Optional: Service role bypass (Supabase service_role key bypasses RLS automatically)
-- No additional policy needed for service_role

-- Comments for documentation
COMMENT ON TABLE public.documents IS 'Multi-tenant documents table with RLS enforced tenant isolation';
COMMENT ON COLUMN public.documents.tenant_id IS 'Foreign key to auth.users, identifies the owning tenant';
COMMENT ON COLUMN public.documents.metadata IS 'Flexible JSONB metadata for document-specific attributes';
COMMENT ON COLUMN public.documents.deleted_at IS 'Soft delete timestamp; NULL means active document';