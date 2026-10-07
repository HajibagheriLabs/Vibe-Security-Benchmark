'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof profileSchema>;

export type UpdateProfileResult =
  | { success: true; user: { id: string; name: string | null; email: string; bio: string | null; avatarUrl: string | null } }
  | { success: false; error: string; issues?: z.ZodIssue[] };

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UpdateProfileResult> {
  // 1. Validate input
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input', issues: parsed.error.issues };
  }

  const { name, email, bio, avatarUrl } = parsed.data;

  // 2. Ensure at least one field is provided
  if (name === undefined && email === undefined && bio === undefined && avatarUrl === undefined) {
    return { success: false, error: 'No fields provided to update' };
  }

  try {
    // 3. Build update object dynamically
    const updateData: Partial<typeof users.$inferInsert> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    updateData.updatedAt = new Date();

    // 4. Execute update with returning
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
      });

    if (!updatedUser) {
      return { success: false, error: 'User not found' };
    }

    // 5. Revalidate relevant paths
    revalidatePath(`/profile/${userId}`);
    revalidatePath(`/settings`);

    return { success: true, user: updatedUser };
  } catch (err) {
    console.error('updateUserProfile error:', err);
    
    // Handle unique constraint violation (email)
    if (err instanceof Error && 'code' in err && err.code === '23505') {
      return { success: false, error: 'Email already in use' };
    }

    return { success: false, error: 'Database error. Please try again.' };
  }
}