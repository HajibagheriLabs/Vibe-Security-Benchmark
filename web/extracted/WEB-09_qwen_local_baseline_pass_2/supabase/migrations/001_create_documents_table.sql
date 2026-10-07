-- Filename: supabase/migrations/001_create_documents_table.sql

-- 1. Create the documents table with multi-tenant support
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    metadata jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id)
);

-- 2. Add Row Level Security (RLS) policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see documents belonging to their tenant
CREATE POLICY "Users can view own tenant documents"
    ON public.documents
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenants WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert documents into their tenant
CREATE POLICY "Users can insert own tenant documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenants WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
    ON public.documents
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenants WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenants WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
    ON public.documents
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenants WHERE user_id = auth.uid()
        )
    );

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at);

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

-- 5. Create a policy for service role (optional, if using service role key)
CREATE POLICY "Service role can access all documents"
    ON public.documents
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');