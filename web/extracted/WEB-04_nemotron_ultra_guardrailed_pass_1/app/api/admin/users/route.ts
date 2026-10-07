// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['user', 'admin', 'moderator']),
});

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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
            // Ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignore
          }
        },
      },
    }
  );

  // Verify authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch users with pagination
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  const { data: users, error, count } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, last_sign_in_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error({ event: 'api_admin_users_fetch_error', error: error.message });
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  return NextResponse.json({
    users: users || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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
            // Ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignore
          }
        },
      },
    }
  );

  // Verify authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userId, role } = parsed.data;

  // Prevent self-demotion
  if (userId === session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change own role' }, { status: 400 });
  }

  // Update user role using admin client
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });

  if (updateError) {
    console.error({ event: 'api_admin_update_role_error', userId, error: updateError.message });
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }

  // Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (profileError) {
    console.error({ event: 'api_admin_update_profile_error', userId, error: profileError.message });
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}