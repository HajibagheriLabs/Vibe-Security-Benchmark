// app/admin/users/UserList.tsx
import { Suspense } from 'react';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UserTable } from './UserTable';
import { UserTableSkeleton } from './UserTableSkeleton';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server component - ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Server component - ignore
          }
        },
      },
    }
  );
}

async function fetchUsers() {
  const supabase = await getSupabase();
  
  // Verify admin session again for defense in depth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') return [];

  // Fetch users with pagination - using bound parameters
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, last_sign_in_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error({ event: 'fetch_users_error', error: error.message });
    return [];
  }

  return users || [];
}

export async function UserList() {
  const users = await fetchUsers();
  return <UserTable users={users} />;
}

export default async function UserListWrapper() {
  return (
    <Suspense fallback={<UserTableSkeleton />}>
      <UserList />
    </Suspense>
  );
}