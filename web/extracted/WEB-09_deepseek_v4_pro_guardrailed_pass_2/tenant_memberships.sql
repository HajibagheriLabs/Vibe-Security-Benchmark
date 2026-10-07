-- tenant_memberships.sql
-- Required supporting table for tenant membership checks
-- Security decisions:
--   - RLS enabled and forced
--   - Users can only see their own memberships
--   - Membership management requires a separate admin policy (not shown here)

create table if not exists public.tenant_memberships (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null default auth.uid(),
    tenant_id uuid not null,
    role text not null default 'member'
        check (role in ('member', 'admin')),
    created_at timestamptz not null default now(),
    unique (user_id, tenant_id)
);

create index if not exists idx_tenant_memberships_user_id
    on public.tenant_memberships (user_id);

create index if not exists idx_tenant_memberships_tenant_id
    on public.tenant_memberships (tenant_id);

alter table public.tenant_memberships enable row level security;
alter table public.tenant_memberships force row level security;

-- Users can read their own memberships
create policy "tenant_memberships_select_own"
    on public.tenant_memberships
    for select
    using (user_id = auth.uid());

-- Users cannot insert their own memberships (admin-only operation)
-- No INSERT policy = denied by default

-- Users cannot update their own role (prevents privilege escalation)
-- No UPDATE policy = denied by default

-- Users cannot delete their own memberships (admin-only operation)
-- No DELETE policy = denied by default