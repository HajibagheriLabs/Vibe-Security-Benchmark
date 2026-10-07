// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// Server-side admin client with service role key
// ONLY use in server-side code (API routes, server actions, server components)
// NEVER expose this to the client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Admin-only user management functions
export async function adminGetAllUsers() {
  const supabase = createAdminClient();
  
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error({ event: 'admin_list_users_error', error: error.message });
    throw error;
  }

  return users.users;
}

export async function adminUpdateUserRole(userId: string, role: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  
  if (error) {
    console.error({ event: 'admin_update_user_role_error', userId, error: error.message });
    throw error;
  }

  // Also update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
    
  if (profileError) {
    console.error({ event: 'admin_update_profile_role_error', userId, error: profileError.message });
    throw profileError;
  }

  return data;
}