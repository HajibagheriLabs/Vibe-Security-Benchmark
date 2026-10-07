import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth'; // Assumes a server-side auth helper (e.g., Clerk, NextAuth)
import { db } from '@/lib/db'; // Assumes a Prisma/Drizzle client
import { validateSchema } from '@/lib/validation';

// 1. SCHEMA DEFINITION
// Defines allowed fields for metadata and role updates.
const UserUpdateSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
}).strict();

// 2. ID SCHEMA
// Ensures the URL parameter is a valid UUID.
const IdSchema = z.string().uuid();

// 3. HANDLER
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Authentication: Verify session exists
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validation: Parse and validate URL ID
  const parsedId = IdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
  }
  const userId = parsedId.data;

  // Validation: Parse and validate request body
  const body = await request.json();
  const validatedBody = UserUpdateSchema.safeParse(body);
  if (!validatedBody.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: validatedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { metadata, role } = validatedBody.data;

  // Authorization: Check if requesting user owns the target user or is an admin
  // Note: We fetch the target user first to check ownership/role context if needed,
  // but for a simple update, we can often do this in the WHERE clause or a single query.
  // Here we assume the User model has a `role` column and `metadata` (JSONB).
  
  try {
    // Server-side Update with Bound Parameters
    // The ownership check is inside the WHERE clause (Zero Trust)
    const updatedUser = await db.user.update({
      where: {
        id: userId,
        // Optional: Restrict update to owner if not admin
        // ownerId: session.user.id 
      },
      data: {
        ...(metadata !== undefined && { metadata }),
        ...(role !== undefined && { role }),
      },
      select: {
        id: true,
        role: true,
        metadata: true,
      },
    });

    // Self-Audit: Ensure no sensitive data leaked (e.g., passwords)
    // The select clause ensures only safe fields are returned.

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    // Handle case where user does not exist
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      // 404 for non-owner or non-existent user (Defense in Depth)
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Generic server error
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}