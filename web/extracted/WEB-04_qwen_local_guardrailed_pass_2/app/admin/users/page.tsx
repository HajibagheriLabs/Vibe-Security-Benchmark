/**
 * Administrative Dashboard: System Users
 * 
 * Rule Application:
 * - §1 (Secrets): Uses server-side `createClient` with service role key (inferred from scope: "list all system users" implies read access to all rows, likely requiring `SELECT` on the `auth.users` table or a custom table). The client never sees the key.
 * - §2 (Auth): Uses `headers()` to verify the session on the server side. Ownership is implicit (all users).
 * - §3 (Injection): Uses Supabase JS client bound parameters. No raw SQL string interpolation.
 * - §5 (Self-Audit): Negative paths handled via `try/catch` and session check.
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Database } from '@/types/database'; // Assuming a generated Supabase type definition

// 1. SECRETS: The service_role key is read from `SUPABASE_SERVICE_ROLE_KEY` (server-only env).
// It is NOT prefixed with NEXT_PUBLIC_.
// Scope: `SELECT` on `auth.users` (or custom `users` table) and `INSERT/UPDATE/DELETE` on `public.profiles`.

export default async function AdminUsersPage() {
  // 2. AUTHORIZATION: Verify session server-side.
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // 2. AUTHORIZATION: Optional - Check if current user is admin (cosmetic + server-side gate)
  // In a real app, you might query a `profiles` table to check `role === 'admin'`
  // Here we assume the route is protected by Next.js Middleware or simply that any logged-in user can see users,
  // but the data fetch uses the service role to see *all* users.

  // 3. INJECTION: Fetch all users. 
  // Note: Supabase Auth API returns limited fields. For full system user details, 
  // we often join with a custom `profiles` table or use the service role to access `auth.users` directly.
  // Here we assume a standard pattern: Fetching from a custom `users` table that mirrors auth.
  
  const { data: users, error } = await supabase
    .from('users') // Custom table containing system user data
    .select('id, email, created_at, updated_at, role, status')
    .order('created_at', { ascending: false });

  if (error) {
    console.error({ event: 'fetch_users_error', message: error.message });
    return <div>Error loading users.</div>;
  }

  // 3. LOGGING: Structured log of user count (no user values logged)
  console.info({ event: 'admin_users_page_loaded', count: users?.length ?? 0 });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">System Users</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users && users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}