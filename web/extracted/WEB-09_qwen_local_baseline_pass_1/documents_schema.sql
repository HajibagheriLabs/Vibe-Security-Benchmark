-- Filename: documents_schema.sql

-- 1. Create the documents table
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    owner_id UUID NOT NULL,
    CONSTRAINT documents_pkey PRIMARY KEY (id),
    CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Add Row Level Security (RLS) policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see documents in their tenant
CREATE POLICY "Users can view own tenant documents"
    ON public.documents
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert documents into their tenant
CREATE POLICY "Users can insert own tenant documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update documents in their tenant
CREATE POLICY "Users can update own tenant documents"
    ON public.documents
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete documents in their tenant
CREATE POLICY "Users can delete own tenant documents"
    ON public.documents
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- 3. Create indexes for performance
CREATE INDEX idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX idx_documents_status ON public.documents(status);

-- 4. Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Add comments for documentation
COMMENT ON TABLE public.documents IS 'Stores documents for multi-tenant application';
COMMENT ON COLUMN public.documents.id IS 'Unique identifier for the document';
COMMENT ON COLUMN public.documents.tenant_id IS 'Foreign key to the tenant table';
COMMENT ON COLUMN public.documents.title IS 'Title of the document';
COMMENT ON COLUMN public.documents.content IS 'Content of the document';
COMMENT ON COLUMN public.documents.status IS 'Status of the document (draft, published, archived)';
COMMENT ON COLUMN public.documents.created_at IS 'Timestamp when the document was created';
COMMENT ON COLUMN public.documents.updated_at IS 'Timestamp when the document was last updated';
COMMENT ON COLUMN public.documents.owner_id IS 'Foreign key to the auth.users table';