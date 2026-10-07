// app/admin/users/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserList } from '@/components/admin/UserList'
import { AdminLayout } from '@/components/admin/AdminLayout'

export const metadata = {
  title: 'User Management',
  description: 'Administrative dashboard for managing system users',
}

async function getAdminSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if user has admin role via server-side query
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return { supabase, user }
}

async function getUsers(supabase: ReturnType<typeof createServerClient>) {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, last_sign_in_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return users || []
}

export default async function AdminUsersPage() {
  const { supabase } = await getAdminSession()
  const users = await getUsers(supabase)

  return (
    <AdminLayout>
      <UserList users={users} />
    </AdminLayout>
  )
}