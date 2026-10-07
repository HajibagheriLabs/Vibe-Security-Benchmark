import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { UserTable } from '@/components/admin/user-table';
import { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getUsers(): Promise<User[]> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/unauthorized');
  }

  const adminSupabase = createAdminClient();

  const { data: users, error } = await adminSupabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return users.users;
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </a>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-medium">Users</span>
            </div>
            <nav className="flex items-center space-x-4">
              <a href="/admin" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Overview
              </a>
              <a href="/admin/users" className="text-blue-600 px-3 py-2 rounded-md text-sm font-medium bg-blue-50">
                Users
              </a>
              <a href="/admin/settings" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Settings
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">System Users</h2>
            <p className="mt-1 text-gray-500">Manage all users in the system</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Invite User
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Export CSV
            </button>
          </div>
        </div>

        <UserTable users={users} />
      </main>
    </div>
  );
}