-- Run this in your Supabase SQL editor to set up the required tables

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('admin', 'user', 'moderator')),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: Admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admins can update all profiles
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Users can update their own profile (but not role/status)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  );

-- Trigger to create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update last_sign_in_at on auth
create or replace function public.handle_user_sign_in()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set last_sign_in_at = now()
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_sign_in
  after update of last_sign_in_at on auth.users
  for each row execute procedure public.handle_user_sign_in();