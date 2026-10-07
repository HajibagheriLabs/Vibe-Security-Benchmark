// app/admin/users/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserTable } from './user-table';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const supabase = createServerComponentClient({ cookies });

  // Verify session and admin role server-side
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Check admin role from server-side database, never from client claims
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all users - this requires a server-side service role or a secure RPC
  // Using a database function that enforces admin check inside PostgreSQL
  const { data: users, error } = await supabase.rpc('list_all_users');

  if (error) {
    console.error('Error fetching users:', error.message);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">System Users</h1>
        <p className="text-red-600">Failed to load users. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">System Users</h1>
      <UserTable users={users || []} />
    </div>
  );
}