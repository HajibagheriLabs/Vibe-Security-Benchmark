// app/admin/users/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserList } from './user-list'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          // Server components cannot set cookies
        },
        remove() {
          // Server components cannot remove cookies
        },
      },
    }
  )

  // Verify session and admin role
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    redirect('/login')
  }

  // Check admin role from server-side database
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/unauthorized')
  }

  // Fetch all users with their profiles
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      created_at,
      last_sign_in_at
    `)
    .order('created_at', { ascending: false })

  if (usersError) {
    throw new Error('Failed to fetch users')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">System Users</h1>
      <UserList users={users} />
    </div>
  )
}