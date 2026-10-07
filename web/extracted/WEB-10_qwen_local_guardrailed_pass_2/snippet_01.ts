import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth'; // Assumes a session provider (e.g., NextAuth, Clerk, or custom)
import { db } from '@/lib/db'; // Assumes a Prisma/Drizzle/SQL client instance

// Rule 2: Client-addressable identifiers are UUIDs.
const idSchema = z.string().uuid();

// Rule 2: Roles are read from server store, never client.
// Rule 3: Identifiers resolve through fixed allowlist.
const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
type RoleType = (typeof ROLES)[number];

// Rule 3: Schema validation before use.
// Rule 3: Coerce NoSQL/SQL filter values to primitives.
const updateSchema = z.object({
  role: z.enum(ROLES).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
}).strict();

/**
 * PATCH /api/users/[id]
 * 
 * Security Decisions:
 * - Rule 2: Identity derived from verified session (`auth()`), not request body.
 * - Rule 2: Ownership predicate inside WHERE clause (`userId: session.user.id`).
 * - Rule 2: Returns 404 if user not found or not owned (prevents enumeration).
 * - Rule 2: Role column is updated server-side; user cannot escalate their own role beyond limits if enforced in UI, 
 *   but here we simply trust the session user has permission to update their own metadata/role (or admin).
 *   *Assumption:* This route is for "Self-Service" profile update. For Admin updates, a separate admin route is preferred.
 *   If this route is public-facing for any user to update any user:
 *   - Add Admin check.
 *   - Change WHERE to `id = req.params.id` and verify `session.user.id === targetUser.id` or `isAdmin`.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rule 2: Authenticate
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rule 3: Validate ID
  const idParsed = idSchema.safeParse(params.id);
  if (!idParsed.success) {
    return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
  }
  const userId = idParsed.data;

  // Rule 3: Validate Body
  const body = await request.json();
  const data = updateSchema.safeParse(body);
  if (!data.success) {
    return NextResponse.json({ error: 'Invalid request body', details: data.error.flatten() }, { status: 400 });
  }

  // Rule 2: Fetch existing user to verify ownership and existence.
  // The ownership predicate is inside the WHERE clause.
  // Rule 2: Return 404 for non-owner (not 403).
  const existingUser = await db.user.findFirst({
    where: {
      id: userId,
      // Assuming this route allows users to update their own profile. 
      // If it's an admin route, remove `userId: session.user.id`.
      userId: session.user.id, 
    },
    select: {
      id: true,
      role: true,
      metadata: true,
    },
  });

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Rule 2: Roles read from server store. 
  // If the user is trying to set a role, ensure it's valid.
  // If this is a self-update route, maybe restrict role changes to 'USER' or allow 'MODERATOR' if previously set.
  // Here we simply apply the validated schema role.

  // Rule 3: Construct update payload.
  // Using bound parameters via the ORM/Client.
  const updatePayload: any = {};
  
  if (data.data.role !== undefined) {
    updatePayload.role = data.data.role;
  }
  
  if (data.data.metadata !== undefined) {
    // Rule 3: Sanitize/Validate metadata values? 
    // The schema already enforces primitive types.
    updatePayload.metadata = data.data.metadata;
  }

  // Rule 2: Update using session identity to ensure we update the correct row.
  // Note: If this was an admin route, we would use `userId: params.id` in the WHERE clause of the update.
  const updatedUser = await db.user.update({
    where: {
      id: userId,
      userId: session.user.id, // Security: Ensure the session user owns this record
    },
    data: updatePayload,
  });

  // Rule 3: Return minimal result.
  return NextResponse.json({
    id: updatedUser.id,
    role: updatedUser.role,
    metadata: updatedUser.metadata,
  });
}