-- migrations/000002_create_tenants.sql
-- Referenced by documents.tenant_id.
-- Security decisions:
--   * tenant_id is the verified JWT claim; users cannot self-assign tenancy.
--   * RLS enabled and forced; no USING (true).

CREATE TABLE public.tenants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_select_own
    ON public.tenants
    FOR SELECT
    USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- No INSERT/UPDATE/DELETE policies for tenants: tenant provisioning is an admin operation
-- performed via a service role or edge function, never by end users.
REVOKE ALL ON public.tenants FROM anon, authenticated;
GRANT SELECT ON public.tenants TO authenticated;