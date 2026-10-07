// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeLogValue } from '@/lib/security';

// Schema validation for update payload
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(),
}).strict();

// Role hierarchy for authorization checks
const ROLE_HIERARCHY = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
} as const;

type Role = keyof typeof ROLE_HIERARCHY;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      max: 20,
      windowMs: 60 * 1000, // 20 requests per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate target user ID format (UUID)
    const targetUserId = params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: z.infer<typeof updateUserSchema>;
    try {
      const rawBody = await request.json();
      body = updateUserSchema.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Get current user's role from server-side session
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get target user (with ownership check in WHERE clause)
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        // Non-admin users can only update their own profile
        ...(currentUser.role !== 'ADMIN' ? { id: session.user.id } : {}),
      },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      // Return 404 to prevent user enumeration
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Authorization for role changes
    if (body.role) {
      const currentUserRoleLevel = ROLE_HIERARCHY[currentUser.role as Role];
      const targetUserRoleLevel = ROLE_HIERARCHY[targetUser.role as Role];
      const newRoleLevel = ROLE_HIERARCHY[body.role];

      // Only admins can change roles
      if (currentUser.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Admins cannot assign roles higher than their own
      if (newRoleLevel > currentUserRoleLevel) {
        return NextResponse.json(
          { error: 'Cannot assign role higher than your own' },
          { status: 403 }
        );
      }

      // Admins cannot modify users with equal or higher roles
      if (targetUserRoleLevel >= currentUserRoleLevel && targetUser.id !== currentUser.id) {
        return NextResponse.json(
          { error: 'Cannot modify user with equal or higher role' },
          { status: 403 }
        );
      }

      // Prevent self-demotion if last admin (optional safeguard)
      if (targetUser.id === currentUser.id && body.role !== 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN' },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot demote the last admin' },
            { status: 403 }
          );
        }
      }
    }

    // Build update data (only include fields that are present)
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.role !== undefined) updateData.role = body.role;

    // Perform the update with ownership check in WHERE clause
    const updatedUser = await prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        metadata: true,
        updatedAt: true,
      },
    });

    // Log the update (sanitized)
    console.log(JSON.stringify({
      event: 'user_updated',
      actorId: sanitizeLogValue(currentUser.id),
      targetUserId: sanitizeLogValue(targetUserId),
      updatedFields: Object.keys(updateData).map(sanitizeLogValue),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    // Log error without sensitive data
    console.error(JSON.stringify({
      event: 'user_update_error',
      error: error instanceof Error ? sanitizeLogValue(error.message) : 'Unknown error',
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}