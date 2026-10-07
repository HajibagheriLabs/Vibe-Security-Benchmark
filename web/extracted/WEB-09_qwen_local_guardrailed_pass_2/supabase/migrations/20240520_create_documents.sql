-- Filename: supabase/migrations/20240520_create_documents.sql

-- 1. Enable RLS and Force it
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

-- 2. Policies

-- Select: User can read if they own the document AND their session's tenant matches.
-- We assume the session JWT contains a 'tenant_id' claim, or we join to a user_tenant table.
-- Here, we use the simpler approach: the document's tenant_id must match the user's known tenant.
-- For robustness, we assume a helper function or a join. 
-- Strategy: User can read if owner_id matches session user AND tenant_id is in user's tenants.
-- To keep it self-contained in SQL without extra tables, we assume the session JWT has 'app_metadata' 
-- or we rely on a specific 'user_tenants' table. 
-- Let's use a common pattern: User belongs to tenants.
-- Policy 1: Owner can read/write their own docs.
CREATE POLICY "Users can view own documents"
    ON public.documents
    FOR SELECT
    USING (
        owner_id = auth.uid()
        AND tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- Policy 2: Owner can insert.
CREATE POLICY "Users can insert own documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (
        owner_id = auth.uid()
        AND tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- Policy 3: Owner can update.
CREATE POLICY "Users can update own documents"
    ON public.documents
    FOR UPDATE
    USING (
        owner_id = auth.uid()
        AND tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        owner_id = auth.uid()
        AND tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- Policy 4: Owner can delete.
CREATE POLICY "Users can delete own documents"
    ON public.documents
    FOR DELETE
    USING (
        owner_id = auth.uid()
        AND tenant_id IN (
            SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
        )
    );

-- 3. Trigger for updated_at
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