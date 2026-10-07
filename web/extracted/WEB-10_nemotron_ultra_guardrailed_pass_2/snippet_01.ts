import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateUserSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: targetUserId } = await params;

  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', targetUserId)
    .single();

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isSelf = sessionUser.id === targetUserId;
  const isAdmin = sessionUser.user_metadata?.role === 'admin';

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = updateUserSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 });
  }

  const { metadata, role } = parseResult.data;

  if (role && !isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (metadata !== undefined) {
    updates.user_metadata = metadata;
  }
  if (role !== undefined) {
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', targetUserId)
    .select('id, email, user_metadata, role, created_at, updated_at')
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }

  return NextResponse.json({ user: updatedUser });
}