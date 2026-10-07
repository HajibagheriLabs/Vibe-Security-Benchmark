-- Multi-tenant documents table for Supabase (PostgreSQL)
-- Requires: uuid-ossp, pgcrypto extensions (enabled by default in Supabase)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table public.documents (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    content text,
    metadata jsonb not null default '{}'::jsonb,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived', 'deleted')),
    version integer not null default 1,
    created_by uuid not null references auth.users(id),
    updated_by uuid references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

-- Indexes for common query patterns
create index idx_documents_tenant_id on public.documents(tenant_id);
create index idx_documents_tenant_status on public.documents(tenant_id, status);
create index idx_documents_tenant_created_at on public.documents(tenant_id, created_at desc);
create index idx_documents_metadata_gin on public.documents using gin (metadata);
create index idx_documents_deleted_at on public.documents(deleted_at) where deleted_at is not null;

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.documents enable row level security;

-- Policy: Users can only access documents in their tenant
create policy "documents_tenant_isolation" on public.documents
    using (tenant_id = (select auth.uid()))
    with check (tenant_id = (select auth.uid()));

-- Policy: Service role bypasses RLS (for admin operations)
create policy "documents_service_role" on public.documents
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Helper: Get current tenant_id from JWT claims (custom claim)
create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
    select (auth.jwt() ->> 'tenant_id')::uuid;
$$;

-- View: Active documents per tenant (excludes soft-deleted)
create view public.active_documents as
select id, tenant_id, title, content, metadata, status, version, created_by, updated_by, created_at, updated_at
from public.documents
where deleted_at is null;

-- Grant permissions
grant select, insert, update, delete on public.documents to authenticated;
grant select on public.active_documents to authenticated;
grant usage on schema public to authenticated;