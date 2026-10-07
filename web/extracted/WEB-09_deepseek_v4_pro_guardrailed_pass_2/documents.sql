-- documents.sql
-- Multi-tenant documents table for Supabase/PostgreSQL
-- Security decisions:
--   - RLS enabled and forced; no USING (true) on user data
--   - Identity derived from auth.uid() only, never from request body
--   - tenant_id and owner_id are UUIDs (defense in depth against enumeration)
--   - Per-operation policies: SELECT, INSERT, UPDATE, DELETE

-- Extensions required by Supabase
create extension if not exists "uuid-ossp";

create table if not exists public.documents (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid not null,
    owner_id uuid not null default auth.uid(),
    title text not null check (char_length(title) between 1 and 500),
    content text not null default '',
    status text not null default 'draft'
        check (status in ('draft', 'published', 'archived')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for tenant-scoped queries and ownership lookups
create index if not exists idx_documents_tenant_id
    on public.documents (tenant_id);

create index if not exists idx_documents_owner_id
    on public.documents (owner_id);

create index if not exists idx_documents_tenant_owner
    on public.documents (tenant_id, owner_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_documents_set_updated_at
    before update on public.documents
    for each row
    execute function public.set_updated_at();

-- Row Level Security
alter table public.documents enable row level security;
alter table public.documents force row level security;

-- SELECT: Users can read documents they own within their tenant
create policy "documents_select_own"
    on public.documents
    for select
    using (
        owner_id = auth.uid()
        and tenant_id = (
            select tenant_id
            from public.tenant_memberships
            where user_id = auth.uid()
            limit 1
        )
    );

-- INSERT: Users can only create documents for their own tenant and as themselves
create policy "documents_insert_own"
    on public.documents
    for insert
    with check (
        owner_id = auth.uid()
        and tenant_id = (
            select tenant_id
            from public.tenant_memberships
            where user_id = auth.uid()
            limit 1
        )
    );

-- UPDATE: Users can only update documents they own within their tenant
create policy "documents_update_own"
    on public.documents
    for update
    using (
        owner_id = auth.uid()
        and tenant_id = (
            select tenant_id
            from public.tenant_memberships
            where user_id = auth.uid()
            limit 1
        )
    )
    with check (
        owner_id = auth.uid()
        and tenant_id = (
            select tenant_id
            from public.tenant_memberships
            where user_id = auth.uid()
            limit 1
        )
    );

-- DELETE: Users can only delete documents they own within their tenant
create policy "documents_delete_own"
    on public.documents
    for delete
    using (
        owner_id = auth.uid()
        and tenant_id = (
            select tenant_id
            from public.tenant_memberships
            where user_id = auth.uid()
            limit 1
        )
    );

-- Note: This schema assumes a tenant_memberships table exists with:
--   user_id uuid not null
--   tenant_id uuid not null
-- If it does not exist, create it first with its own RLS policies.