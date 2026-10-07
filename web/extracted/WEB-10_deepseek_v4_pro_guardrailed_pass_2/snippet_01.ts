// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeForLog } from '@/lib/log-sanitizer';

// Validation schema for user metadata updates
const updateUserSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  role: z.enum(['user', 'moderator', 'admin']).optional(),
}).strict();

// Allowlist for sortable/filterable fields (defense in depth)
const ALLOWED_ROLES = new Set(['user', 'moderator', 'admin']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 20,
      windowMs: 60 * 1000, // 1 minute
    });
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Authentication
    const supabase = createClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate target user ID format (UUID)
    const targetUserId = params.id;
    if (!targetUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: z.infer<typeof updateUserSchema>;
    try {
      body = updateUserSchema.parse(await request.json());
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Check if user exists and get current role
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetUser) {
      // Return 404 to prevent user enumeration
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Authorization: Get current user's role from server-side
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUserRole = currentUserProfile.role;
    const isSelfUpdate = currentUser.id === targetUserId;
    const isAdmin = currentUserRole === 'admin';

    // Authorization rules:
    // 1. Users can update their own metadata (but not role)
    // 2. Only admins can update other users' metadata
    // 3. Only admins can change roles
    if (!isSelfUpdate && !isAdmin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update object with only allowed fields
    const updateData: Record<string, unknown> = {};
    
    if (body.fullName !== undefined) {
      updateData.full_name = body.fullName;
    }
    
    if (body.avatarUrl !== undefined) {
      updateData.avatar_url = body.avatarUrl;
    }
    
    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata;
    }

    // Role changes require admin privileges
    if (body.role !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      
      // Prevent admins from changing their own role (prevents lockout)
      if (isSelfUpdate && body.role !== currentUserRole) {
        return NextResponse.json(
          { error: 'Cannot change your own role' },
          { status: 403 }
        );
      }
      
      updateData.role = body.role;
    }

    // Perform the update with ownership check in WHERE clause
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)
      .select('id, full_name, avatar_url, metadata, role, updated_at')
      .single();

    if (updateError) {
      console.error('Update error:', sanitizeForLog(updateError.message));
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log the action with sanitized values
    console.log(JSON.stringify({
      event: 'user_update',
      actorId: currentUser.id,
      targetId: targetUserId,
      fields: Object.keys(updateData),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      user: updatedUser,
    });

  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? sanitizeForLog(error.message) : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}