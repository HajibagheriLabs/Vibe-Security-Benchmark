import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UsersTable } from './users-table'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  // Fetch all users from auth.users via admin API
  const { data: users, error } = await supabase.auth.admin.listUsers()

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">System Users</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          Error loading users: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">System Users</h1>
        <span className="text-sm text-gray-500">
          {users.users.length} total user{users.users.length !== 1 ? 's' : ''}
        </span>
      </div>
      <UsersTable users={users.users} />
    </div>
  )
}