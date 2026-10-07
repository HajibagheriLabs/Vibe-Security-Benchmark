import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UsersTable } from '@/components/admin/users-table'
import { UsersToolbar } from '@/components/admin/users-toolbar'

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
    redirect('/dashboard')
  }

  // Fetch all users with their profiles
  const { data: users, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      email,
      full_name,
      role,
      status,
      created_at,
      last_sign_in_at,
      avatar_url
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to load users. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          System Users
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage all user accounts and their permissions across the system.
        </p>
      </div>

      <UsersToolbar totalUsers={users?.length ?? 0} />
      <UsersTable users={users ?? []} />
    </div>
  )
}